import { prisma } from '../lib/prisma.js';
import type { CreateBookingInput } from '../schemas/booking.schema.js';

const EXCLUSION_VIOLATION = '23P01';

function isExclusionViolation(err: any): boolean {
  return (
    err?.code === EXCLUSION_VIOLATION ||
    err?.meta?.code === EXCLUSION_VIOLATION ||
    err?.meta?.driverAdapterError?.cause?.code === EXCLUSION_VIOLATION ||
    err?.meta?.driverAdapterError?.cause?.originalCode === EXCLUSION_VIOLATION
  );
}
const HOLD_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export class SlotConflictError extends Error {
  constructor() {
    super('Slot is unavailable — already held or confirmed');
    this.name = 'SlotConflictError';
  }
}

/**
 * Correctness boundary: the Postgres GiST exclusion constraint
 * (no_overlapping_active_bookings) is the SOLE guarantee against
 * double-booking. Everything below is a liveness optimization to
 * reclaim expired holds and give the request a fair second chance.
 */
export async function acquireSlot(input: CreateBookingInput) {
  const { doctorId, patientId, startTime, endTime } = input;

  return prisma.$transaction(async (tx) => {
    // Step 1: SAVEPOINT before the risky insert
    await tx.$executeRawUnsafe('SAVEPOINT slot_insert_attempt');

    try {
      const booking = await tx.booking.create({
        data: {
          doctorId,
          patientId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: 'HELD',
          heldUntil: new Date(Date.now() + HOLD_DURATION_MS),
        },
      });
      return booking;
    } catch (err: any) {
      // Postgres exclusion constraint violation
      if (!isExclusionViolation(err)) {
        throw err;
      }

      // Step 2a: roll back to the savepoint to clear the aborted
      // transaction state so we can keep issuing queries
      await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT slot_insert_attempt');

      // Step 2b: reclaim expired HELD rows that overlap this range
      const reclaimed = await tx.$executeRawUnsafe(
        `UPDATE "Booking"
         SET status = 'EXPIRED'
         WHERE "doctorId" = $1
           AND tstzrange("startTime", "endTime", '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
           AND status = 'HELD'
           AND "heldUntil" < NOW()`,
        doctorId,
        startTime,
        endTime,
      );

      if (reclaimed === 0) {
        throw new SlotConflictError();
      }

      // Step 2c: retry the insert exactly once
      await tx.$executeRawUnsafe('SAVEPOINT slot_insert_retry');
      try {
        const booking = await tx.booking.create({
          data: {
            doctorId,
            patientId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            status: 'HELD',
            heldUntil: new Date(Date.now() + HOLD_DURATION_MS),
          },
        });
        return booking;
      } catch (retryErr: any) {
        if (!isExclusionViolation(retryErr)) {
          throw retryErr;
        }
        await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT slot_insert_retry');
        throw new SlotConflictError();
      }
    }
  });
}
