import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { previewLeaveImpact, executeLeaveRevocation } from '../services/leave.service.js';

const leaveRangeSchema = z.object({
  doctorId: z.uuid(),
  startDate: z.iso.datetime({ offset: true }),
  endDate: z.iso.datetime({ offset: true }),
  reason: z.string().optional(),
});

export async function leaveRoutes(app: FastifyInstance) {
  app.get('/api/admin/leaves/preview', async (request, reply) => {
    const parsed = leaveRangeSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    const preview = await previewLeaveImpact(parsed.data);
    return reply.status(200).send(preview);
  });

  app.post('/api/admin/leaves', async (request, reply) => {
    const parsed = leaveRangeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    try {
      const result = await executeLeaveRevocation(parsed.data);
      return reply.status(201).send(result);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
