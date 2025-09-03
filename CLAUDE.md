# CLAUDE.md

Guidance for Claude Code working with this repository.

## 🚨 MANDATORY RULES - NO EXCEPTIONS 🚨

### CORE PRINCIPLES
- **DRY**: Search before writing (`rg -r "functionName"`). Consolidate code reused ≥2 places
- **KISS**: Choose simplest solution. Delete code instead of adding when possible
- **NO ABSTRACTIONS**: Use native platform features directly. No wrappers, factories, or custom layers
- **PRODUCTION MINDSET**: Security first, platform-native, performance-conscious, reliability-focused

### BACKEND RULES (75% code reduction achieved)
**FORBIDDEN**: Custom DTOs, validation decorators, service layers, repositories, middleware, interceptors, wrappers, helper classes, factories, builders, custom error handlers

**ONLY USE**: Built-in NestJS pipes (ParseUUIDPipe, DefaultValuePipe, ParseIntPipe), Native exceptions (BadRequestException, NotFoundException), Direct PostgreSQL RPC via Supabase, JSON Schema definitions

Protected files: `apps/backend/ULTRA_NATIVE_ARCHITECTURE.md`

### UI/UX RULES
- Reuse existing pages/layouts/components first
- Use shadcn components vs creating custom
- Flat component organization in existing folders
- Central Zustand store instead of component state (except temporary UI states)
- Direct store access via hooks - no prop drilling
- Sync Tailwind and Magic UI themes for primary color
- Use shadcn charts for charting needs

### NATIVE PLATFORM REPLACEMENTS
- **Auth**: Supabase Auth | **Storage**: Supabase Storage | **Real-time**: Supabase Realtime
- **Jobs**: BullMQ/Vercel Cron | **Email**: Resend API | **Validation**: Zod schemas
- **Data**: TanStack Query | **Forms**: React Hook Form | **State**: Zustand
- **Styles**: Tailwind classes | **Components**: Radix/ShadCN | **Dates**: date-fns
- **HTTP**: Native fetch

### UI COMPONENT PATTERNS
- **Buttons**: Radix Button + Tailwind | **Forms**: Radix Form + React Hook Form
- **Modals**: Radix Dialog | **Dropdowns**: Radix Select | **Tooltips**: Radix Tooltip
- **Loading**: Radix Progress | **Layouts**: CSS Grid + Tailwind
- **Animations**: Tailwind transitions + Framer Motion | **Themes**: CSS variables
- **Responsive**: Tailwind prefixes | **Focus**: Radix utilities | **Keyboard**: Radix handlers

### BEFORE EVERY CHANGE
1. Does this exist? (Search first!)
2. Can I use native platform feature?
3. Can I delete code instead?
4. Is this the simplest solution?
5. Will another developer understand immediately?
6. Does this follow accessibility standards?
7. Is this predictable and consistent?

## Tech Stack

**Frontend (Vercel)**
- Next.js 15.5.0 + React 19.1.1 (Turbopack required)
- Radix UI + TailwindCSS 4.1.12 + ShadCN
- TanStack Query 5.85.5, Zustand 5.0.8, React Hook Form 7.62.0
- Framer Motion 12.23.12, Lucide Icons 0.540.0, Recharts 3.1.2

**Backend (Railway)**
- NestJS 11.1.6 + Fastify 11.x
- Supabase 2.56.0, Stripe 18.4.0, Resend 6.0.1
- In-memory cache + Database query cache
- Health: `/health/ping`

**Shared**
- Node.js 22.x (Railway: 24.x Docker), npm 11.5.2, Turborepo 2.5.6
- TypeScript 5.9.2 strict, Zod 4.0.17

## Commands

**Dev**: `npm run dev` | **Clean**: `npm run dev:clean`
**Quality**: `npm run claude:check` | `npm run lint` | `npm run typecheck` | `npm run test:unit`
**Build**: `npm run build` | `build:frontend` | `build:backend`
**Test**: `test:integration` | `test:e2e` | `test:production`
**Database**: `npm run update-supabase-types`
**Secrets**: `secrets:generate` | `secrets:check` | `secrets:export`

## Architecture

**State Management**
- Zustand: Global UI state, session, notifications, theme
- TanStack Query: Server state, caching, optimistic updates
- React Hook Form: Form state (no abstractions)
- URL State: Navigation, filters via Next.js router

**Frontend Structure**
- `components/`: Pure UI (Radix + ShadCN)
- `hooks/api/`: TanStack Query hooks
- `lib/`: Utilities, API clients, validation
- `stores/`: Zustand global state
- `providers/`: React context providers

**Backend Structure**
- `shared/`: Guards, decorators, filters, types
- `auth/`, `billing/`, `properties/`, `tenants/`, `maintenance/`, `dashboard/`: Domain modules

**Data Flow**
- Read: Component → TanStack Query → API → Backend → Supabase
- Write: Component → Server Action → Backend → Supabase → Webhook → Cache Update
- Real-time: Supabase Realtime → Frontend → Cache invalidation

## Monorepo

- `apps/`: frontend, backend, storybook
- `packages/`: shared (build first), emails, tailwind-config, typescript-config

Build dependencies: shared → frontend/backend

## Deployment

**Frontend (Vercel)**: https://tenantflow.app - Auto-deploys from main
**Backend (Railway)**: Dockerfile, startCommand = `node apps/backend/dist/main.js`

## Critical Files

- `apps/frontend/src/stores/app-store.ts`: Main Zustand store
- `apps/frontend/src/lib/api-client.ts`: Core API client
- `apps/frontend/src/lib/query-keys.ts`: TanStack Query cache keys
- `apps/backend/src/shared/`: Backend utilities
- `packages/shared/src/types/`: Shared TypeScript types

## Session Notes

**File**: `CLAUDE_SESSION_NOTES.md` in project root
**Update**: After EVERY meaningful action, discovery, or decision
**Include**: Current context, recent changes, discoveries, TODOs

## Success Metrics

Your success = Production-ready code with zero duplication
Every line must justify its existence
When in doubt, delete it