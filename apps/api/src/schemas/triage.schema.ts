import { z } from 'zod';

export const triageResultSchema = z.object({
  urgencyLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
  chiefComplaints: z.array(z.string()).min(1),
  suggestedQuestions: z.array(z.string()),
  source: z.enum(['LLM', 'FALLBACK']),
});

export type TriageResult = z.infer<typeof triageResultSchema>;
