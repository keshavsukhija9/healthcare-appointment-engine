import { prisma } from '../lib/prisma.js';

/**
 * Job type dispatcher. Each handler is idempotent — safe to
 * re-run on retry without duplicating side effects.
 */
export async function handleJob(type: string, payload: any): Promise<void> {
  switch (type) {
    case 'NOTIFY_CANCELLED_LEAVE':
      return notifyCancelledLeave(payload);
    case 'REVOKE_CALENDAR_EVENT':
      return revokeCalendarEvent(payload);
    case 'NOTIFY_POST_VISIT_SUMMARY':
      return notifyPostVisitSummary(payload);
    case 'MEDICATION_REMINDER':
      return sendMedicationReminder(payload);
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}

async function notifyCancelledLeave(payload: { bookingId: string }) {
  const booking = await prisma.booking.findUnique({
    where: { id: payload.bookingId },
    include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
  });

  if (!booking) {
    console.warn(`[job] Booking ${payload.bookingId} not found, skipping notification`);
    return;
  }

  // Simulated chaos injection hook (wired to real header in the route layer later)
  if (process.env.SIMULATE_CALENDAR_500 === 'true') {
    throw new Error('Simulated email dispatch failure');
  }

  console.log(
    `[job] Would email ${booking.patient.user.email}: your appointment with ` +
    `${booking.doctor.user.name} on ${booking.startTime.toISOString()} was cancelled due to doctor leave.`,
  );
  // Real implementation: Nodemailer/SendGrid dispatch goes here.
}

async function revokeCalendarEvent(payload: { bookingId: string }) {
  const booking = await prisma.booking.findUnique({ where: { id: payload.bookingId } });

  if (!booking) {
    console.warn(`[job] Booking ${payload.bookingId} not found, skipping calendar revocation`);
    return;
  }

  if (!booking.googleCalendarEventId) {
    console.log(`[job] Booking ${payload.bookingId} has no calendar event, nothing to revoke`);
    return;
  }

  if (process.env.SIMULATE_CALENDAR_500 === 'true') {
    throw new Error('Simulated Google Calendar API 500');
  }

  // Idempotency: check googleCalendarEventId before calling the API.
  // Real implementation: call Google Calendar API DELETE with OAuth2 token,
  // then clear googleCalendarEventId on the booking.
  console.log(`[job] Would revoke Google Calendar event ${booking.googleCalendarEventId}`);

  await prisma.booking.update({
    where: { id: booking.id },
    data: { googleCalendarEventId: null },
  });
}

async function sendMedicationReminder(payload: { medicationId: string; scheduledAt: string }) {
  console.log(`[job] Would send medication reminder for ${payload.medicationId} at ${payload.scheduledAt}`);
  // Real implementation: Nodemailer/SendGrid + push notification dispatch.
}

async function notifyPostVisitSummary(payload: { bookingId: string }) {
  const booking = await prisma.booking.findUnique({
    where: { id: payload.bookingId },
    include: { patient: { include: { user: true } } },
  });

  if (!booking) {
    console.warn(`[job] Booking ${payload.bookingId} not found, skipping post-visit notification`);
    return;
  }

  console.log(`[job] Would email post-visit summary to ${booking.patient.user.email}`);
}
