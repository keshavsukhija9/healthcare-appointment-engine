import type { FastifyInstance } from 'fastify';
import { createBookingSchema } from '../schemas/booking.schema.js';
import { acquireSlot, SlotConflictError } from '../services/booking.service.js';

export async function bookingRoutes(app: FastifyInstance) {
  app.post('/api/bookings', async (request, reply) => {
    const parseResult = createBookingSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
    }

    try {
      const booking = await acquireSlot(parseResult.data);
      return reply.status(201).send(booking);
    } catch (err) {
      if (err instanceof SlotConflictError) {
        return reply.status(409).send({ error: err.message });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
