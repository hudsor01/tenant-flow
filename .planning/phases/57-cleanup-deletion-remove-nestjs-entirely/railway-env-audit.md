# Railway Env Var Audit Trail
Date: 2026-02-23

## Known Railway/Backend env vars (from codebase research)

### GitHub Secrets (remove from repo Settings > Secrets > Actions)
- RAILWAY_TOKEN — used in deploy-backend.yml (now deleted)

### Vercel Project Env Vars (remove from Vercel Dashboard)
- NEXT_PUBLIC_API_BASE_URL — removed from env.ts in Plan 03
- NEXT_PUBLIC_USE_POSTGREST — removed from env.ts in Plan 03
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — removed from env.ts in Plan 03

### Railway Service Env Vars
See Railway dashboard before deletion for full list.
Common vars included: DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY,
SENDGRID_API_KEY, JWT_SECRET, PORT, NODE_ENV, RAILWAY_ENVIRONMENT
