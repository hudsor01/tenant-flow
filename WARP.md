# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

- Monorepo: Turborepo with workspaces under apps/* and packages/*
- Node/npm: Node >=22, npm >=10 (enforced via engines)
- Envs: Scripts use dotenv profiles (development, staging, production) and turbo tasks. Many tasks can be scoped to a single workspace via npm -w or turbo --filter.

Quick start
- Install: npm install
- Dev (all apps): npm run dev
- Dev (scope): npx turbo run dev --parallel --filter=@repo/backend or --filter=@repo/frontend
- Lint: npm run lint
- Lint (fix): npm run lint:fix
- Typecheck: npm run typecheck
- Format: npm run format, npm run format:check
- Build (top-level): npm run build
- Build (backend only): npm run build:backend or npx turbo run build --filter=@repo/backend
- Build (frontend only): npm run build:frontend or npx turbo run build --filter=@repo/frontend
- Storybook: npm run storybook (or npx turbo run storybook --filter=@repo/storybook)
- Quality pre-commit: npm run claude:check

Testing
- All tests monorepo: npm run test
- Coverage (all): npm run test:coverage
- Unit vs integration (monorepo): npm run test:unit, npm run test:integration, npm run test:e2e
- Scope to a package using npm workspaces:
  - Backend: npm run test -w @repo/backend
    - Unit: npm run test:unit -w @repo/backend
    - Integration: npm run test:integration -w @repo/backend
    - Coverage: npm run test:coverage -w @repo/backend
    - Watch a single package: npm run test:watch -w @repo/backend
    - Run a single test file: npm run test -w @repo/backend -- --runTestsByPath src/<path>/<spec>.spec.ts
  - Frontend: npm run test -w @repo/frontend
    - Unit: npm run test:unit -w @repo/frontend
    - Coverage: npm run test:coverage -w @repo/frontend
    - Watch: npm run test:unit:watch -w @repo/frontend
    - Single test file: npm run test -w @repo/frontend -- --runTestsByPath <relative path to test>
- Scope to a package using turbo filters (alternative): npx turbo run test --filter=@repo/backend

Environment profiles
- Dev (default): npm run dev (uses dotenv -c development)
- Staging dev: npm run dev:staging
- Production dev profile: npm run dev:production
- Build with env: npm run build:staging, npm run build:production
- Env validation helpers: npm run env:validate, env:validate:staging, env:validate:production

Docker (backend production-parity)
- Compose service: backend (port 3001 -> 3001)
- Run: docker compose up --build backend
- Health: GET http://localhost:3001/health
- Required envs (pass via .env or environment): DATABASE_URL, DIRECT_URL, JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, CORS_ORIGINS

Workspace commands reference
- Backend (@repo/backend)
  - Dev: npm run dev -w @repo/backend
  - Build: npm run build -w @repo/backend
  - Start (prod build): npm run start:prod -w @repo/backend
  - DB migrations passthrough: npm run migrate:deploy -w @repo/backend, npm run migrate:dev -w @repo/backend (executes in packages/database)
  - Lint/format/typecheck: npm run lint -w @repo/backend, npm run format -w @repo/backend, npm run typecheck -w @repo/backend
- Frontend (@repo/frontend)
  - Dev: npm run dev -w @repo/frontend (Next.js + Turbopack)
  - Build: npm run build -w @repo/frontend, Start: npm run start -w @repo/frontend
  - Lint/typecheck: npm run lint -w @repo/frontend, npm run typecheck -w @repo/frontend
  - E2E/a11y (package scripts): see package.json for test:e2e, test:a11y variants
- Shared packages (@repo/shared, @repo/database, @repo/emails, @repo/tailwind-config, @repo/typescript-config)
  - Typical: npm run build -w <pkg>, npm run typecheck -w <pkg>, npm run lint -w <pkg>

Architecture overview
- Apps
  - apps/frontend: Next.js 15 + React 19 UI hosted on Vercel. Uses Zustand/TanStack Query, Radix UI/Tailwind. By convention, the frontend uses a single API layer (no direct DB calls) and prefers Server Components by default.
  - apps/backend: NestJS 11 + Fastify API hosted on Railway. Integrates with Supabase (PostgreSQL + RLS), Stripe (subscriptions), Bull/BullMQ (queues), JWT auth, Swagger, and Prometheus metrics. Health endpoint at /health.
- Packages
  - packages/shared: Shared TypeScript types, constants, utils, validation (Zod). Built as CJS/ESM with explicit subpath exports.
  - packages/database: DB-access helpers targeting Supabase; built as a TS library and consumed by backend/frontend where applicable.
  - packages/emails: React-email templates and rendering helpers.
  - packages/tailwind-config: Shared Tailwind/PostCSS config and styles.
  - packages/typescript-config: Central TS configs (base/react/nestjs/library) consumed via "exports".
- Build system & task orchestration
  - Turborepo (turbo.json) orchestrates build, dev, lint, typecheck, test, storybook with caching. globalEnv includes NODE_ENV, CI, VERCEL, etc.; envMode is "loose". Outputs are configured for dist/.next/.turbo.
- Data & security flow
  - Frontend → Backend API → Supabase. Multi-tenant enforcement via RLS on org_id; JWT-based auth between layers. Stripe manages subscriptions via backend.
- Ops
  - Frontend deployed to Vercel, backend to Railway. Monitoring and Grafana assets exist under apps/backend/src/monitoring/grafana.

Repo-specific rules and notes (from CLAUDE.md and README highlights)
- Use Turbopack in frontend dev (npm run dev already configures this).
- Frontend must not access the database directly; go through the backend API.
- Backend CRUD should follow the BaseCrudService pattern where applicable.
- Multi-tenant RLS is assumed; ensure org scoping is preserved through the stack.
- Prefer Server Components in the frontend; keep client components minimal.
- Run npm run claude:check before committing (lint + typecheck shortcut).
- Recent cleanup removed duplicate UI layers and consolidated API access to a single layer with shared types.

Useful scripts (root)
- CI-oriented: ci:quick, ci:full, ci:changed, ci:validate, ci:cache:clear
- Storybook: storybook, storybook:build, storybook:test
- Visual tests: test:e2e:visual, test:visual:update, visual:baseline
- Supabase types update: npm run update-supabase-types

Scoping tips
- npm workspaces: append -w <workspaceName> (e.g., -w @repo/backend) to run a script in a single package.
- turbo filters: use --filter=@repo/<name> to limit a task (e.g., npx turbo run typecheck --filter=@repo/frontend).

Health checks
- Backend: GET /health (works in local dev, Docker, and Railway).
