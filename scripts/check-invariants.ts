/**
 * Verifies the fundamental correctness invariant directly against
 * the database: no two active (HELD/CONFIRMED) bookings for the
 * same doctor may have overlapping time ranges.
 */
import { prisma } from '../apps/api/src/lib/prisma.js';

async function main() {
  const overlaps = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`
    SELECT COUNT(*) as count
    FROM "Booking" b1
    JOIN "Booking" b2
      ON b1."doctorId" = b2."doctorId"
      AND b1.id < b2.id
      AND b1.status IN ('HELD', 'CONFIRMED')
      AND b2.status IN ('HELD', 'CONFIRMED')
      AND tstzrange(b1."startTime", b1."endTime", '[)') && tstzrange(b2."startTime", b2."endTime", '[)')
  `);

  const overlapCount = Number(overlaps[0].count);

  console.log(`Active overlapping booking pairs: ${overlapCount}`);

  if (overlapCount === 0) {
    console.log('✅ PASS: zero overlapping active bookings.');
  } else {
    console.error('❌ FAIL: overlapping active bookings detected — correctness violation.');
    process.exit(1);
  }

  await prisma.$disconnect();
}

main();
