import { prisma } from '../src/lib/prisma.ts';

async function main() {
  const doctorUser = await prisma.user.upsert({
    where: { email: 'dr.sharma@clinic.test' },
    update: {},
    create: {
      email: 'dr.sharma@clinic.test',
      name: 'Dr. Anjali Sharma',
      role: 'DOCTOR',
      doctorProfile: {
        create: {
          specialization: 'General Medicine',
          workingHours: { mon: ['09:00-17:00'], tue: ['09:00-17:00'], wed: ['09:00-17:00'], thu: ['09:00-17:00'], fri: ['09:00-17:00'] },
          slotDurationMinutes: 30,
        },
      },
    },
    include: { doctorProfile: true },
  });

  const patientUser = await prisma.user.upsert({
    where: { email: 'patient.test@example.test' },
    update: {},
    create: {
      email: 'patient.test@example.test',
      name: 'Test Patient',
      role: 'PATIENT',
      patientProfile: {
        create: {},
      },
    },
    include: { patientProfile: true },
  });

  console.log('Seeded doctor:', doctorUser.id, doctorUser.doctorProfile?.id);
  console.log('Seeded patient:', patientUser.id, patientUser.patientProfile?.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
