# Deployment Notes

## General Strategy
The application should be deployed as three separate services to maintain scalability and security.
1. **Backend API**: Render, Heroku, or AWS EC2/ECS
2. **User Frontend**: Vercel or Netlify
3. **Admin Frontend**: Vercel or Netlify (ideally under a VPN or restricted IP access)

## 1. Database (Neon)
- **Production URL**: Ensure you use the **Pooled** connection string (`-pooler`) for the `DATABASE_URL` in Prisma configuration to handle high concurrency.
- Ensure `DIRECT_URL` uses the unpooled connection for migrations (`prisma db push` / `prisma migrate deploy`).

## 2. Backend API
1. Set `NODE_ENV=production`.
2. Secure CORS: In `backend/src/app.ts`, `allowedOrigins` must strictly match the production frontend URLs.
3. Build the TypeScript application: `npm run build`.
4. Run `npm start` (usually `node dist/server.js`).
5. Set `JWT_SECRET` and `JWT_REFRESH_SECRET` to strong, random 32+ character strings.

## 3. Frontend (User)
- Use standard Next.js deployment on Vercel.
- Configure Environment variables (`NEXT_PUBLIC_API_URL` -> point to your production Backend API).

## 4. Frontend (Admin)
- Similar to User Frontend, deploy on Vercel.
- For security, considering restricting deployment access via Vercel Edge Middleware or basic auth, as this portal contains PII and sensitive operations data.

## 5. Background Jobs (Redis)
- For BullMQ, provide a valid production `REDIS_URL`. We recommend **Upstash** for serverless Redis, or AWS ElastiCache.
- Deploy a separate worker process or run worker threads concurrently with the main backend (depending on load).
