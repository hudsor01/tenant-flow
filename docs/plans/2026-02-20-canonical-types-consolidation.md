# Canonical Types Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all duplicate domain type definitions across the frontend and backend by making `packages/shared/src/types/supabase.ts` (auto-generated from prod DB) the single source of truth for all domain types.

**Architecture:** Five parallel domain agents audit and consolidate local types (properties, financials, payments/tenants, maintenance/leases, backend). Each type is classified: exact DB row → use `Tables<'tablename'>` alias; DB type + computed fields → move to appropriate shared file; UI-only Props/state → keep local. A final documentation pass creates a lookup table and updates CLAUDE.md and Serena memory.

**Tech Stack:** TypeScript 5.9, `packages/shared/src/types/supabase.ts` (Supabase generated types), `packages/shared/src/types/core.ts` / `domain.ts` / `financial-statements.ts` / `relations.ts` / `api-contracts.ts`, pnpm workspaces, TanStack Query

---

## Shared Context (read before any task)

### Type Classification Rules

For every locally-defined `interface Foo` or `type Foo` found:

| Condition | Action |
|---|---|
| Matches a DB table row exactly | Delete local def. Use `Tables<'tablename'>` from `@repo/shared/types/supabase` |
| Adds computed/joined fields to a DB type | Move to appropriate shared file. Type as `Tables<'x'> & { extraField: T }` |
| Component Props interface | Keep local (never move to shared) |
| Internal UI state (selected tab, modal open, etc.) | Keep local |
| Cross-domain business object (used in 2+ files) | Move to `domain.ts` |
| Financial statement shape | Move to `financial-statements.ts` |
| RPC return shape | Move to `database-rpc.ts` |

### Shared Type Files Reference

- `packages/shared/src/types/supabase.ts` — auto-generated, never edit
- `packages/shared/src/types/core.ts` — string literal unions matching DB CHECK constraints, thin row aliases
- `packages/shared/src/types/domain.ts` — cross-domain business objects
- `packages/shared/src/types/relations.ts` — joined/nested types (property with units, lease with tenant)
- `packages/shared/src/types/financial-statements.ts` — balance sheet, income statement, cash flow shapes
- `packages/shared/src/types/analytics.ts` — dashboard KPI and analytics shapes
- `packages/shared/src/types/api-contracts.ts` — API request/response shapes
- `packages/shared/src/types/database-rpc.ts` — RPC function return types

### Import Pattern (canonical)

```typescript
// ✅ DB row types
import type { Tables } from '@repo/shared/types/supabase'
type Property = Tables<'properties'>

// ✅ Domain types
import type { PropertyWithUnits } from '@repo/shared/types/relations'

// ✅ Status unions
import type { LeaseStatus, PaymentStatus } from '@repo/shared/types/core'
```

### Type Check Command

```bash
pnpm --filter @repo/frontend exec tsc --noEmit
pnpm --filter @repo/backend exec tsc --noEmit
```

### Audit Command (use to find local types in a directory)

```bash
grep -rn "^interface \|^type [A-Z]" apps/frontend/src/components/DOMAIN --include="*.ts" --include="*.tsx" | grep -v "Props\b\|Props<\|Props ="
```

---

## Task 1: Properties Domain Consolidation

**Files to touch:**
- Audit: `apps/frontend/src/components/properties/` and `apps/frontend/src/app/(owner)/properties/`
- May modify: `packages/shared/src/types/domain.ts`, `packages/shared/src/types/relations.ts`

### Step 1: Audit local types in properties domain

Run:
```bash
grep -rn "^interface \|^export interface \|^type [A-Z]\|^export type [A-Z]" \
  apps/frontend/src/components/properties/ \
  apps/frontend/src/app/\(owner\)/properties/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "Props\b\|Props<\|Props ="
```

List every type found with its file location.

### Step 2: Compare each type against supabase.ts

Run:
```bash
grep -n "properties\|units\|property_images" packages/shared/src/types/supabase.ts | head -30
```

Check what `Tables<'properties'>` and `Tables<'units'>` already provide. Also check `packages/shared/src/types/core.ts` for existing property-related types.

### Step 3: Check what's already in domain.ts / relations.ts

```bash
cat packages/shared/src/types/domain.ts
cat packages/shared/src/types/relations.ts
```

### Step 4: Classify and act on each local type

For each type found in Step 1, apply the classification rules from Shared Context above.

**Common patterns to expect:**
- Local `interface Property { id: string; name: string; ... }` → Use `Tables<'properties'>` from supabase
- Local `type PropertyStatus = 'active' | 'inactive'` → Already in `core.ts` as `PropertyStatus`, delete local
- Local `interface PropertyWithUnits { property: ...; units: ... }` → Move to `relations.ts`
- `PropertyFormValues` → Keep local (form state)
- `PropertyTableRow` → Keep local (UI-only)

### Step 5: Update imports in all affected files

For every file where you deleted or moved a type, update the import to:
```typescript
import type { Tables } from '@repo/shared/types/supabase'
// or
import type { PropertyWithUnits } from '@repo/shared/types/relations'
```

### Step 6: Typecheck

```bash
pnpm --filter @repo/frontend exec tsc --noEmit 2>&1 | grep "error TS"
```

Fix any errors before proceeding.

### Step 7: Run frontend unit tests

```bash
pnpm --filter @repo/frontend test:unit -- --run "properties"
```

### Step 8: Commit

```bash
git add packages/shared/src/types/ apps/frontend/src/components/properties/ apps/frontend/src/app/\(owner\)/properties/
git commit -m "refactor(types): consolidate properties domain types to shared"
```

---

## Task 2: Financials Domain Consolidation

**Files to touch:**
- Audit: `apps/frontend/src/components/financials/` and `apps/frontend/src/app/(owner)/financials/`
- May modify: `packages/shared/src/types/financial-statements.ts`

### Step 1: Audit local types in financials domain

```bash
grep -rn "^interface \|^export interface \|^type [A-Z]\|^export type [A-Z]" \
  apps/frontend/src/components/financials/ \
  "apps/frontend/src/app/(owner)/financials/" \
  --include="*.ts" --include="*.tsx" \
  | grep -v "Props\b\|Props<\|Props ="
```

### Step 2: Check existing financial-statements.ts

```bash
cat packages/shared/src/types/financial-statements.ts
```

Identify which financial types (BalanceItem, Assets, Liabilities, Equity, MonthlyData, RevenueBreakdown, ExpenseBreakdown, PropertyPL, CashFlowCategory, MonthlyCashFlow) are already defined.

### Step 3: Check database-rpc.ts for RPC return types

```bash
cat packages/shared/src/types/database-rpc.ts | head -100
```

Financial data often comes from RPC functions. If a local type matches an RPC return shape, use the RPC type instead.

### Step 4: Classify and act on each local type

**Common patterns to expect:**

- `interface BalanceItem { name: string; amount: number }` → If it's a component display type (UI shape), it can stay local. If it's used across 2+ financial components, move to `financial-statements.ts`.
- `interface MonthlyData { month: string; revenue: number; expenses: number }` → If used in multiple components, move to `financial-statements.ts`.
- `interface PropertyPL { ... }` → If defined in 2+ places (income-statement.tsx AND profit-loss.tsx), that's a duplicate — consolidate to `financial-statements.ts`.
- `type PaymentStatus = ...` in financials components → DELETE. Already in `core.ts`.

**Priority:** Any type defined identically in 2+ files MUST be consolidated.

### Step 5: Add missing types to financial-statements.ts

For types that should be shared, add them to `packages/shared/src/types/financial-statements.ts`:

```typescript
// Example structure
export interface PropertyPnL {
  property_id: string
  property_name: string
  revenue: number
  expenses: number
  net_income: number
}

export interface MonthlyFinancials {
  month: string
  revenue: number
  expenses: number
  net_income: number
}
```

### Step 6: Update imports and delete duplicates

### Step 7: Typecheck

```bash
pnpm --filter @repo/frontend exec tsc --noEmit 2>&1 | grep "error TS"
```

### Step 8: Run frontend unit tests

```bash
pnpm --filter @repo/frontend test:unit -- --run "financials"
```

### Step 9: Commit

```bash
git add packages/shared/src/types/ apps/frontend/src/components/financials/ "apps/frontend/src/app/(owner)/financials/"
git commit -m "refactor(types): consolidate financials domain types to shared"
```

---

## Task 3: Payments + Tenants Domain Consolidation

**Files to touch:**
- Audit: `apps/frontend/src/components/payments/`, `apps/frontend/src/components/tenants/`, related app routes
- May modify: `packages/shared/src/types/domain.ts`, `packages/shared/src/types/core.ts`

### Step 1: Audit local types

```bash
grep -rn "^interface \|^export interface \|^type [A-Z]\|^export type [A-Z]" \
  apps/frontend/src/components/payments/ \
  apps/frontend/src/components/tenants/ \
  apps/frontend/src/app/\(owner\)/payments/ \
  apps/frontend/src/app/\(owner\)/tenants/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "Props\b\|Props<\|Props ="
```

### Step 2: Check existing payment/tenant types in shared

```bash
grep -n "payment\|tenant\|Payment\|Tenant" packages/shared/src/types/core.ts
grep -n "payment\|tenant\|Payment\|Tenant" packages/shared/src/types/domain.ts
grep -n "payment_transactions\|tenants\b" packages/shared/src/types/supabase.ts | head -20
```

### Step 3: Classify and act

**Common patterns to expect:**

- `type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'failed'` → LIKELY DIFFERENT from `core.ts` `PaymentStatus`. Reconcile: the canonical version in `core.ts` should match what the DB stores. Delete local variant.
- `interface Payment { id: string; amount: number; ... }` → Use `Tables<'payment_transactions'>` if it matches, otherwise `domain.ts`
- `interface PaymentHistoryItem { ... }` → Likely a view/display type. If used across 2+ components, move to `domain.ts`. Otherwise keep local.
- `interface Tenant { ... }` → Use `Tables<'tenants'>` or check `domain.ts`

### Step 4: Update PaymentStatus usage

The local `PaymentStatus` in `payments-dashboard.tsx` (`'paid' | 'pending' | 'overdue' | 'failed'`) likely differs from `core.ts` `PaymentStatus`. Check what the DB actually stores and reconcile. The `core.ts` version wins — update all local usages.

### Step 5: Typecheck + tests

```bash
pnpm --filter @repo/frontend exec tsc --noEmit 2>&1 | grep "error TS"
pnpm --filter @repo/frontend test:unit -- --run "payment|tenant"
```

### Step 6: Commit

```bash
git add packages/shared/src/types/ apps/frontend/src/components/payments/ apps/frontend/src/components/tenants/
git commit -m "refactor(types): consolidate payments and tenants domain types to shared"
```

---

## Task 4: Maintenance + Leases Domain Consolidation

**Files to touch:**
- Audit: `apps/frontend/src/components/maintenance/`, `apps/frontend/src/components/leases/`, related app routes
- May modify: `packages/shared/src/types/domain.ts`, `packages/shared/src/types/relations.ts`

### Step 1: Audit local types

```bash
grep -rn "^interface \|^export interface \|^type [A-Z]\|^export type [A-Z]" \
  apps/frontend/src/components/maintenance/ \
  apps/frontend/src/components/leases/ \
  "apps/frontend/src/app/(owner)/maintenance/" \
  "apps/frontend/src/app/(owner)/leases/" \
  --include="*.ts" --include="*.tsx" \
  | grep -v "Props\b\|Props<\|Props ="
```

### Step 2: Check existing maintenance/lease types in shared

```bash
grep -n "Maintenance\|maintenance\|Lease\|lease" packages/shared/src/types/core.ts
grep -n "maintenance_requests\|leases\b" packages/shared/src/types/supabase.ts | head -20
```

### Step 3: Classify and act

**Common patterns to expect:**

- Local `MaintenanceRequest` type → Use `Tables<'maintenance_requests'>` from supabase
- `type MaintenanceStatus` → ALREADY in `core.ts`. Delete local.
- `type MaintenancePriority` → ALREADY in `core.ts`. Delete local.
- Local `Lease` type → Use `Tables<'leases'>` or check `domain.ts`
- `LeaseWithTenant` → Move to `relations.ts`

### Step 4: Typecheck + tests

```bash
pnpm --filter @repo/frontend exec tsc --noEmit 2>&1 | grep "error TS"
pnpm --filter @repo/frontend test:unit -- --run "maintenance|lease"
```

### Step 5: Commit

```bash
git add packages/shared/src/types/ apps/frontend/src/components/maintenance/ apps/frontend/src/components/leases/
git commit -m "refactor(types): consolidate maintenance and leases domain types to shared"
```

---

## Task 5: Backend Domain Consolidation

**Files to touch:**
- Audit: `apps/backend/src/modules/`
- May modify: `packages/shared/src/types/domain.ts`, `packages/shared/src/types/api-contracts.ts`

### Step 1: Audit local types in backend modules (non-DTO)

```bash
grep -rn "^interface \|^export interface \|^type [A-Z]\|^export type [A-Z]" \
  apps/backend/src/modules/ \
  --include="*.ts" \
  | grep -v "\.spec\.\|Dto\b\|DTO\b\|Props\b\|Guard\b\|Strategy\b\|Module\b\|Controller\b\|Service\b"
```

### Step 2: Distinguish DTOs from domain types

**Keep local in backend:**
- `CreatePropertyDto`, `UpdatePropertyDto` — these ARE the DTOs (handled by nestjs-zod)
- Service method parameter interfaces that are internal to the module
- Controller-specific interfaces

**Move to shared or delete:**
- Types that duplicate `Tables<'x'>` from supabase
- Types that are API response shapes already defined in `api-contracts.ts`
- Domain entity types that the frontend also needs

### Step 3: Check api-contracts.ts for duplicates

```bash
cat packages/shared/src/types/api-contracts.ts | head -100
```

### Step 4: Check backend-domain.ts

```bash
cat packages/shared/src/types/backend-domain.ts
```

This file contains `JSONSchema` type. Check if any local backend types should live here instead.

### Step 5: Classify and act

For each non-DTO type found:
- Does the frontend also need this type? → Move to `api-contracts.ts` or `domain.ts`
- Is it a DB row duplicate? → Use `Tables<'x'>` from supabase
- Is it internal to one backend service only? → Keep local

### Step 6: Typecheck backend

```bash
pnpm --filter @repo/backend exec tsc --noEmit 2>&1 | grep "error TS"
```

### Step 7: Run backend unit tests

```bash
pnpm --filter @repo/backend test:unit -- --forceExit 2>&1 | tail -20
```

### Step 8: Commit

```bash
git add packages/shared/src/types/ apps/backend/src/modules/
git commit -m "refactor(types): consolidate backend domain types to shared"
```

---

## Task 6: Write TYPES.md and Update Documentation

> **Depends on:** Tasks 1-5 all complete

**Files to create/modify:**
- Create: `packages/shared/src/types/TYPES.md`
- Modify: `CLAUDE.md` (Type System Rules section)
- Modify: Serena memory `database-schema` (via `mcp__plugin_serena_serena__write_memory`)

### Step 1: Audit final state of all shared type files

```bash
grep -n "^export interface \|^export type \|^export const " \
  packages/shared/src/types/core.ts \
  packages/shared/src/types/domain.ts \
  packages/shared/src/types/relations.ts \
  packages/shared/src/types/financial-statements.ts \
  packages/shared/src/types/analytics.ts \
  packages/shared/src/types/api-contracts.ts \
  packages/shared/src/types/database-rpc.ts \
  packages/shared/src/types/stripe.ts
```

### Step 2: Write TYPES.md

Create `packages/shared/src/types/TYPES.md` with this structure:

```markdown
# TenantFlow Shared Types Lookup Table

> Generated: YYYY-MM-DD
> **AGENTS: Check this file BEFORE defining any type.**

## How to Use

1. Search this file for your type name (Cmd+F)
2. If found → import from the listed file path
3. If not found → follow classification rules in CLAUDE.md

## DB Row Types (from supabase.ts)

Use `Tables<'tablename'>` directly. Never redefine these.

| Entity | Table | Import |
|---|---|---|
| Property | `properties` | `Tables<'properties'>` |
| Unit | `units` | `Tables<'units'>` |
| Tenant | `tenants` | `Tables<'tenants'>` |
| Lease | `leases` | `Tables<'leases'>` |
| MaintenanceRequest | `maintenance_requests` | `Tables<'maintenance_requests'>` |
| PaymentTransaction | `payment_transactions` | `Tables<'payment_transactions'>` |
| Profile | `profiles` | `Tables<'profiles'>` |

## Status String Unions (from core.ts)

| Type | Import |
|---|---|
| LeaseStatus | `@repo/shared/types/core` |
| UnitStatus | `@repo/shared/types/core` |
| PaymentStatus | `@repo/shared/types/core` |
| MaintenanceStatus | `@repo/shared/types/core` |
| MaintenancePriority | `@repo/shared/types/core` |
| PropertyStatus | `@repo/shared/types/core` |

## Domain Types (from domain.ts)

[List all types exported from domain.ts after consolidation]

## Relations Types (from relations.ts)

[List all joined/nested types exported from relations.ts after consolidation]

## Financial Types (from financial-statements.ts)

[List all types exported from financial-statements.ts after consolidation]

## Analytics Types (from analytics.ts)

[List all types exported from analytics.ts after consolidation]

## API Contract Types (from api-contracts.ts)

[List all types exported from api-contracts.ts after consolidation]

## RPC Return Types (from database-rpc.ts)

[List all types exported from database-rpc.ts after consolidation]
```

Fill in the `[List all types...]` sections using the output from Step 1.

### Step 3: Update CLAUDE.md Type System Rules

Find the "Type System Rules" section in `CLAUDE.md` and add after the existing content:

```markdown
### Type Lookup Protocol (MANDATORY)

Before defining any type, check in this order:
1. `packages/shared/src/types/TYPES.md` — master lookup table
2. `packages/shared/src/types/supabase.ts` — DB rows: use `Tables<'tablename'>`
3. `packages/shared/src/types/core.ts` — status string unions
4. `packages/shared/src/types/domain.ts` — cross-domain business objects
5. `packages/shared/src/types/api-contracts.ts` — API shapes

**Zero tolerance**: If a type exists in shared, you MUST use it. Creating a local duplicate is a blocking violation.
```

### Step 4: Update Serena memory

Using the Serena MCP tools, update or create the `database-schema` memory to include:

```
## Canonical Type Locations

All domain types derive from packages/shared/src/types/supabase.ts (auto-generated from prod DB).

Type lookup order:
1. supabase.ts - DB rows via Tables<'tablename'>
2. core.ts - status string unions (LeaseStatus, PaymentStatus, etc.)
3. domain.ts - cross-domain business objects
4. relations.ts - joined types (PropertyWithUnits, LeaseWithTenant)
5. financial-statements.ts - balance sheet, income statement shapes
6. analytics.ts - dashboard KPI shapes
7. api-contracts.ts - API request/response shapes

See packages/shared/src/types/TYPES.md for full lookup table.
```

### Step 5: Final full typecheck

```bash
pnpm typecheck
```

All packages must pass with zero errors.

### Step 6: Full validation

```bash
pnpm validate:quick
```

### Step 7: Commit

```bash
git add packages/shared/src/types/TYPES.md CLAUDE.md
git commit -m "docs(types): add TYPES.md canonical lookup table and update CLAUDE.md rules"
```

---

## Execution Notes

**Tasks 1-5 run in parallel.** Each operates on a separate domain with no file overlap. Launch all five simultaneously using `superpowers:dispatching-parallel-agents`.

**Task 6 runs after Tasks 1-5 complete.** It writes the final documentation based on the settled state of all shared type files.

**If a type is ambiguous** (could go in domain.ts OR stay local):
- Rule: If it's used in 2+ files across different components → move to shared
- Rule: If it's used in only 1 component → keep local

**If a shared type needs a new field:**
- Add it to the shared file
- Update all consumers
- Never create a local variant "because it's slightly different"
