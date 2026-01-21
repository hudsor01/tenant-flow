# External Integrations

**Analysis Date:** 2026-01-15

## APIs & External Services

**Payment Processing:**
- Stripe - Subscription billing, one-time payments, Connect for property managers
  - SDK/Client: `stripe` npm package v18.0.0 (`apps/backend/package.json`)
  - Auth: API keys via `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` env vars
  - Endpoints used: Checkout sessions, customer portal, Connect accounts, webhooks
  - Config: `apps/backend/src/modules/billing/stripe-config.service.ts`

**Email/SMS:**
- Resend - Transactional emails (receipts, notifications, password resets)
  - SDK/Client: `@nestjs-modules/mailer` v2.0.2 with Resend transport
  - Auth: API key in `RESEND_API_KEY` env var
  - Templates: React Email templates in `apps/backend/src/modules/email/templates/`
  - Config: `apps/backend/src/modules/email/email.module.ts`

**Document Management:**
- Docuseal - Electronic document signing for leases
  - Integration: REST API via fetch
  - Auth: API key in `DOCUSEAL_API_KEY` env var
  - Usage: Lease generation and signing workflows

**PDF Generation:**
- Puppeteer - Server-side PDF rendering
  - SDK/Client: `puppeteer` v24.9.0
  - Usage: Invoice generation, lease documents
  - Config: `apps/backend/src/modules/documents/pdf.service.ts`

## Data Storage

**Databases:**
- PostgreSQL on Supabase - Primary data store
  - Connection: `DATABASE_URL`, `DIRECT_URL` env vars
  - Client: `@supabase/supabase-js` v2.50.0
  - Migrations: `supabase/migrations/` (82 SQL files)
  - RLS: Row Level Security policies for multi-tenant isolation

**File Storage:**
- Supabase Storage - User uploads (property images, documents)
  - SDK/Client: `@supabase/supabase-js` storage API
  - Auth: Service role key in `SUPABASE_SERVICE_ROLE_KEY`
  - Buckets: `property-images`, `documents`, `avatars`

**Caching:**
- Redis - Session storage, job queues
  - Connection: `REDIS_URL` env var
  - Client: `ioredis` v5.6.1
  - Usage: BullMQ job queues, rate limiting

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Email/password + OAuth
  - Implementation: `@supabase/ssr` v0.6.1 for server-side sessions
  - Token storage: httpOnly cookies via middleware
  - Session management: JWT refresh tokens handled by Supabase
  - Config: `apps/frontend/src/lib/supabase/server.ts`, `apps/frontend/src/lib/supabase/client.ts`

**OAuth Integrations:**
- Google OAuth - Social sign-in
  - Credentials: Configured in Supabase dashboard
  - Scopes: email, profile

## Monitoring & Observability

**Logging:**
- Winston - Structured logging
  - Config: `apps/backend/src/shared/logger/logger.service.ts`
  - Levels: debug, info, warn, error
  - Format: JSON structured logs

**Metrics:**
- Prometheus - Application metrics
  - Client: `prom-client` v15.1.3
  - Endpoint: `/metrics` on backend
  - Metrics: HTTP request duration, queue job counts, custom business metrics

**Error Tracking:**
- Not detected (consider adding Sentry)

## CI/CD & Deployment

**Hosting:**
- Frontend: Vercel
  - Deployment: Automatic on main branch push
  - Environment vars: Configured in Vercel dashboard
  - Port: 3050 (local dev)

- Backend: Railway
  - Deployment: Automatic on main branch push (not fully configured per health report)
  - Environment vars: Configured in Railway dashboard
  - Port: 4650

**CI Pipeline:**
- GitHub Actions - Tests and type checking
  - Workflows: `.github/workflows/` directory
  - Secrets: Stored in GitHub repo secrets

## Environment Configuration

**Development:**
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, `REDIS_URL`
- Secrets location: `.env.local` for local development (gitignored)
- Mock/stub services: Stripe test mode, local Supabase

**Staging:**
- Not detected (single environment setup)

**Production:**
- Secrets management: Vercel/Railway environment variables (native)
- Database: Supabase production project

## Webhooks & Callbacks

**Incoming:**
- Stripe - `/api/v1/billing/webhook`
  - Verification: Signature validation via `stripe.webhooks.constructEvent`
  - Events: `payment_intent.succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, Connect events
  - Handler: `apps/backend/src/modules/billing/stripe-webhook.controller.ts`

**Outgoing:**
- None detected

## Queue System

**Job Processing:**
- BullMQ - Background job processing
  - Client: `bullmq` v5.52.0
  - Backend: Redis
  - Queues: Email sending, document generation, payment processing
  - Config: `apps/backend/src/modules/queues/`

---

*Integration audit: 2026-01-15*
*Update when adding/removing external services*
