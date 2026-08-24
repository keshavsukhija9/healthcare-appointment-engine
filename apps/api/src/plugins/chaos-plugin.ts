import type { FastifyInstance } from 'fastify';
import { setChaosMode, type ChaosMode } from '../lib/chaos.js';

const VALID_MODES: ChaosMode[] = ['llm_timeout', 'calendar_500'];

export async function chaosPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (request) => {
    const header = request.headers['x-simulate-failure'];
    const mode = Array.isArray(header) ? header[0] : header;

    if (mode && VALID_MODES.includes(mode as ChaosMode)) {
      setChaosMode(mode as ChaosMode);
      request.log.warn(`[chaos] Simulating failure mode: ${mode}`);
    } else {
      setChaosMode(null);
    }
  });
}
