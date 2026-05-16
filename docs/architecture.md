# MomPlan AI Benefits Platform - Architecture Overview

## Overview
MomPlan is a multi-tenant SaaS platform built to help families discover benefits, check eligibility, track applications, and manage renewals. It also provides a robust admin portal for government and non-profit counselors to review applications and manage users.

## Technology Stack
- **Frontend (User & Admin)**: Next.js 14, React, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: Neon (Serverless PostgreSQL)
- **UI Design**: StitchMCP
- **Background Jobs**: BullMQ + Redis
- **Cloud Storage**: AWS S3 (for Document Uploads)
- **Payments**: Stripe

## System Components

### 1. The Core API (Backend)
Located in `backend/`, this Express server acts as the central hub.
- Modular monolithic architecture with a `src/modules/*` structure.
- Communicates with the Neon database via Prisma.

### 2. The Rules Engine
Located in `backend/src/modules/eligibility/rules.engine.ts`.
- Uses a dynamically extensible confidence-score based mechanism.
- Evaluates user household data against program metadata criteria.

### 3. The Admin Portal
Located in `frontend_admin/`.
- Deployed separately from the main user portal.
- Connected to the core API but authenticated via specific Admin/Counselor roles.

### 4. Background Workers
Located in `backend/src/jobs/`.
- Processes scheduled tasks (reminders, subscription syncs, cache invalidations).

## External Integrations
- **Neon**: Primary PostgreSQL database providing connection pooling and edge-ready data access.
- **StitchMCP**: For managing, updating, and generating UI screens dynamically.
- **Stripe**: Manages subscriptions (free, family, navigator).
- **AWS S3**: Secure document uploads with presigned URLs.
