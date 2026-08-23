import { prisma } from '../lib/prisma.js';
import { randomUUID } from 'crypto';

const WORKER_ID = randomUUID();
const POLL_INTERVAL_MS = 2000;
const LEASE_TIMEOUT_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;

interface ClaimedJob {
  id: string;
  type: string;
  payload: any;
  attemptCount: number;
}

async function claimJobs(): Promise<ClaimedJob[]> {
  return prisma.$queryRawUnsafe<ClaimedJob[]>(
    `UPDATE "Job"
     SET status = 'PROCESSING', "lockedAt" = NOW(), "workerId" = $1, "attemptCount" = "attemptCount" + 1
     WHERE id IN (
       SELECT id FROM "Job"
       WHERE (status = 'PENDING' AND "runAfter" <= NOW())
          OR (status = 'PROCESSING' AND "lockedAt" < NOW() - INTERVAL '${LEASE_TIMEOUT_MINUTES} minutes')
       ORDER BY "runAfter" ASC
       FOR UPDATE SKIP LOCKED
       LIMIT ${BATCH_SIZE}
     )
     RETURNING id, type, payload, "attemptCount"`,
    WORKER_ID,
  );
}

async function markCompleted(jobId: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'COMPLETED' },
  });
}

async function markFailed(jobId: string, attemptCount: number, error: string) {
  if (attemptCount >= MAX_ATTEMPTS) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'DEAD_LETTER', lastError: error },
    });
  } else {
    // exponential backoff
    const backoffSeconds = Math.min(2 ** attemptCount, 300);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        lastError: error,
        runAfter: new Date(Date.now() + backoffSeconds * 1000),
      },
    });
  }
}

async function processJob(job: ClaimedJob) {
  const { handleJob } = await import('./job-handlers.js');
  try {
    await handleJob(job.type, job.payload);
    await markCompleted(job.id);
    console.log(`[worker] Completed job ${job.id} (${job.type})`);
  } catch (err: any) {
    const message = err?.message ?? String(err);
    await markFailed(job.id, job.attemptCount, message);
    console.error(`[worker] Failed job ${job.id} (${job.type}): ${message}`);
  }
}

async function pollLoop() {
  console.log(`[worker] Outbox worker ${WORKER_ID} starting, polling every ${POLL_INTERVAL_MS}ms`);
  while (true) {
    try {
      const jobs = await claimJobs();
      if (jobs.length > 0) {
        console.log(`[worker] Claimed ${jobs.length} job(s)`);
        await Promise.all(jobs.map(processJob));
      }
    } catch (err) {
      console.error('[worker] Poll loop error:', err);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

pollLoop();
