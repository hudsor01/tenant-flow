# Canonical Types Consolidation Design

**Date**: 2026-02-20
**Status**: Approved

## Problem

425 locally-defined types in frontend components and 129 in backend source files exist despite CLAUDE.md mandating that all types live in `packages/shared/src/types/`. Agents create duplicates because the canonical types are hard to discover. This causes type drift, inconsistency, and bugs.

## Ground Truth

**Supabase `supabase.ts` is the absolute source of truth.** It is auto-generated from the production database schema. Every domain type in the codebase must either derive from it, extend it, or be purely UI-local.

## Type Hierarchy

```
supabase.ts  ←  generated from prod DB (never edit manually)
     │
     ▼
core.ts / domain.ts / api-contracts.ts / financial-statements.ts / ...
     │     derive from Tables<'x'> or compose supabase types
     ▼
Component-local types  ←  Props, internal UI state ONLY. Never exported to shared.
```

## Three Categories of Types

| Category | Rule | Location |
|---|---|---|
| DB row types | Use `Tables<'tablename'>` directly | `supabase.ts` (generated) |
| Domain types | Derived/extended from supabase types, or cross-cutting | `packages/shared/src/types/*.ts` |
| UI types | Props, internal component state, render helpers | Component-local, never in shared |

## Shared Type File Ownership

| File | Owns |
|---|---|
| `supabase.ts` | All DB row/insert/update types — auto-generated, never edit |
| `core.ts` | String literal unions matching DB CHECK constraints (`LeaseStatus`, `PaymentStatus`, etc.) + thin row aliases |
| `domain.ts` | Cross-domain business objects spanning multiple tables |
| `api-contracts.ts` | Request/response shapes for backend API endpoints |
| `financial-statements.ts` | Balance sheet, income statement, cash flow shapes |
| `analytics.ts` | Dashboard KPI and analytics shapes |
| `relations.ts` | Joined/nested types (property with units, lease with tenant, etc.) |
| `stripe.ts` | Stripe-specific types not in DB |
| `database-rpc.ts` | RPC function return types |
| `query-results.ts` | Paginated and filtered query result shapes |

## Consolidation Plan

### Phase 1 — Consolidate (parallel agents by domain)

Five agents run simultaneously:

**Agent 1 — properties**
- Scope: `apps/frontend/src/components/properties/`, `apps/frontend/src/app/(owner)/properties/`
- Action: Find all local types → classify → move domain types to `domain.ts` or delete if exact `Tables<>` alias exists

**Agent 2 — financials**
- Scope: `apps/frontend/src/components/financials/`, `apps/frontend/src/app/(owner)/financials/`
- Action: `BalanceItem`, `MonthlyData`, `PropertyPL`, `CashFlowCategory` etc. → move to `financial-statements.ts`

**Agent 3 — payments + tenants**
- Scope: `apps/frontend/src/components/payments/`, `apps/frontend/src/components/tenants/`, related app routes
- Action: Duplicate `Payment`, `PaymentStatus`, `PaymentHistoryItem`, tenant types → delete local, point to shared

**Agent 4 — maintenance + leases**
- Scope: `apps/frontend/src/components/maintenance/`, `apps/frontend/src/components/leases/`, related app routes
- Action: Local types → move to `domain.ts` or point to `Tables<>`

**Agent 5 — backend**
- Scope: `apps/backend/src/modules/`
- Action: 129 local types → most are DTOs (keep), non-DTO domain types → move to shared

Each agent follows this decision tree for every local type found:
1. Is it covered 1:1 by `Tables<'tablename'>`? → Delete local definition, import from `@repo/shared/types/supabase`
2. Does it add computed/joined fields to a DB type? → Move to appropriate shared file, extend `Tables<>`
3. Is it UI-only (Props, render state, component-internal)? → Leave it local
4. Is it cross-cutting business logic? → Move to `domain.ts`

### Phase 2 — Document

One agent writes `packages/shared/src/types/TYPES.md` — a flat lookup table of every exported type, what file it's in, and what DB table it maps to (if any).

Update `CLAUDE.md` Type System Rules section with:
> Before defining any type, check in order: `supabase.ts` → `core.ts` → `domain.ts` → `api-contracts.ts`. Consult `TYPES.md` for the full lookup table.

Update Serena memory `database-schema` with a pointer to `TYPES.md`.

## Success Criteria

- Zero duplicate domain type definitions across the codebase
- Every domain type in frontend/backend traces back to `supabase.ts` or a shared file
- `TYPES.md` exists and is accurate
- `pnpm typecheck` passes clean
- CLAUDE.md and Serena memory updated with the canonical lookup rule
