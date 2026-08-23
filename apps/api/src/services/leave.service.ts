import { prisma } from '../lib/prisma.js';
import { randomUUID } from 'crypto';

interface LeaveRangeInput {
  doctorId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

/**
 * Read-only impact preview — no writes. Shows what would be
 * affected before the doctor commits to the leave.
 */
export async function previewLeaveImpact(input: LeaveRangeInput) {
  const { doctorId, startDate, endDate } = input;

  const affectedBookings = await prisma.booking.findMany({
    where: {
      doctorId,
      status: { in: ['HELD', 'CONFIRMED'] },
      startTime: { lt: new Date(endDate) },
      endTime: { gt: new Date(startDate) },
    },
    include: {
      patient: { include: { user: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  return {
    affectedCount: affectedBookings.length,
    bookings: affectedBookings.map((b) => ({
      id: b.id,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      patientName: b.patient.user.name,
    })),
  };
}

/**
 * Atomic multi-table transaction:
 * 1. Lock + cancel affected CONFIRMED/HELD bookings
 * 2. Insert outbox jobs for notification + calendar revocation
 * 3. Write an audit log entry
 * All committed as one transaction — either all succeed or none do.
 */
export async function executeLeaveRevocation(input: LeaveRangeInput, actorId?: string) {
  const { doctorId, startDate, endDate, reason } = input;

  return prisma.$transaction(async (tx) => {
    // Step 1: lock affected bookings
    const lockedIds = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "Booking"
       WHERE "doctorId" = $1
         AND status IN ('HELD', 'CONFIRMED')
         AND "startTime" < $2::timestamptz
         AND "endTime" > $3::timestamptz
       FOR UPDATE`,
      doctorId,
      endDate,
      startDate,
    );

    const bookingIds = lockedIds.map((row) => row.id);

    if (bookingIds.length === 0) {
      const leave = await tx.leave.create({
        data: { doctorId, startDate: new Date(startDate), endDate: new Date(endDate), reason },
      });
      return { leave, cancelledCount: 0 };
    }

    // Step 2: bulk cancel
    await tx.booking.updateMany({
      where: { id: { in: bookingIds } },
      data: { status: 'CANCELLED_DUE_TO_LEAVE' },
    });

    // Step 3: create the leave record
    const leave = await tx.leave.create({
      data: { doctorId, startDate: new Date(startDate), endDate: new Date(endDate), reason },
    });

    // Step 4: enqueue outbox jobs (one pair per affected booking)
    for (const bookingId of bookingIds) {
      await tx.job.create({
        data: {
          type: 'NOTIFY_CANCELLED_LEAVE',
          payload: { bookingId },
          idempotencyKey: `NOTIFY_CANCELLED_LEAVE:${bookingId}`,
        },
      });
      await tx.job.create({
        data: {
          type: 'REVOKE_CALENDAR_EVENT',
          payload: { bookingId },
          idempotencyKey: `REVOKE_CALENDAR_EVENT:${bookingId}`,
        },
      });
    }

    // Step 5: audit log
    await tx.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action: 'DOCTOR_LEAVE_REVOCATION',
        entityType: 'Leave',
        entityId: leave.id,
        metadata: { doctorId, startDate, endDate, cancelledBookingIds: bookingIds },
      },
    });

    return { leave, cancelledCount: bookingIds.length };
  });
}
