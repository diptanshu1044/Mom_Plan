# API Documentation

## Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT tokens
- `POST /api/auth/refresh` - Refresh JWT access token
- `POST /api/auth/logout` - Invalidate user session

## Eligibility Engine (`/api/eligibility`)
- `POST /api/eligibility/check` - Submit user household context to check program eligibility
- `GET /api/eligibility/results` - Fetch user's prior eligibility results

## Admin (`/api/admin`) - *Requires Admin Role*
- `GET /api/admin/users` - List users with pagination and filtering
- `GET /api/admin/analytics/overview` - Fetch high-level platform stats
- `GET /api/admin/analytics/users` - Timeseries data for users
- `GET /api/admin/applications` - List applications
- `PUT /api/admin/applications/:id` - Update application status

## Programs (`/api/programs`)
- `GET /api/programs` - List available government benefit programs
- `GET /api/programs/:id` - Get specific program details

## Documents (`/api/documents`)
- `POST /api/documents/upload` - Request an S3 presigned URL for secure document upload
- `GET /api/documents` - List user uploaded documents

## Stripe Billing (`/api/billing`)
- `POST /api/billing/create-checkout-session` - Initialize Stripe checkout
- `POST /api/billing/webhook` - Stripe webhooks (handles raw buffer)
