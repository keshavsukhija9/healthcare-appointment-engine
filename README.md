# Healthcare Appointment Engine

A high-performance, concurrency-safe healthcare booking engine and clinical workflow backend. Built with Fastify, TypeScript, PostgreSQL, and Prisma ORM, this platform guarantees zero double-bookings under heavy concurrent load, reliable outbox event processing, and fault-tolerant clinical intake pipelines.

---

## Architectural Highlights

* Atomic Concurrency Control: Enforces slot reservation invariants at the database level using PostgreSQL native GiST exclusion constraints (tstzrange interval checks).
* Savepoint & Lock Isolation: Leverages explicit $transaction savepoint boundaries (SAVEPOINT slot_booking) to prevent transaction poisoning during conflict checks.
* Transactional Outbox Worker: Ensures at-least-once delivery for medication reminders and notification delivery via an asynchronous background polling loop with exponential backoff and dead-letter queuing (DLQ).
* Fault-Tolerant LLM Intake Engine: Implements a circuit-breaker pattern for patient symptom processing, gracefully degrading to deterministic keyword and regex extraction during third-party API downtime.
* Idempotent Medication Scheduling: Enforces structured idempotency keys (MEDICATION_REMINDER:<id>:<time>) to prevent duplicated notification jobs under retry scenarios.

---

## System Architecture

                                  +-------------------+
                                  |   Fastify API     |
                                  |   (Node.js/TS)    |
                                  +---------+---------+
                                            |
                         +------------------+------------------+
                         |                                     |
              +----------v----------+               +----------v----------+
              |   PostgreSQL 16     |               |  Background Outbox  |
              | (GiST Constraints)  |               |  Worker Loop (Job)  |
              +---------------------+               +----------+----------+
                                                               |
                                                    +----------v----------+
                                                    | LLM Circuit Breaker |
                                                    | (Intake / Fallback) |
                                                    +---------------------+

---

## Technology Stack

* Runtime: Node.js (ESM Module System)
* Language: TypeScript
* Framework: Fastify
* Database: PostgreSQL 16
* ORM: Prisma
* Validation: Zod
* Task Management: Monorepo with pnpm workspace pipeline

---

## Technical Features

### Phase P0: Core Concurrency & Scheduling Engine
1. Atomic Booking: Prevents overlapping time window allocation per practitioner via PostgreSQL GiST exclusion checks.
2. Leave Revocation Engine: Automatically identifies and cancels affected appointment slots when practitioner leave is declared within a unified transaction.
3. Stress-Tested Reliability: Verified against 500+ parallel concurrent booking requests across intersecting time ranges to confirm invariant safety.

### Phase P1: Clinical Intelligence & Infrastructure
1. Clinical Intake Pipeline: Ingests patient symptoms and maps structural findings to PreVisitSummary records.
2. Post-Visit Workflow: Atomically generates PostVisitNote, PostVisitSummary, and corresponding Medication rows.
3. Transactional Outbox Engine: Decouples notification delivery from HTTP request-response lifecycles, guaranteeing durable background job execution.

### Phase P2: Multi-Tenant Enterprise Capabilities (Planned)
1. Multi-Tenant Isolation: Tenant-scoped queries enforced at the ORM layer (tenantId indexing).
2. Calendar Integration: Asynchronous OAuth integration for calendar synchronization across external platforms.
3. Audit Compliance: Append-only event trails tracking access and edits to clinical assets.

---

## Getting Started

### Prerequisites

* Node.js >= 20.0.0
* pnpm >= 9.0.0
* Docker & Docker Compose (for local PostgreSQL instance)

### Environment Configuration

Create a .env file in apps/api/:

DATABASE_URL="postgresql://user:password@localhost:5432/healthcare_db?schema=public"
PORT=3000
HOST="0.0.0.0"
LOG_LEVEL="info"

### Installation and Setup

1. Install dependencies:
   pnpm install

2. Provision database environment:
   docker compose up -d

3. Execute database migrations:
   pnpm --filter api exec prisma migrate dev

4. Start development server:
   pnpm --filter api dev

---

## Verification & Testing

Typecheck the TypeScript project workspace:
pnpm --filter api exec tsc --noEmit

Run seed scripts and concurrency validation:
pnpm --filter api exec tsx prisma/seed.ts

---

## API Endpoints Overview

Method | Endpoint                 | Description
-------|--------------------------|-------------------------------------------------------
GET    | /api/health              | Service health check
POST   | /api/bookings            | Create an appointment booking
POST   | /api/leaves              | Register practitioner leave window
POST   | /api/clinical/intake     | Process patient symptom intake
POST   | /api/clinical/post-visit | Record post-visit documentation and queue reminders

---

## License

MIT License. See LICENSE for further details.
