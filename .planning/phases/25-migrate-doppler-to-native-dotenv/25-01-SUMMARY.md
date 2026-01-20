# Summary: 25-01 Migrate from Doppler to Native dotenv

## Completed: 2026-01-20

## Objective Achieved

Removed Doppler CLI dependency entirely. Environment variables now load automatically via native dotenv without any CLI wrapper.

## Changes Made

### Core Integration

1. **Backend Entry Point** (`apps/backend/src/main.ts`)
   - Added `import 'dotenv/config'` as first import (before Sentry)
   - Environment variables load automatically at startup

2. **Frontend** - No changes needed
   - Next.js natively loads `.env*` files
   - @t3-oss/env-nextjs provides Zod validation

3. **E2E Tests** (`apps/e2e-tests/playwright.config.ts`)
   - Already uses dotenv natively
   - Updated comments to remove Doppler references

### Package.json Scripts Cleaned

| Package | Scripts Updated |
|---------|-----------------|
| `apps/backend` | dev, start, start:dev, start:prod, test:integration, stripe:* |
| `apps/frontend` | dev, build:local, analyze, start:local |
| `apps/e2e-tests` | test:chromium, test:mobile, test:performance, test:accessibility, test:contracts, test:stripe |
| Root | All scripts already clean |

### New Files Created

- `apps/backend/.env.example` - Template with all required variables
- `apps/frontend/.env.example` - Updated with local Supabase defaults

### Documentation Updated

- `.planning/codebase/INTEGRATIONS.md` - Updated secrets management description
- `.planning/codebase/STACK.md` - Updated environment configuration
- `.planning/ROADMAP.md` - Marked Phase 25 complete
- `.planning/STATE.md` - Updated project state

### Other Cleanups

- `Dockerfile` - Removed `DOPPLER_DISABLED=1` env var
- `.husky/pre-commit` - Updated error message
- `.gitignore` - Fixed to allow .env.example files
- `docs/VERIFIED_MIGRATION_SCOPE.md` - Updated reference
- Various test file comments updated

## How It Works Now

```
┌─────────────────────────────────────────────────────────────┐
│                    Environment Loading                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Backend (NestJS):                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ main.ts                                              │   │
│  │   import 'dotenv/config'  ← Loads .env.local/.env    │   │
│  │   import './instrument'                              │   │
│  │   ...                                                │   │
│  │                                                      │   │
│  │ ConfigModule.forRoot()                               │   │
│  │   validate: Zod schema   ← Type-safe validation      │   │
│  │   envFilePath: ['.env.local', '.env']                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Frontend (Next.js):                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Next.js native .env loading                          │   │
│  │   .env.local → .env → .env.production                │   │
│  │                                                      │   │
│  │ @t3-oss/env-nextjs                                   │   │
│  │   createEnv({ server: {}, client: {} })              │   │
│  │   Zod validation at build time                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  E2E Tests (Playwright):                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ playwright.config.ts                                 │   │
│  │   import dotenv from 'dotenv'                        │   │
│  │   dotenv.config({ path: '.env.test', override: true })│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Verification

```bash
# Verify no doppler run references in package.json files
grep -r "doppler run" **/package.json
# Result: No matches

# Verify dotenv loads
node -e "require('dotenv/config'); console.log('OK')"
# Result: OK

# Verify typecheck passes
pnpm typecheck
# Result: Clean
```

## User Action Required

To start using the new setup:

```bash
# Option 1: Export from Doppler (one-time)
doppler secrets download --no-file --format env > apps/backend/.env.local
doppler secrets download --no-file --format env > apps/frontend/.env.local

# Option 2: Copy templates and fill in values
cp apps/backend/.env.example apps/backend/.env.local
cp apps/frontend/.env.example apps/frontend/.env.local
# Edit .env.local files with actual secrets

# Then run normally
pnpm dev
```

## Benefits

1. **No CLI wrapper needed** - `pnpm dev` just works
2. **Faster startup** - No Doppler CLI overhead
3. **Simpler debugging** - env vars visible in process.env
4. **CI/CD native** - Railway/Vercel set env vars directly
5. **Type safety preserved** - Zod validation unchanged

## Files Modified

- `apps/backend/src/main.ts`
- `apps/backend/package.json`
- `apps/backend/.env.example` (new)
- `apps/backend/test/setup.ts`
- `apps/backend/test/performance/lease-creation.perf.spec.ts`
- `apps/frontend/package.json`
- `apps/frontend/.env.example` (updated)
- `apps/e2e-tests/package.json`
- `apps/e2e-tests/playwright.config.ts`
- `Dockerfile`
- `.husky/pre-commit`
- `.gitignore`
- `docs/VERIFIED_MIGRATION_SCOPE.md`
- `.planning/codebase/INTEGRATIONS.md`
- `.planning/codebase/STACK.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`

## Duration

~15 minutes execution time
