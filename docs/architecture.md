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

## Document and PDF Architecture
- **Upload Flow**: Uses `multer` in-memory buffering for secure validation of MIME types and size constraints (10MB limit) before forwarding to local storage (`/uploads/documents/`) or AWS S3.
- **PDF Generation & Viewing**: Implements a secure streaming architecture (`/api/documents/:id/download`) utilizing Node.js streams to pipe document buffers directly to the browser. This ensures that users can securely preview PDFs and images directly in the browser or download them seamlessly without relying on exposed S3 URLs.

## Real-Time Government Data Integration
Located in `backend/src/modules/integration/`.
- **Integration Layer**: A generic `GovApiIntegrationService` manages outbound API requests to external government sources (e.g., USDA, HUD, HHS, IRS).
- **Extensible Providers**: Employs an interface-based architecture (`GovApiProvider`) allowing individual state and federal services to plug into the normalization layer.
- **Resiliency & Caching**: Incorporates built-in retry mechanisms using Axios interceptors and an in-memory caching system to gracefully handle rate-limiting and minimize redundant requests to external APIs.

## Automation and Processing Architecture
Located in `backend/src/modules/automation/`.
- **Asynchronous Processing**: Designed to integrate with message queues and background workers for handling potentially long-running processes independently of the main API event loop.
- **Email Composition System**: A centralized `AutomationService` templates and securely attaches uploaded documents to outgoing government communications, specifically targeting relevant agency contacts based on the user's location and program.
- **External Contact Ingestion**: Features a structured scraping and ingestion strategy that securely compiles government agency contacts (from state and federal websites) into a centralized, searchable database. Built-in validation and duplicate prevention ensure high data integrity.
- **Workflow Hooks**: Provides modular hooks (e.g., `onApplicationStatusChange`) that decouple application state transitions from notification and automation triggers, ensuring robust future scalability.
