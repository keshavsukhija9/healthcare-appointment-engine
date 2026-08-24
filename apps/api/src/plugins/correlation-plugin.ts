import type { FastifyInstance } from 'fastify';

export async function correlationPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info({ requestId: request.id, statusCode: reply.statusCode }, 'request completed');
  });
}
