import { z } from 'zod';

export const symptomIntakeSchema = z.object({
  bookingId: z.uuid(),
  symptomText: z.string().min(3).max(2000),
});

export type SymptomIntakeInput = z.infer<typeof symptomIntakeSchema>;
