# Developer Setup Guide

## Prerequisites
- Node.js (v18+)
- npm or yarn or pnpm
- Git
- Neon Database account
- Stripe account
- AWS S3 bucket (or local mock for uploads)
- Redis server (local or Upstash)

## Step 1: Clone the Repository
```bash
git clone <repo-url>
cd Client
```

## Step 2: Install Dependencies
The project contains three main folders:
```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Install admin frontend dependencies
cd ../frontend_admin && npm install
```

## Step 3: Environment Configuration
Copy `.env.example` to `.env` in each respective folder.

### Backend (`backend/.env`)
Set up your Neon database URL. E.g.:
```
DATABASE_URL=postgresql://user:password@endpoint-pooler.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require&connection_limit=20&connect_timeout=60&pool_timeout=60
DIRECT_URL=postgresql://user:password@endpoint.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```
Add your Stripe keys, AWS credentials, JWT secrets, and Redis URL.

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Admin Frontend (`frontend_admin/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Step 4: Database Setup (Prisma & Neon)
Inside `backend/`:
```bash
npx prisma generate
npx prisma db push
```

## Step 5: Start Development Servers
You need to run all three services concurrently or in separate terminal windows.

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend User):
```bash
cd frontend
npm run dev
```

Terminal 3 (Admin Portal):
```bash
cd frontend_admin
npm run dev
```
