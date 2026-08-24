import { llmCircuitBreaker } from '../lib/circuit-breaker.js';
import { runFallbackTriage } from './triage-fallback.js';
import { triageResultSchema, type TriageResult } from '../schemas/triage.schema.js';
import { isChaosActive } from '../lib/chaos.js';

const LLM_TIMEOUT_MS = 3500;

const TRIAGE_PROMPT = `You are a clinical intake assistant. Given a patient's symptom description, respond ONLY with JSON matching this exact shape, no other text:
{
  "urgencyLevel": "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY",
  "chiefComplaints": string[],
  "suggestedQuestions": string[]
}
This is decision support only, NOT a medical diagnosis. Be conservative — when uncertain, err toward a higher urgency level.`;

async function callOpenAI(symptomText: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: TRIAGE_PROMPT },
          { role: 'user', content: symptomText },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty LLM response');

    return JSON.parse(content);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Execution flow:
 * OpenAI Request -> 3.5s AbortController -> Process-Local Circuit Breaker
 * -> Zod Schema Validation -> Persistence
 *
 * Falls back to conservative keyword parser when the breaker is OPEN,
 * chaos mode forces a timeout, or the LLM response fails validation.
 */
export async function runTriage(symptomText: string): Promise<TriageResult> {
  if (isChaosActive('llm_timeout')) {
    console.log('[chaos] Forcing simulated LLM timeout');
    llmCircuitBreaker.recordFailure();
    return runFallbackTriage(symptomText);
  }

  if (llmCircuitBreaker.isOpen()) {
    console.log('[triage] Circuit breaker OPEN, using fallback');
    return runFallbackTriage(symptomText);
  }

  try {
    const rawResult = await callOpenAI(symptomText);
    const validated = triageResultSchema.safeParse({ ...(rawResult as object), source: 'LLM' });

    if (!validated.success) {
      console.warn('[triage] LLM response failed schema validation, using fallback', validated.error.issues);
      llmCircuitBreaker.recordFailure();
      return runFallbackTriage(symptomText);
    }

    llmCircuitBreaker.recordSuccess();
    return validated.data;
  } catch (err: any) {
    console.error('[triage] LLM call failed:', err?.message ?? err);
    llmCircuitBreaker.recordFailure();
    return runFallbackTriage(symptomText);
  }
}
