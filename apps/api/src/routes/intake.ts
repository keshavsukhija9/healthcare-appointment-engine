import type { FastifyInstance } from 'fastify';
import { symptomIntakeSchema } from '../schemas/intake.schema.js';
import { runTriage } from '../services/triage.service.js';
import { prisma } from '../lib/prisma.js';

export async function intakeRoutes(app: FastifyInstance) {
  app.post('/api/intake/symptoms', async (request, reply) => {
    const parsed = symptomIntakeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { bookingId, symptomText } = parsed.data;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return reply.status(404).send({ error: 'Booking not found' });
    }

    try {
      const symptomForm = await prisma.symptomForm.upsert({
        where: { bookingId },
        update: { symptomText },
        create: { bookingId, symptomText },
      });

      const triageResult = await runTriage(symptomText);

      const preVisitSummary = await prisma.preVisitSummary.upsert({
        where: { symptomFormId: symptomForm.id },
        update: {
          urgencyLevel: triageResult.urgencyLevel,
          chiefComplaints: triageResult.chiefComplaints,
          suggestedQuestions: triageResult.suggestedQuestions,
          source: triageResult.source,
        },
        create: {
          symptomFormId: symptomForm.id,
          urgencyLevel: triageResult.urgencyLevel,
          chiefComplaints: triageResult.chiefComplaints,
          suggestedQuestions: triageResult.suggestedQuestions,
          source: triageResult.source,
        },
      });

      return reply.status(201).send({ symptomForm, preVisitSummary });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
