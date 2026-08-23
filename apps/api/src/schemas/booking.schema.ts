import { z } from 'zod';

export const createBookingSchema = z.object({
  doctorId: z.uuid(),
  patientId: z.uuid(),
  startTime: z.iso.datetime({ offset: true }),
  endTime: z.iso.datetime({ offset: true }),
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  error: 'endTime must be after startTime',
  path: ['endTime'],
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
