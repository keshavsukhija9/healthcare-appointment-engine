import type { TriageResult } from '../schemas/triage.schema.js';

/**
 * Conservative keyword-based fallback for decision support.
 * Strictly not a medical diagnosis — used only when the LLM
 * circuit breaker is OPEN or the LLM response fails schema validation.
 */
const EMERGENCY_KEYWORDS = ['chest pain', 'can\'t breathe', 'cannot breathe', 'severe bleeding', 'unconscious', 'stroke', 'suicidal'];
const HIGH_KEYWORDS = ['high fever', 'severe pain', 'vomiting blood', 'difficulty breathing'];
const MEDIUM_KEYWORDS = ['fever', 'persistent cough', 'moderate pain', 'dizziness'];

export function runFallbackTriage(symptomText: string): TriageResult {
  const lower = symptomText.toLowerCase();

  let urgencyLevel: TriageResult['urgencyLevel'] = 'LOW';

  if (EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw))) {
    urgencyLevel = 'EMERGENCY';
  } else if (HIGH_KEYWORDS.some((kw) => lower.includes(kw))) {
    urgencyLevel = 'HIGH';
  } else if (MEDIUM_KEYWORDS.some((kw) => lower.includes(kw))) {
    urgencyLevel = 'MEDIUM';
  }

  return {
    urgencyLevel,
    chiefComplaints: [symptomText.slice(0, 200)],
    suggestedQuestions: [
      'When did the symptoms start?',
      'Have you experienced this before?',
      'Are you currently taking any medication?',
    ],
    source: 'FALLBACK',
  };
}
