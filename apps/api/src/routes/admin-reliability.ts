import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { llmCircuitBreaker } from '../lib/circuit-breaker.js';

export async function adminReliabilityRoutes(app: FastifyInstance) {
  app.get('/api/admin/reliability', async (request, reply) => {
    const [pending, processing, completed, deadLetter] = await Promise.all([
      prisma.job.count({ where: { status: 'PENDING' } }),
      prisma.job.count({ where: { status: 'PROCESSING' } }),
      prisma.job.count({ where: { status: 'COMPLETED' } }),
      prisma.job.count({ where: { status: 'DEAD_LETTER' } }),
    ]);

    const recentJobs = await prisma.job.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        status: true,
        attemptCount: true,
        lastError: true,
        updatedAt: true,
      },
    });

    return reply.status(200).send({
      circuitBreaker: {
        state: llmCircuitBreaker.getState(),
      },
      outboxQueue: {
        pending,
        processing,
        completed,
        deadLetter,
      },
      recentJobs,
    });
  });
}
