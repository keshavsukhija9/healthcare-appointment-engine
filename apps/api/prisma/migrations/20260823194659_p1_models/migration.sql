-- CreateTable
CREATE TABLE "SymptomForm" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "symptomText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SymptomForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreVisitSummary" (
    "id" TEXT NOT NULL,
    "symptomFormId" TEXT NOT NULL,
    "urgencyLevel" TEXT NOT NULL,
    "chiefComplaints" JSONB NOT NULL,
    "suggestedQuestions" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreVisitSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostVisitNote" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "rawNotes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostVisitNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostVisitSummary" (
    "id" TEXT NOT NULL,
    "postVisitNoteId" TEXT NOT NULL,
    "patientSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostVisitSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "schedule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthToken" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SymptomForm_bookingId_key" ON "SymptomForm"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "PreVisitSummary_symptomFormId_key" ON "PreVisitSummary"("symptomFormId");

-- CreateIndex
CREATE UNIQUE INDEX "PostVisitNote_bookingId_key" ON "PostVisitNote"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "PostVisitSummary_postVisitNoteId_key" ON "PostVisitSummary"("postVisitNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthToken_doctorId_provider_key" ON "OAuthToken"("doctorId", "provider");

-- AddForeignKey
ALTER TABLE "PreVisitSummary" ADD CONSTRAINT "PreVisitSummary_symptomFormId_fkey" FOREIGN KEY ("symptomFormId") REFERENCES "SymptomForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVisitSummary" ADD CONSTRAINT "PostVisitSummary_postVisitNoteId_fkey" FOREIGN KEY ("postVisitNoteId") REFERENCES "PostVisitNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
