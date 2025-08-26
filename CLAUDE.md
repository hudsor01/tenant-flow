# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**REMEMBER: Every line of code is a liability. Less code = fewer bugs = easier maintenance.**

## 🚨 CRITICAL: MANDATORY DEVELOPMENT RULES 🚨

**YOU MUST FOLLOW THESE RULES WITHOUT EXCEPTION. THESE OVERRIDE ALL OTHER PATTERNS.**

### 🛑 ULTRA-NATIVE BACKEND - DO NOT TOUCH 🛑

**THE BACKEND HAS BEEN AGGRESSIVELY REWRITTEN USING ULTRA-NATIVE PATTERNS:**

- **75% code reduction achieved** (4,554 → 1,150 lines)
- **5-10x faster validation** using Fastify JSON Schema
- **Zero custom abstractions** - only native platform features

**❌ NEVER ADD THESE TO BACKEND FILES:**
- Custom validation decorators or DTOs
- Service orchestration layers or repositories  
- Custom middleware or interceptors
- Wrapper functions or helper classes
- Factory patterns or builders
- Custom error handlers or formatters

**✅ ONLY USE THESE IN BACKEND:**
- Built-in NestJS pipes: `ParseUUIDPipe`, `DefaultValuePipe`, `ParseIntPipe`
- Native exceptions: `BadRequestException`, `NotFoundException`
- Direct PostgreSQL RPC calls via Supabase
- JSON Schema definitions (no class-validator)

**📋 PROTECTED FILES:** See `apps/backend/ULTRA_NATIVE_ARCHITECTURE.md` for complete list.

**IF YOU ADD ABSTRACTIONS TO THE BACKEND, YOUR CHANGES WILL BE REJECTED.**

### YOUR PRIMARY DIRECTIVE
**Your success is measured by how much code is production ready and is confirmed not duplicated in the workspace.**
- Every new line must justify its existence
- When in doubt, delete it

### RULE #1: DRY (Don't Repeat Yourself)
- **NEVER** duplicate logic or configuration across services
- **ALWAYS** search first: `rg -r "functionName"` before writing anything
- **CONSOLIDATE** shared code into platform-native solutions only
- **IF** you find duplication, consolidate it immediately
- **TOOLS TO USE**: `rg` (ripgrep), `fd` for finding duplicates, 'fzf' for fuzzy searches

### RULE #2: KISS (Keep It Simple, Stupid)
- **ALWAYS** choose the simplest, most maintainable solution
- **NEVER** add unnecessary abstraction or complexity or duplication
- **DELETE** code instead of adding when possible
- **QUESTION** every new file, function, assumption or pattern - is it truly needed?

### RULE #3: NO ABSTRACTIONS - USE NATIVE FEATURES ONLY
- **FORBIDDEN**: Creating wrappers, factories, or custom layers
- **FORBIDDEN**: Building abstractions on top of libraries
- **REQUIRED**: Direct usage of native platform features
- **REQUIRED**: Remove ALL custom abstractions when found

### STRICT MANDATE FOR ALL CHANGES:
1. **SEARCH FIRST** - Use `rg`, or `fd` before writing ANY code
2. **DELETE FIRST** - Can you remove code to solve the problem?
3. **NATIVE ONLY** - Use Supabase/Vercel/Railway/Typescript/Eslint/Next.js/React features directly
4. **NO MIDDLE LAYERS** - Direct library usage, no wrappers
5. **MEASURE SUCCESS** - Count deleted lines vs added lines

### PRODUCTION MINDSET:
Act as if this is a **REAL-WORLD PRODUCTION SYSTEM**:
- **Security First**: Every change must consider security implications
- **Maintainability**: Code must be maintainable by any developer
- **Platform-Native**: Align with Supabase, Vercel, and Railway best practices
- **Performance**: Consider bundle size, query efficiency, and render performance
- **Reliability**: Changes must not break existing functionality

### PLATFORM FEATURES TO USE INSTEAD OF CUSTOM CODE:

| If you need... | USE THIS | NOT THIS |
|----------------|----------|----------|
| Authentication | Supabase Auth | Custom JWT implementation |
| File Storage | Supabase Storage | Custom file handling |
| Real-time updates | Supabase Realtime | WebSockets/polling |
| Background jobs | BullMQ/Vercel Cron | Custom schedulers |
| Email sending | Resend API | Custom SMTP |
| API validation | Zod schemas | Custom validators |
| Data fetching | TanStack Query | Custom fetch wrappers |
| Form handling | React Hook Form | Custom form state |
| Global state | Zustand | Context + reducers |
| CSS styling | Tailwind classes | Custom CSS files |
| UI components | Radix/ShadCN | Custom components |
| Date formatting | date-fns | Custom formatters |
| HTTP client | Native fetch | Axios or wrappers |

### BEFORE EVERY CODE CHANGE, ASK:
1. Does this already exist elsewhere? (Search first!)
2. Can I use a native platform feature instead?
3. Can I delete code instead of adding?
4. Is this the simplest possible solution?
5. Will another developer understand this immediately?

**IF YOU VIOLATE THESE RULES, YOUR CODE WILL BE REJECTED.**

## TenantFlow Development Guide

### Tech Stack (Authoritative)

**Frontend (Vercel)**
- Next.js 15.5.0 + React 19.1.1 (Turbopack required)
- Radix UI + TailwindCSS 4.1.12 + ShadCN components
- TanStack Query 5.85.5 (data fetching & caching)
- Zustand 5.0.8 (global state management - replaced Jotai for performance)
- React Hook Form 7.62.0 (form handling, no abstractions)
- Framer Motion 12.23.12, Lucide Icons 0.540.0, Recharts 3.1.2
- React Error Boundary 6.0.0 (error handling)

**Backend (Railway)**
- NestJS 11.1.6 + Fastify 11.x (native Fastify features only)
- Supabase 2.56.0 (DB, RLS, Storage, Realtime, Migrations, Full-text Search, Policies)
- Stripe 18.4.0 (billing + subscriptions)
- Resend 6.0.1 (email)
- BullMQ 5.58.0 (job queues)
- Cache: Supabase Query Cache / Vercel Edge Cache
- Monitoring: Vercel Analytics + Railway Logs + PostHog
- Auth: JWT + Supabase Auth + RLS policies

**Shared**
- Node.js 22+ / npm 11.5.2 (packageManager specified)
- Turborepo 2.5.6 (monorepo management)
- TypeScript 5.9.2 strict mode (separate configs for React, NestJS, Node libs)
- Zod 4.0.17 (runtime validation)

### Commands

```bash
# Development
npm run dev              # Turbopack dev server (all apps)
npm run dev:clean        # Clean dev with cache clear

# Quality Gates
npm run claude:check     # Lint + type + test (must pass before commit)
npm run lint             # ESLint with auto-fix
npm run typecheck        # TypeScript compilation check
npm run test:unit        # Unit tests only

# Build & Deploy
npm run build            # Build all packages
npm run build:frontend   # Build only frontend
npm run build:backend    # Build only backend
npm run build:shared     # Build shared package first
turbo build --filter=@repo/shared  # Rebuild shared types
```

---

### Key Architecture Patterns

#### 1. State Management Architecture (Post-Jotai Migration)
- **Zustand Store** (`stores/app-store.ts`): Global UI state, session, notifications, theme
  - Features: DevTools, Persistence, Subscriptions, Computed Values, Optimistic Updates
  - Replaced Jotai atoms for better performance and simpler patterns
- **TanStack Query**: Server state, caching, optimistic updates
- **React Hook Form**: Form state management (no abstractions)
- **URL State**: Navigation, filters, pagination via Next.js router

#### 2. Frontend Architecture Layers
```
components/     # Pure UI components (Radix + ShadCN)
hooks/          # Business logic hooks (use-tenants.ts, use-properties.ts)
  api/          # TanStack Query hooks for data fetching
lib/            # Utilities, API clients, validation
  actions/      # Server actions for mutations
  api/          # Direct API client functions
stores/         # Zustand global state (replaced atoms/)
types/          # TypeScript interfaces
providers/      # React context providers
```

#### 4. Backend Architecture (NestJS)
```
src/
├── shared/           # Guards, decorators, filters, types
├── auth/             # JWT auth, Supabase integration
├── billing/          # Stripe integration, webhooks
├── properties/       # Property CRUD + business logic
├── tenants/          # Tenant management
├── maintenance/      # Maintenance requests
└── dashboard/        # Dashboard aggregations
```

#### 5. Data Flow Architecture
1. **Read**: Component → TanStack Query Hook → API Client → Backend → Supabase
2. **Write**: Component → Server Action → Backend → Supabase → Webhook → Frontend Cache Update
3. **Real-time**: Supabase Realtime → Frontend subscription → Cache invalidation

### Monorepo Structure

```
apps/
  frontend/        # Next.js 15 + React 19 app
  backend/         # NestJS + Fastify API
  storybook/       # Component documentation
packages/
  shared/          # Shared types, constants, validation
  emails/          # Email templates
  database/        # Supabase migrations (deprecated - use direct SQL)
  tailwind-config/ # Shared Tailwind configuration
  typescript-config/ # Shared TypeScript configs
```

**Build Dependencies:**
- `shared` package must build first (contains all types)
- Frontend depends on: `shared`, `database` 
- Backend depends on: `shared`, `database`
- Use `turbo build --filter=@repo/shared` to rebuild types

### Testing Strategy

- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: API endpoints with real Supabase
- **E2E Tests**: Playwright for critical user flows
- **Production Tests**: Verify deployment readiness

```bash
npm run test:unit         # Fast unit tests
npm run test:integration  # API integration tests  
npm run test:e2e          # Playwright E2E tests
npm run test:production   # Production readiness
```

### Authentication & Security

- **Supabase Auth**: JWT tokens, RLS policies, OAuth providers
- **CSRF Protection**: Server-side validation, secure cookies
- **Multi-tenant RLS**: Row-level security by org_id
- **Security Headers**: CSP, HSTS, etc. via Fastify plugins
- **File Uploads**: Secured via Supabase Storage with RLS

### Performance Architecture

- **Turbopack**: Required for React 19 compatibility
- **Server Components**: Default for static content
- **TanStack Query**: Aggressive caching, background updates
- **Vercel Edge**: CDN, ISR for static content
- **Zustand**: Minimal re-renders, selective subscriptions
- **Bundle Splitting**: Automatic via Next.js

### Logging Architecture

- **Current**: NestJS Logger (uses console methods, simple and working)
- **Available**: Pino (comes FREE with Fastify, 5x faster, JSON output)
- **Decision**: Use NestJS Logger by default (KISS principle)
- **When to use Pino**: Only if you need:
  - JSON logs for production parsing
  - Request ID tracking (automatic with Pino)
  - High-frequency logging performance
  - PII redaction features
- **How to access Pino**: `request.log` in controllers (it's already there!)
- **Note**: We removed winston/nest-winston - they were unused dependencies

### Database Architecture

- **Supabase PostgreSQL**: Primary database with RLS
- **Real-time Subscriptions**: Live updates for collaborative features
- **Migrations**: Direct SQL files in `supabase/migrations/`
- **Generated Types**: `npm run update-supabase-types`

### Deployment

- **Frontend**: Vercel (automatic from main branch)
- **Backend**: Railway (automatic deployment)
- **Environment Variables**: Managed via platform dashboards and direnv (.envrc)
- **Health Checks**: `/api/health` endpoint for monitoring

#### Architecture Debt (MUST FIX)
- **DUPLICATE CODE**: API patterns need consolidation
- **DEPRECATED**: auth-api.ts should be deleted
- **ABSTRACTIONS**: Remove any remaining factory patterns
- **TEST DEBT**: React 19 compatibility needed

### Development Workflow

1. **Start Development**: `npm run dev` (starts all apps)
2. **Make Changes**: Edit code, types auto-update
3. **Quality Check**: `npm run claude:check` (must pass)
4. **Build Test**: `npm run build` (verify production readiness)
5. **Deploy**: Push to main branch (auto-deploys)

### Important Files & Patterns

#### Key Configuration Files
- `turbo.json` - Monorepo task orchestration
- `vercel.json` - Frontend deployment config
- `railway.toml`, `Dockerfile` - Backend deployment config
- `tsconfig.json` files - TypeScript configs (base, frontend, backend)
- `eslint.config.js` - Shared ESLint rules

#### Critical Code Locations
- `apps/frontend/src/stores/app-store.ts` - Main Zustand store
- `apps/frontend/src/lib/api-client.ts` - Core API client
- `apps/frontend/src/lib/supabase/client.ts` - Supabase client setup
- `apps/frontend/src/lib/query-keys.ts` - TanStack Query cache keys
- `apps/backend/src/shared/` - Shared backend utilities, guards, decorators
- `packages/shared/src/types/` - Shared TypeScript types

#### Data Flow Patterns
- **Read**: Component → `useQuery` hook → API client → Backend → Supabase
- **Write**: Component → Server action/mutation → Backend → Supabase
- **Optimistic Updates**: Via TanStack Query's `onMutate` callbacks
- **Real-time**: Supabase subscriptions → Cache invalidation

### 📝 SESSION NOTES - MANDATORY CONTEXT TRACKING

**CRITICAL: You MUST maintain a session notes file for EVERY project/directory you work in.**

#### Naming Convention:
- **File name**: `CLAUDE_SESSION_NOTES.md`
- **Location**: Root of each project or service directory
- **Purpose**: Long-term context memory across sessions

#### Required Updates (UPDATE VERY FREQUENTLY):
1. **On Session Start**: Read the file FIRST before any work
2. **Every Major Decision**: Document why and what
3. **Every Problem Solved**: Record solution and reasoning  
4. **Every Error Encountered**: Log error and fix
5. **Before Session End**: Summarize progress and next steps

#### File Structure:
```markdown
# Claude Session Notes - [Project Name]

## Current Context
- Last worked: [timestamp]
- Current task: [what you're doing]
- Blockers: [any issues]

## Recent Changes
- [timestamp]: [what changed and why]
- [timestamp]: [problem → solution]

## Important Discoveries
- [Key learning or pattern found]
- [Critical file locations]
- [Dependencies or gotchas]

## TODO/Next Steps
- [ ] [Immediate next action]
- [ ] [Future improvements]

## Project-Specific Context
- [Any unique requirements]
- [Special configurations]
- [Team preferences discovered]
```

**UPDATE FREQUENCY**: After EVERY meaningful action, discovery, or decision. Treat it like a pilot's flight log - everything important gets recorded.

### 🎯 QUICK DECISION TREE FOR EVERY TASK

```
START HERE
    ↓
Did you read CLAUDE_SESSION_NOTES.md?
    NO → READ IT NOW
    YES ↓

Is this fixing a bug?
    YES → Can I DELETE code to fix it?
        YES → Delete it → UPDATE SESSION NOTES
        NO → Use simplest native solution → UPDATE SESSION NOTES
    NO ↓
    
Is this adding a feature?
    YES → Does similar code exist?
        YES → Reuse/consolidate it → UPDATE SESSION NOTES
        NO → Use native platform features directly → UPDATE SESSION NOTES
    NO ↓

Is this refactoring?
    YES → Your ONLY job is to DELETE code
        - Remove abstractions
        - Consolidate duplicates  
        - Simplify complexity
        → UPDATE SESSION NOTES
    NO ↓

STOP - Why are you making changes?
```