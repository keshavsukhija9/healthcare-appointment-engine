import { z } from 'zod';

export const postVisitNoteSchema = z.object({
  bookingId: z.uuid(),
  rawNotes: z.string().min(1).max(5000),
  medications: z.array(z.object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    schedule: z.object({
      frequency: z.string(),
      durationDays: z.number().int().positive(),
      times: z.array(z.string()),
    }),
  })).optional().default([]),
});

export type PostVisitNoteInput = z.infer<typeof postVisitNoteSchema>;
