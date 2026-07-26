# Phase 55: Rent Ledger - Pattern Map

**Mapped:** 2026-07-24
**Files analyzed:** 17 new/modified (4 migrations, 2 hooks/keys, 6 UI, 2 modified surfaces, 3 test suites)
**Analogs found:** 17 / 17 (every new file has a proven in-repo analog — greenfield subsystem over existing rails, zero design-from-scratch)

> **Load-bearing rule for the planner (D-00):** every ledger amount is `numeric(10,2)` **dollars**. The integer→numeric conversion happens exactly once (`leases.rent_amount::numeric(10,2)` at charge generation). No `* 100`, no `/ 100`, no `formatCents` anywhere in this phase. `formatCents` (`src/lib/utils/currency.ts:56-59`) exists for Stripe cents only — it MUST NOT touch a ledger value. Display path is `formatCurrency(dollars)` (`currency.ts:28-50`).

> **Ref-timestamp correction:** CONTEXT.md canonical_refs cite `20260418183608_demolish_rent_and_tenant_portal.sql`; the real file is `supabase/migrations/20260418140000_demolish_rent_and_tenant_portal.sql` (RESEARCH.md uses the correct timestamp). `20260530015823_finish_rent_payment_demolition.sql` is correct as cited. These are the must-not-regress demolition guardrails (no ACH/autopay/cards; receipts are text labels).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/<ts>_rent_ledger_schema.sql` (NEW) | migration (table+RLS+trigger) | CRUD / append-only | `20260724031533_esign_metering.sql` + `20260722005310_lease_reminders_delivery_state.sql` | exact |
| `supabase/migrations/<ts>_rent_charges_generation_cron.sql` (NEW) | migration (cron fn) | batch / scheduled | `20260224091106_payment_reminders_cron.sql` | exact |
| `supabase/migrations/<ts>_rent_ledger_read_rpcs.sql` (NEW) | migration (read RPCs) | request-response / read | `get_revenue_trends_optimized` (`20260709060533`) + `get_esign_usage_current_month` (`20260724031533`) | exact |
| `supabase/migrations/<ts>_revenue_collected_integration.sql` (NEW) | migration (RPC edit) | transform | `get_revenue_trends_optimized` (`20260709060533:87-123`) | exact (same fn) |
| `src/hooks/api/query-keys/rent-ledger-keys.ts` (NEW) | query-key factory + mapper | CRUD | `src/hooks/api/query-keys/document-keys.ts` | exact |
| `src/hooks/api/use-rent-ledger.ts` (NEW) | hook | CRUD | `use-lease.ts` (queries) + `use-expense-mutations.ts` (mutations) | exact |
| `src/components/ledger/ledger-tab.tsx` (NEW) | component | request-response | `leases/detail/lease-details.client.tsx` (Tabs+Card strip) | role-match |
| `src/components/ledger/record-receipt-dialog.tsx` (NEW) | component (form) | CRUD | `leases/dialogs/renew-lease-dialog.tsx` | exact |
| `src/components/ledger/add-line-dialog.tsx` (NEW) | component (form) | CRUD | `leases/dialogs/renew-lease-dialog.tsx` | exact |
| `src/components/ledger/track-since-dialog.tsx` (NEW) | component (form) | CRUD | `leases/dialogs/renew-lease-dialog.tsx` | exact |
| `src/components/ledger/collection-rate-kpi.tsx` (NEW) | component (KPI card) | request-response | `dashboard/components/kpi-bento-row.tsx` (`KpiTile`) | exact |
| `leases/detail/lease-details.client.tsx` (MODIFIED) | component | request-response | itself (`:183-201` Tabs grid-cols-3 → grid-cols-4) | in-place |
| revenue-surface relabel (dashboard/financial-overview) (MODIFIED) | component | transform | `use-owner-dashboard-financial.ts` (`RevenueTrendRow`) | in-place |
| `tests/integration/rls/rent-ledger-*.test.ts` (NEW ×3) | test (RLS) | — | `tests/integration/rls/esign-metering.rls.test.ts` | exact |
| `src/hooks/api/__tests__/rent-ledger-balance.test.ts` + `-money.test.ts` (NEW) | test (unit) | — | `query-keys/analytics-mappers.test.ts` | role-match |
| `src/hooks/api/query-keys/rent-ledger-keys.test.ts` (NEW) | test (mapper) | — | `query-keys/document-keys.test.ts` | exact |

**Reuse-as-is (no new file, cite the existing symbol):**
- `formatCurrency` — `src/lib/utils/currency.ts:28-50` (dollars display, ALL money)
- `getCollectionRateStatus` — `src/lib/utils/currency.ts:282-298` (collection-rate KPI status/color; **swap its placeholder `icon` strings `"TARGET:"/"[OK]"/"WARNING:"/"[DOWN]"` for lucide icons in the card — they are labels, not emojis**)
- `formatPercentage` — `src/lib/utils/currency.ts:150-166` (KPI value)
- `ownerDashboardKeys` — `src/hooks/api/query-keys/owner-dashboard-keys.ts` (invalidation target; add a `financial.collectionRate()` leaf when its first consumer lands)
- `handlePostgrestError` — `#lib/postgrest-error-handler` (RPC/PostgREST boundary errors)
- `jsonArray` — `#lib/rpc-shape` (typed shaping of `Returns: Json`/`jsonb` RPCs)
- `createMutationCallbacks` — `#hooks/create-mutation-callbacks` (onSuccess/onError + `invalidate:` fanout)
- `Stat`/`StatLabel`/`StatValue`/`StatDescription`/`StatTrend`/`StatIndicator` — `src/components/ui/stat.tsx:127-134`
- `ConfirmDialog` — `#components/ui/confirm-dialog` (reversal confirmation, `confirmVariant="destructive"`)
- `NumberTicker` — `#components/ui/number-ticker` (KPI value, honors reduced motion)

---

## Pattern Assignments

### `<ts>_rent_ledger_schema.sql` — rent_charges + rent_receipts + RLS + guard trigger (LEDGER-02/05/06)

**Analog:** `supabase/migrations/20260724031533_esign_metering.sql` (append-only owner-scoped table) + `20260722005310_lease_reminders_delivery_state.sql` (text+CHECK state discipline).

**Append-only table + denormalized owner + owner-SELECT-only RLS** (`esign_metering.sql:41-67`):
```sql
create table if not exists public.esign_events (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,   -- canonical owner col, direct RLS (DIS-4)
  lease_id      uuid not null references public.leases(id) on delete cascade,
  event_type    text not null default 'send'
                constraint esign_events_event_type_check check (event_type in ('send')),  -- text+CHECK, NO enum (rule 6)
  created_at    timestamptz not null default now()
);
create index if not exists idx_esign_events_owner_month on public.esign_events (owner_user_id, created_at);
alter table public.esign_events enable row level security;
-- Deliberately the ONLY policy: no INSERT/UPDATE/DELETE policy → append-only for authenticated
create policy esign_events_select on public.esign_events
  for select to authenticated using (owner_user_id = (select auth.uid()));
```
**Copy for the ledger:** two tables (`rent_charges`, `rent_receipts`), each with denormalized `owner_user_id` + `lease_id`, `amount numeric(10,2)`, `type`/`method` as `text + CHECK` (never enum). **Diverge from the esign analog in two ways** the planner must add (both specified in RESEARCH.md Pattern 1, lines 200-249):
1. Add a SELECT **and** INSERT policy (owner records receipts/lines from the client) — `with check (owner_user_id = (select auth.uid()))` for INSERT. esign has no authenticated INSERT because its writes go through a service_role RPC; the ledger's writes are owner-initiated.
2. Add the belt-and-suspenders immutability trigger (esign relies on RLS-only since it has no owner write path; the ledger owner CAN insert, so it needs the trigger to block UPDATE/DELETE for every writer incl. service_role):
```sql
create or replace function public.rent_ledger_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'rent ledger is append-only; post a reversal entry instead of editing/deleting (row %)',
    coalesce(old.id::text, '?') using errcode = '0A000';  -- feature_not_supported
end; $$;
create trigger rent_charges_no_mutate before update or delete on public.rent_charges
  for each row execute function public.rent_ledger_append_only();
```
**Idempotency index (from RESEARCH Pitfall 2):** `create unique index uq_rent_charges_lease_period_rent on public.rent_charges (lease_id, period_start) where type = 'rent';` — the partial predicate MUST match the cron's `ON CONFLICT ... WHERE type='rent'` exactly. `leases.ledger_start_date date` (nullable) is added here.

---

### `<ts>_rent_charges_generation_cron.sql` — generate_rent_charges() + cron.schedule (LEDGER-01/04)

**Analog:** `supabase/migrations/20260224091106_payment_reminders_cron.sql` — the named SECURITY DEFINER cron fn + `ON CONFLICT DO NOTHING` idempotency + idempotent `cron.schedule()`.

**SECURITY DEFINER cron fn shape** (`payment_reminders_cron.sql:198-203`):
```sql
create or replace function public.queue_payment_reminders()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
```
**Idempotent insert** (`:235-237`) — the exact idempotency guard to copy:
```sql
insert into public.payment_reminders (rent_payment_id, lease_id, reminder_type)
values (v_payment.id, v_payment.lease_id, '7_days')
on conflict (rent_payment_id, reminder_type) do nothing;
```
**Idempotent schedule registration** (`:292-296`) — cron.schedule replaces any job of the same name:
```sql
select cron.schedule('payment-reminders', '0 9 * * *', $$select public.queue_payment_reminders()$$);
```
**Copy for the ledger** (full target SQL in RESEARCH.md Pattern 2, lines 257-294): name it `generate_rent_charges()`, `security definer set search_path = public`, INSERT with `on conflict (lease_id, period_start) where type = 'rent' do nothing`, and **the one conversion** `rent_amount::numeric(10,2)` (NO `* 100`). Diverge from the analog: (a) return `integer` (count inserted) for cron logging instead of `void`; (b) `revoke all ... from public, anon, authenticated; grant execute ... to service_role;` (payment_reminders_cron omits the revoke — the ledger generator MUST be service_role-only per RESEARCH Security Domain / Threat "End user calling the generator to fabricate charges"); (c) coverage predicate `lease_status in ('active','ended','expired','terminated')` + period within `[start_date,end_date]` + `>= ledger_start_date` (DIS-5), NOT the naive `= 'active'`; (d) cron slot `'0 5 * * *'` (RESEARCH verified clear of the 03:00-03:45 cleanup cluster and 06:00/06:30 reminder slots).

---

### `<ts>_rent_ledger_read_rpcs.sql` — get_lease_ledger + get_lease_ledger_summary + get_collection_rate (LEDGER-03/08)

**Analog (auth guard + jsonb_agg read):** `get_revenue_trends_optimized` in `20260709060533_...sql:87-97`:
```sql
CREATE OR REPLACE FUNCTION public.get_revenue_trends_optimized(p_user_id uuid, p_months integer DEFAULT 12)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;
```
**Analog (param-less owner-scoped read via auth.uid()):** `get_esign_usage_current_month` (`20260724031533:141-183`) — the pattern for a no-arg summary that resolves the caller internally, then `revoke all ... from public, anon; grant execute ... to authenticated;`.

**Copy for the ledger** (full target SQL in RESEARCH.md Pattern 3, lines 301-332): `get_lease_ledger_summary(p_lease_id uuid)` returns `table(charges_total, credits_total, receipts_total, balance, late_count, late_amount)`, `stable security definer set search_path = public`, guards lease ownership before returning (`raise exception 'Access denied' using errcode='42501'` — mirror the esign 42501 guard at `:155-157`), and computes the DERIVED late flag inline: `c.due_date + interval '5 days' < current_date` (fixed 5-day grace, D-03; **do not** read `leases.grace_period_days`/`late_fee_days` — DIS-2). Companion `get_lease_ledger(p_lease_id)` returns an ordered `jsonb` array for the chronological UI, shaped by the typed mapper (below), never `as unknown as`.

---

### `<ts>_revenue_collected_integration.sql` — fill collections + collection-rate (LEDGER-07/08)

**Analog / target of edit:** the SAME `get_revenue_trends_optimized` above. The `collections` placeholder is already emitted, hardcoded (`20260709060533:114-119`):
```sql
SELECT coalesce(jsonb_agg(jsonb_build_object(
  'month', to_char(m.month_start, 'YYYY-MM'),
  'revenue', coalesce(me.expected_revenue, 0),   -- = SCHEDULED (Σ rent_amount); UI relabels, calc unchanged
  'collections', 0,                              -- ← FILL THIS from rent_receipts (D-07)
  'outstanding', coalesce(me.expected_revenue, 0)
) ORDER BY m.month_start DESC), '[]'::jsonb) INTO v_result
```
**Frontend already reads it** — `RevenueTrendRow` in `src/hooks/api/use-owner-dashboard-financial.ts:37-42`:
```typescript
interface RevenueTrendRow { month: string; revenue: number; collections: number; outstanding: number; }
```
**Copy for the ledger:** add a `monthly_collected` CTE (`Σ rent_receipts.amount` by `date_trunc('month', received_date)` for the owner's leases), set `'collections', coalesce(mc.collected, 0)` and `'outstanding', scheduled − collected`. `CREATE OR REPLACE` (no return-type change; keep grants — mirrors the `20260709060533` header note "CREATE OR REPLACE (no return-type change; grants kept)"). New `get_collection_rate(p_user_id, p_month)` = `collected ÷ scheduled` current month (RESEARCH Pattern 4, lines 348-369; `else 0` when scheduled=0 — honest, not fabricated). **No-double-count rule:** leave `revenue_stats_type`/`get_dashboard_stats` composite untouched; add `collected`/`collection_rate` via the new RPC only.

---

### `src/hooks/api/query-keys/rent-ledger-keys.ts` — queryOptions factories + typed mappers + mutations

**Analog:** `src/hooks/api/query-keys/document-keys.ts` — the canonical `queryOptions()` factory + `mapDocumentRow` boundary mapper + `mutationOptions()` in one file.

**Typed mapper at the RPC boundary** (`document-keys.ts:122-152`) — the exact discipline (no `as unknown as`, throw on missing NOT NULL):
```typescript
export function mapDocumentRow(raw: Record<string, unknown>): Omit<DocumentRow, "signed_url"> {
  function requireString(field: string): string {
    const value = raw[field];
    if (typeof value !== "string") {
      throw new Error(`mapDocumentRow: NOT NULL field '${field}' missing or non-string from PostgREST response`);
    }
    return value;
  }
  return { id: requireString("id"), /* ... */ owner_user_id: (raw.owner_user_id as string | null) ?? null };
}
```
**queryOptions factory + PostgREST read** (`document-keys.ts:179-239`):
```typescript
export const documentQueries = {
  all: () => ["documents"] as const,
  list: (params) => queryOptions({
    queryKey: [...documentQueries.lists(), params.entityType, params.entityId] as const,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error, count } = await supabase.from("documents").select("...", { count: "exact" })...;
      if (error) handlePostgrestError(error, "documents");
      return ((data ?? []) as Record<string, unknown>[]).map(mapDocumentRow);
    },
    enabled: isUuid(params.entityId),
  }),
};
```
**Copy for the ledger:** `rentLedgerKeys` / `rentLedgerQueries` with `forLease(leaseId)` leaves; `mapLedgerSummaryRow` + `mapLedgerEntryRow` (target shape in RESEARCH Code Examples, lines 470-479 — `Number(raw.balance ?? 0)` dollars, **no `* 100`**); `recordReceipt`/`addLine`/`addReversal`/`startTracking` as `mutationOptions()`. Insert pattern from RESEARCH Code Examples lines 456-463 (`.insert({ charge_id, lease_id, owner_user_id, amount, method, received_date })` → `handlePostgrestError`). Keep under 300 lines (split search-style if needed, per document-keys note at `:244-247` — no barrel re-exports).

---

### `src/hooks/api/use-rent-ledger.ts` — thin query hooks + mutation hooks

**Analog (thin query hooks):** `src/hooks/api/use-lease.ts:7-13` — `useQuery(factory())` wrappers, no logic:
```typescript
export function useLease(id: string) {
  return useEntityDetail<Lease>({ queryOptions: leaseQueries.detail(id), listQueryKey: leaseQueries.lists(), id });
}
```
**Analog (mutation hook + invalidation fanout):** `src/hooks/api/use-expense-mutations.ts:50-74` — `useMutation` + `createMutationCallbacks` with `ownerDashboardKeys.all` in the `invalidate:` array:
```typescript
export function useCreateExpenseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    ...financialMutations.createExpense(),
    ...createMutationCallbacks(queryClient, {
      invalidate: [expenseKeys.all, financialKeys.all, maintenanceQueries.all(), ownerDashboardKeys.all],
      errorContext: "Create expense",
    }),
  });
}
```
**Copy for the ledger:** each mutation invalidates `rentLedgerKeys.forLease(leaseId)` + `ownerDashboardKeys.all` (the CLAUDE.md mandate; collection-rate KPI lives under `ownerDashboardKeys.financial`). Append-only ⇒ no optimistic rollback of edits (UI-SPEC Interaction contract). Max 300 lines / 50 lines-per-fn.

---

### `src/components/ledger/record-receipt-dialog.tsx` · `add-line-dialog.tsx` · `track-since-dialog.tsx` (LEDGER-02/04/05)

**Analog:** `src/components/leases/dialogs/renew-lease-dialog.tsx` — the established lease-action `Dialog` + form + mutation pattern.

**Dialog composition** (`renew-lease-dialog.tsx:130-177`): `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogBody`/`DialogFooter` from `#components/ui/dialog`, `<form onSubmit={handleSubmit}>`, footer `Button variant="outline"` Cancel + primary submit gated on `mutation.isPending`:
```tsx
<DialogFooter>
  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={renewLease.isPending}>Cancel</Button>
  <Button type="submit" disabled={renewLease.isPending}>{renewLease.isPending ? "Renewing..." : "Renew Lease"}</Button>
</DialogFooter>
```
**Submit + toast + close discipline** (`:87-108`): `await mutation.mutateAsync(...)` in try/catch; the mutation's `createMutationCallbacks` fires the single success toast (form does NOT double-toast — `:95-96`); reset local state + `onOpenChange(false)` on success; `logger.error` only on catch.
**Copy for the ledger:** the UI-SPEC (§ Surface Layouts 2-4) specifies `@tanstack/react-form` + zod (RESEARCH Code Examples `recordReceiptSchema` lines 450-455 — `amount: z.number().positive()` dollars, `method: z.string()` label) rather than renew's raw `useState`; keep the Dialog shell + footer + submit discipline identical. Copy exactly per UI-SPEC (labels/toasts in the Copywriting Contract; amounts render via `formatCurrency`, never cents).

---

### `src/components/ledger/collection-rate-kpi.tsx` (LEDGER-08)

**Analog:** `KpiTile` in `src/components/dashboard/components/kpi-bento-row.tsx:286-336` — the `Stat` card + `NumberTicker` + reduced-motion pattern:
```tsx
<Stat className="h-full ..." aria-label={ariaLabel}>
  <StatLabel>{tile.label}</StatLabel>
  <StatValue><KpiNumberTicker value={tile.value} decimalPlaces={tile.decimalPlaces} duration={800} /></StatValue>
  {trendChip}
  {tile.description ? <StatDescription>{tile.description}</StatDescription> : null}
</Stat>
```
The reduced-motion `KpiNumberTicker` wrapper (`:67-94`) is the reuse target for honoring `prefers-reduced-motion` on the animated value.
**Copy for the KPI:** `StatLabel` "Collection rate", `StatValue` = `formatPercentage(rate)` via `NumberTicker`, `StatIndicator`/color from `getCollectionRateStatus(rate)` (`currency.ts:282`), `StatDescription` "Collected ÷ scheduled, this month". Fed by `get_collection_rate()`, wired to `ownerDashboardKeys.financial`. Zero-data → 0% + honest helper (UI-SPEC Copywriting). **Swap the helper's `icon` strings for lucide** (`TrendingUp`/`CircleCheck`/`TriangleAlert`/`TrendingDown`) — they are labels, not emojis.

---

### `leases/detail/lease-details.client.tsx` (MODIFIED — mount the Ledger tab)

**In-place edit** (`:183-201`): extend the existing `TabsList` from `grid-cols-3` to `grid-cols-4` and add a `TabsTrigger value="ledger"` + `TabsContent value="ledger"` rendering the `LedgerTab` island (UI-SPEC § Surface Layouts 1: order `Details · Ledger · Timeline · Terms`):
```tsx
<TabsList className="grid w-full grid-cols-3">   {/* → grid-cols-4 */}
  <TabsTrigger value="details">Details</TabsTrigger>
  {/* + <TabsTrigger value="ledger">Ledger</TabsTrigger> */}
  <TabsTrigger value="timeline">Timeline</TabsTrigger>
  <TabsTrigger value="terms">Terms</TabsTrigger>
</TabsList>
```
The balance-summary strip in `LedgerTab` mirrors the sibling `Card`/`CardContent p-4` key-metric cards on the same page (`:154-179`, `text-xl font-semibold` money at `:160`).

---

### Revenue relabel (MODIFIED — dashboard + financial-overview surfaces) (LEDGER-07)

**Analog / edit site:** `src/hooks/api/use-owner-dashboard-financial.ts` (`RevenueTrendRow` consumer at `:37-42`, mapped at `:122-127`). Relabel the lease-derived figure "**Scheduled**" and surface "**Collected**" as a distinct labeled figure beside it (UI-SPEC Copywriting: two labels + tooltips, never summed). The underlying `revenue` calc is unchanged — this is a label + a new sibling field, not a re-base. **Do not** re-base NOI/margin on collected (RESEARCH Pitfall 5).

---

## Shared Patterns

### Append-only + owner-scoped RLS (applies to both ledger tables)
**Source:** `supabase/migrations/20260724031533_esign_metering.sql:57-67` (owner-SELECT-only) + RESEARCH Pattern 1 guard trigger.
- Denormalized `owner_user_id uuid references public.users(id)` → RLS `owner_user_id = (select auth.uid())` **directly** (NOT `get_current_owner_user_id()` — DIS-4, stale).
- One policy per op per role. SELECT + INSERT for authenticated; NO UPDATE/DELETE policy; `BEFORE UPDATE OR DELETE` trigger raises `0A000` for every writer.
- `text + CHECK` for all state/label columns (`type`, `method`) — never a PG enum (CLAUDE.md rule 6).

### SECURITY DEFINER auth guard (applies to every read RPC)
**Source:** `get_revenue_trends_optimized` (`20260709060533:95-97`) + `get_esign_usage_current_month` (`20260724031533:155-157`).
```sql
security definer set search_path = public
-- param-taking RPC:  IF p_user_id != (SELECT auth.uid()) THEN RAISE EXCEPTION 'Access denied...';
-- ownership RPC:      if not exists (select 1 from leases where id=p_lease_id and owner_user_id=(select auth.uid())) then raise exception 'Access denied' using errcode='42501';
```
Read RPCs → `grant execute ... to authenticated; revoke all ... from public, anon;`. The generator → `revoke all ... from public, anon, authenticated; grant execute ... to service_role;`.

### Money display (applies to every UI money render)
**Source:** `src/lib/utils/currency.ts:28-50`. `formatCurrency(dollars)` only, `tabular-nums`, right-aligned in tables. **Never** `formatCents` (`:56-59`), never `* 100`/`/ 100` on a ledger amount (v8.0 MONEY-01/02 100× bug class).

### Mutation invalidation (applies to every ledger mutation)
**Source:** `src/hooks/api/use-expense-mutations.ts:64-72` via `createMutationCallbacks`.
`invalidate: [rentLedgerKeys.forLease(leaseId), ownerDashboardKeys.all]` — related keys + `ownerDashboardKeys.all` (CLAUDE.md mandate; feeds the collection-rate KPI).

### RLS integration test (applies to the three ledger RLS suites)
**Source:** `tests/integration/rls/esign-metering.rls.test.ts` — dual-client (ownerA/ownerB) + service-role client, guarded by an env-present skip (`"E2E owner credentials not set"`), sequential vs prod. Copy this harness for: owner isolation (ownerA cannot SELECT ownerB rows; cross-owner INSERT blocked), append-only (UPDATE/DELETE raises), and generation idempotency + amount-exactness (no ×100).

---

## No Analog Found

None. Every new file maps to a proven in-repo analog (this is a greenfield subsystem built entirely over existing rails — RESEARCH.md "every hard part … is a database guarantee the codebase already uses elsewhere").

**One helper needs a fix, not a from-scratch build:** `getCollectionRateStatus` (`currency.ts:282-298`) ships placeholder `icon` strings (`"TARGET:"`, `"[OK]"`, `"WARNING:"`, `"[DOWN]"`) — the KPI card MUST render lucide icons instead (they are text labels, would render literally). Flagged so the planner budgets the swap.

---

## Metadata

**Analog search scope:** `supabase/migrations/` (cron, append-only, revenue RPC, demolition), `src/hooks/api/` + `src/hooks/api/query-keys/` (factories, mappers, mutation hooks), `src/components/{leases,dashboard,ui}/` (Tabs shell, Dialog forms, Stat KPI), `src/lib/utils/currency.ts`, `tests/integration/rls/`.
**Files scanned:** 14 read in full/targeted + directory listings for migrations, query-keys, dashboard/lease/dialog components, and RLS tests.
**Pattern extraction date:** 2026-07-24
