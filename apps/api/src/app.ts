import Fastify from 'fastify';
import { bookingRoutes } from './routes/bookings.js';
import { leaveRoutes } from './routes/leaves.js';
import { intakeRoutes } from './routes/intake.js';
import { postVisitRoutes } from './routes/post-visit.js';

export function buildApp() {
  const app = Fastify({
    logger: true,
    genReqId: () => crypto.randomUUID(),
  });

  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  app.register(bookingRoutes);
  app.register(leaveRoutes);
  app.register(intakeRoutes);
  app.register(postVisitRoutes);

  return app;
}
