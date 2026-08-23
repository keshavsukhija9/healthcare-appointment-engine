/**
 * Fires N concurrent POST requests at a single doctor slot to prove
 * the GiST exclusion constraint is the sole correctness boundary.
 * Expected: exactly 1 success (201), N-1 conflicts (409), 0 DB overlaps.
 */

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const CONCURRENCY = Number(process.env.STRESS_CONCURRENCY ?? 500);
const DOCTOR_ID = process.env.STRESS_DOCTOR_ID;
const PATIENT_ID = process.env.STRESS_PATIENT_ID;

if (!DOCTOR_ID || !PATIENT_ID) {
  console.error('Set STRESS_DOCTOR_ID and STRESS_PATIENT_ID env vars before running.');
  process.exit(1);
}

const startTime = '2027-01-01T09:00:00Z';
const endTime = '2027-01-01T09:30:00Z';

async function fireRequest(): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId: DOCTOR_ID, patientId: PATIENT_ID, startTime, endTime }),
    });
    return res.status;
  } catch {
    return 0; // network/connection failure
  }
}

async function main() {
  console.log(`Firing ${CONCURRENCY} concurrent requests at ${API_URL}/api/bookings ...`);

  const start = Date.now();
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => fireRequest()),
  );
  const durationMs = Date.now() - start;

  const counts: Record<number, number> = {};
  for (const status of results) {
    counts[status] = (counts[status] ?? 0) + 1;
  }

  console.log('\n--- Stress Test Results ---');
  console.log(`Total requests: ${CONCURRENCY}`);
  console.log(`Duration: ${durationMs}ms`);
  console.log('Status distribution:', counts);

  const successCount = counts[201] ?? 0;
  const conflictCount = counts[409] ?? 0;

  console.log(`\nSuccessful (201): ${successCount}`);
  console.log(`Conflicts (409): ${conflictCount}`);

  if (successCount === 1) {
    console.log('✅ PASS: exactly one booking succeeded.');
  } else {
    console.error(`❌ FAIL: expected exactly 1 success, got ${successCount}.`);
    process.exit(1);
  }
}

main();
