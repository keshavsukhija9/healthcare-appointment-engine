import type { FastifyInstance } from 'fastify';
import { postVisitNoteSchema } from '../schemas/consultation.schema.js';
import { prisma } from '../lib/prisma.js';

export async function consultationRoutes(app: FastifyInstance) {
  app.post('/api/consultations', async (request, reply) => {
    const parsed = postVisitNoteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { bookingId, rawNotes, medications } = parsed.data;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return reply.status(404).send({ error: 'Booking not found' });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const postVisitNote = await tx.postVisitNote.upsert({
          where: { bookingId },
          update: { rawNotes },
          create: { bookingId, rawNotes },
        });

        const patientSummary = `Visit summary: ${rawNotes.slice(0, 300)}${rawNotes.length > 300 ? '...' : ''}`;

        const postVisitSummary = await tx.postVisitSummary.upsert({
          where: { postVisitNoteId: postVisitNote.id },
          update: { patientSummary },
          create: { postVisitNoteId: postVisitNote.id, patientSummary },
        });

        const createdMedications = [];
        for (const med of medications) {
          const medication = await tx.medication.create({
            data: {
              bookingId,
              name: med.name,
              dosage: med.dosage,
              schedule: med.schedule,
            },
          });
          createdMedications.push(medication);

          for (const time of med.schedule.times) {
            await tx.job.create({
              data: {
                type: 'MEDICATION_REMINDER',
                payload: { medicationId: medication.id, scheduledAt: time },
                idempotencyKey: `MEDICATION_REMINDER:${medication.id}:${time}`,
              },
            });
          }
        }

        await tx.job.create({
          data: {
            type: 'NOTIFY_POST_VISIT_SUMMARY',
            payload: { bookingId },
            idempotencyKey: `NOTIFY_POST_VISIT_SUMMARY:${bookingId}`,
          },
        });

        return { postVisitNote, postVisitSummary, medications: createdMedications };
      });

      return reply.status(201).send(result);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
