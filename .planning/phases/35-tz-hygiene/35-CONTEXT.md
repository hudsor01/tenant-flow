# Phase 35 — TZ Sweep, Bulk-Import, Scripts & Hygiene (FINAL v8.0 phase)

Requirements: **TZ-01, TZ-02, TZ-03, MISC-01, MISC-02, MISC-03, MISC-04**.
Each fix locked against current source by a parallel investigator (understand Workflow `wf_1c3525a6-ba7`). Line numbers may have drifted — **locate by content**.

---

## TZ-01 — date-only YYYY-MM-DD parsed/formatted in UTC ("one day early" class)

**Root cause:** date-only Postgres `date` columns (`leases.start_date/end_date`, `maintenance_requests.scheduled_date`, `expenses.expense_date`) and `"yyyy-MM-dd"` report params arrive as bare strings. `new Date("2026-01-15")` = midnight **UTC**; a local getter (`toLocaleDateString`, `.getFullYear`, `.getTime()` vs `Date.now()`) then reads the previous calendar day for negative-offset zones — or a full ISO timestamp gets written into a `date` column (truncates to the UTC day, not the owner's local day).

### Shared helpers — extract first
The helpers exist but are private/scattered:
- `parseLocalYmd(input: string | null): Date | undefined` — private in `src/components/documents/documents-vault.client.tsx` (~L83). `new Date(y, mo-1, day)` at local midnight, overflow-guarded.
- `formatLocalYmd(d: Date): string` — private in the same file (~L100). Local `getFullYear/getMonth/getDate` → `YYYY-MM-DD`.

**Action:** MOVE both into `src/lib/formatters/date.ts` (next to `formatDate`) as exported functions, then update `documents-vault.client.tsx` to import them (delete its private copies). `src/lib/formatters/date.ts#formatDate` already renders date-only strings correctly (appends `T00:00:00Z` + `timeZone:"UTC"`) — pure **display** sites may route through `formatDate`, but **compute/persist** sites MUST use `parseLocalYmd`/`formatLocalYmd`. Use `differenceInCalendarDays` from `date-fns` (already a dep) for day-diffs. Do NOT touch `expandDateBoundary` (separate concern, stays in `document-search-keys.ts`).

### Sites to fix
1. `src/lib/reports/report-data.ts` `fmtDate` (~L217): `new Date(iso).toLocaleDateString(...)` → `const d = parseLocalYmd(iso); return d ? d.toLocaleDateString("en-US", {…existing opts}) : iso;` (preserve the exact existing format options).
2. `src/lib/reports/report-data.ts` `buildTaxPreparation` (~L819): `new Date(end).getFullYear()` → `parseLocalYmd(end)?.getFullYear() ?? new Date(end).getUTCFullYear()`.
3. `src/components/dashboard/expiring-leases-widget.tsx`: `daysUntil` (~L60) `new Date(dateIso).getTime() - Date.now()` → `differenceInCalendarDays(parseLocalYmd(dateIso) ?? new Date(dateIso), new Date())` (keep the `Math.max(0, …)` clamp if present). Also the render at ~L127 `new Date(lease.end_date).toLocaleDateString(...)` → `formatDate(lease.end_date, {…})` or `parseLocalYmd`.
4. `src/components/dashboard/components/revenue-area-chart.tsx` `format30dTick` (~L92): `new Date(iso).toLocaleDateString("en-US", {month:"short",day:"numeric"})` → `const date = parseLocalYmd(iso); return date ? date.toLocaleDateString("en-US", {month:"short",day:"numeric"}) : iso;`. Leave `format6moTick` (`new Date(year, month-1)` is already local — correct).
5. **`src/hooks/api/query-keys/lease-mutation-options.ts` (~L150) — HIGHEST IMPACT (persists wrong data):** terminate writes `end_date: new Date().toISOString()` (full UTC timestamp → `date` column truncates to UTC day → can persist *tomorrow*). → `end_date: formatLocalYmd(new Date())`.
6. `src/components/leases/detail/lease-detail-utils.ts` `getDaysUntilExpiry` (~L239): `new Date(endDate)` + `Math.ceil((end.getTime()-now.getTime())/86400000)` → `const end = parseLocalYmd(endDate); if (!end) return null; return differenceInCalendarDays(end, new Date());`. Leave sibling `formatRelativeTime` (operates on `created_at` timestamptz — not a date-only bug).

### Sites the requirement list MISSED (same class — fix them too, class-eradication)
7. `src/components/maintenance/detail/maintenance-utils.ts` (~L109) `new Date(request.scheduled_date).toLocaleDateString()` → `formatDate`/`parseLocalYmd`.
8. `src/components/maintenance/detail/maintenance-header-card.tsx` (~L140) `new Date(request.scheduled_date).toLocaleDateString("en-US",{…})` → same.
9. `src/components/maintenance/detail/expenses-card.tsx` (~L61) `new Date(expense.expense_date).toLocaleDateString()` → same.
10. `src/components/leases/wizard/terms-step.tsx` `calculateEndDate` (~L38): `new Date(startDate)` (UTC parse) + local `setMonth/setDate` + `.toISOString().slice(0,10)` → `parseLocalYmd(startDate)` + local `setMonth/setDate` + `formatLocalYmd`.
11. `src/components/maintenance/detail/add-expense-dialog.tsx` (~L42) default expense date `new Date().toISOString().split("T")[0]` (UTC today) → `formatLocalYmd(new Date())`.
12. `src/components/maintenance/detail/schedule-dialog.tsx` (~L83) `min={new Date().toISOString().split("T")[0]}` → `formatLocalYmd(new Date())`.

**Tests:** unit-test `parseLocalYmd`/`formatLocalYmd` round-trip + a negative-offset-zone regression (e.g. mock a `2026-01-15` date-only value → asserts local Jan 15, not Jan 14). Add a `lease-detail-utils`/`getDaysUntilExpiry` test. MIGRATION = no.

---

## TZ-02 — `getDefaultDateRange` month-end overflow

`src/components/reports/reports-utils.ts` `getDefaultDateRange` (~L17): calls `start.setMonth(today.getMonth() - 2)` while `start.getDate()` is still today's day → on a 29/30/31 month-end, the target (shorter) month rolls forward, then `setDate(1)` lands on the wrong month.

**Fix (2-line reorder — pin day first):**
```ts
const start = new Date(today);
start.setDate(1); // pin BEFORE shifting month so setMonth can never overflow
start.setMonth(today.getMonth() - 2);
```
Consumer: `src/app/(owner)/reports/page.tsx` (~L103) seeds the report window. **Test:** unit test with a fixed 31st month-end "today" (inject via arg or a `now` param if the fn allows; otherwise test the pure date math) asserting the correct 2-months-back 1st. MIGRATION = no.

---

## TZ-03 — dashboard "Revenue vs Expenses": fake expenses:0 (100% margin) + 7d/30d collapse

`src/hooks/api/use-owner-dashboard-financial.ts` maps every bucket to `expenses:0` / `profit:revenue` (~L83-88) → `chart-area-interactive.tsx` derives a permanent 100% margin. And `timeRangeToMonths` maps `7d/30d → 1` (~L44) → `.slice(-1)` collapses both to a single partial-month bucket. Day-level revenue does not exist in the schema (revenue = monthly expected MRR via `get_revenue_trends_optimized`).

**Fix — Part A + Option 1 (no migration, zero synthetic data):**
- **Part A (real expenses):** in `dashboardFinancialQueries.chartData` queryFn, call `get_expense_summary(p_user_id)` in parallel (`Promise.all`) with the revenue RPC; build `const expenseByMonth = new Map(monthly_totals.map(r => [r.month, r.amount]))`; replace the `expenses:0`/`profit:revenue` lines with `expenses: expenseByMonth.get(item.month) ?? 0, profit: (item.revenue ?? 0) - (expenseByMonth.get(item.month) ?? 0)`. Both RPCs key months `'YYYY-MM'`, both dollars — join cleanly. `chart-area-interactive.tsx` needs no change for Part A (it derives totals/margin from data).
- **Option 1 (kill the collapse):** replace the meaningless sub-month `7d/30d` toggles with month windows `3M/6M/1Y → 3/6/12` in `timeRangeToMonths` + the `FinancialTimeRange` union (hook) and the `ToggleGroupItem`/`SelectItem` set + `useState` default + the mobile `1y→6m` effect in `chart-area-interactive.tsx`. Mirrors the sibling `revenue-expense-chart.tsx`. Every range then yields a distinct multi-bucket monthly series.

`owner-dashboard-keys.ts` `financial.chartData(year, timeRange, months)` signature already accommodates new `timeRange` values (just re-keys the cache). GOTCHA: use `monthly_totals` (per-bucket), NOT `total_amount` (period scalar). **Tests:** hook queryFn test (`vi.hoisted` mock of `supabase.rpc` returning both jsonb payloads) asserting non-zero `expenses` per month, `profit === revenue - expenses`, margin ≠ 100%, and distinct slice lengths per range. MIGRATION = no.

---

## MISC-01 — bulk-import: forced-USD currency + silently-coerced invalid status

- **(a) lease `rent_currency` dropped:** `src/components/leases/bulk-import-config.ts` (~L67-70) `leaseImportSchema = leaseInputSchema.omit({ lease_status: true, rent_currency: true })` strips the CSV value → RPC default "USD" always wins. **Fix:** remove `rent_currency: true` from the `.omit`; update the `LeaseImportInput` type alias to `Omit<LeaseInput, "lease_status">`; refresh the stale block comment. `mapRow`/`insertRow` are unchanged and now actually forward the currency; the shared `.min(3).max(3)` guard now rejects malformed codes client-side too.
- **(b) invalid status → default (tenants + units; leases have no status column, N/A):**
  - `src/components/tenants/bulk-import-config.ts` (~L66,L82-90): delete `ALLOWED_STATUSES` set; `mapRow` → pass non-blank status through (`...(rawStatus ? { status: rawStatus } : {})`); schema stays `z.enum(TENANT_ACTIVE_STATUSES).default("active")` so invalid FAILS the row, blank defaults.
  - `src/components/units/bulk-import-config.ts` (~L43,L53-57): delete `type UnitStatus` + `normalizeStatus`; add `const unitImportSchema = unitInputSchema.extend({ status: unitStatusSchema.default("available") })` (both already imported); `schema: unitImportSchema`; `mapRow` passes non-blank status through. Keep the `BulkImportParseResult<UnitInput>` annotation (covariant); if the typechecker balks, switch to `type UnitImportInput = z.infer<typeof unitImportSchema>` per the leases/tenants pattern.

**Tests (2 existing tests ASSERT THE BUG — rewrite, don't supplement):** `tenants/__tests__/bulk-import-config.test.ts` `'defaults unknown status … "active"'` and `units/__tests__/bulk-import-config.test.ts` `'defaults unknown status … "available"'` → flip to "rejects unknown status (parsed null, error field 'status')". Add lease tests: non-USD currency imports that currency; malformed 2-letter code fails the row; blank → USD. MIGRATION = no.

---

## MISC-02 — continuous blog runner: 3 script bugs (dormant runner — kill-switch ON)

1. **Kill-switch ignored:** `scripts/run-continuous-blog.ts` never calls `isFactoryStopped()` — `main()` (~L87) jumps straight to `acquireLock`. **Fix:** import `isFactoryStopped, STOP_SENTINEL_PATH` from `./run-scheduled-blog`; make an `if (isFactoryStopped()) { console.log(...); return 0; }` the FIRST statement in `main()` (before env check + lock), mirroring the sibling.
2. **`acquireLock` TOCTOU (unconditional `rmSync` of an observed-stale lock):** `scripts/run-scheduled-blog.ts` (~L123-140) — two racers both `rmSync` then re-create → both hold the lock; also `readFileSync` in the catch can `ENOENT`-escape. **Fix (atomic-rename fence):** add `renameSync` to the `node:fs` import; rewrite `acquireLock` to: `wx` fast-path; on failure read holder (guarded — a vanished file → return false, don't steal); live holder → false; stale → write pid to a private `${lockPath}.${pid}.${process.hrtime.bigint()}.tmp`, `renameSync` it over the lock, then read-back-verify `=== pid`. Signature unchanged (callers/tests unaffected). All 5 existing lock tests stay green.
3. **Slug-brand gate on the PRE-override slug:** `scripts/generate-blog-draft.ts` — `slug_brand_match` runs inside `generateValidDraft` on the model slug (~L557-567,L1138); `applySlugOverride` swaps the slug AFTER (~L1437). A `-vs-` override can ship a title naming neither brand. **Fix:** immediately after `draft = applySlugOverride(draft, slugOverride)`, if `slugOverride !== undefined` re-run `runGates(draft, gateCtx)` filtered to non-`ADVISORY_GATES`; if any remain, `fail(...)` (exits 1, fails closed). Content is byte-identical since the last passing gate → only slug-derived gates can newly trip. `gateCtx` already in scope.

**Tests:** export `main` from `run-continuous-blog.ts`; test `BLOG_FACTORY_OFF=1` → `main()` resolves 0 + lock never created. `run-scheduled-blog.test.ts`: keep the 5; add a "reclaim never steals a now-live lock" regression. `generate-blog-draft.test.ts`: compose `applySlugOverride` + `gateNames` to prove pre-override skips `slug_brand_match` but post-override catches it. MIGRATION = no.

---

## MISC-03 — script hygiene

1. **`scripts/db-types.sh` merges stderr into the types file:** (~L26) `supabase gen types … >"$tmp" 2>&1` then `mv "$tmp"` → a CLI warning contaminates `src/types/supabase.ts`. **Fix:** route stderr to its own `err=$(mktemp …)` file (`2>"$err"`); the failure handler `cat`s `$err`; add a guard: if `[ -s "$err" ]` (exited 0 but wrote stderr) → print + exit 1, leave `$DEST` unmodified; update the `trap` to clean both temps.
2. **`scripts/verify-seeds.sh` queries dropped schema** (`property_owners`, `property_owner_id`, `seed_versions`): **RETIRE it (delete the file).** It's orphaned (nothing in `package.json`/CI/scripts invokes it — grep `verify-seeds` finds only planning docs), and its subject (the `supabase/seeds/*.sql` files) is *also* written against the dropped schema, so "updating" it would verify data that can never seed. **Follow-up (OUT OF SCOPE — flag, do not fold in):** `supabase/seeds/*.sql` + `db:seed:{smoke,dev,perf}` in `package.json` are stale against the current schema; separate cleanup ticket.

No shell test harness in the repo — manual-verify note only. MIGRATION = no.

---

## MISC-04 — repo↔prod migration drift for `request_account_deletion` (orchestrator-owned; needs MCP)

Repo's last def (`supabase/migrations/20260311210000_request_deletion_validate_owner.sql`) references DROPPED `users.user_type` + `public.rent_due` — a fresh `db reset` builds a function that runtime-errors on the first owner call. Live is correct. **Fix:** new migration `supabase/migrations/<prod-ts>_reconcile_request_account_deletion.sql` with the VERBATIM live def (fetched via MCP). `CREATE OR REPLACE` on the unchanged `()` signature preserves ACLs (don't re-add grants). Apply via MCP `apply_migration` (idempotent no-op on prod), then reconcile the repo filename to the prod-assigned timestamp via `list_migrations`. No `db:types` regen (signature unchanged). **Verbatim live body:**
```sql
CREATE OR REPLACE FUNCTION public.request_account_deletion()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.users
  set deletion_requested_at = now()
  where id = v_user_id;

  if not found then
    raise exception 'user not found';
  end if;
end;
$function$;
```

---

## Execution waves (all DISJOINT file sets — Wave 1 fully parallel)

- **Plan A — TZ-01** (creates `src/lib/formatters/date.ts` helpers + 12 sites + `documents-vault.client.tsx` import swap + tests)
- **Plan B — TZ-02** (`reports-utils.ts` + test)
- **Plan C — TZ-03** (`use-owner-dashboard-financial.ts`, `chart-area-interactive.tsx`, `owner-dashboard-keys.ts` + test) — disjoint from A (`revenue-area-chart.tsx` ≠ these)
- **Plan D — MISC-01** (3 bulk-import-config.ts + tests)
- **Plan E — MISC-02** (3 scripts + tests)
- **Plan F — MISC-03** (`db-types.sh` + delete `verify-seeds.sh`)
- **Plan G — MISC-04** — ORCHESTRATOR (MCP migration + reconcile) — runs alongside, not delegated.

Executors: do NOT run git/bun/tsc/vitest/biome — orchestrator does the authoritative combined verify + commits. Zero-tolerance rules apply (no `any`/`as unknown as`/barrel/string-literal query keys; `differenceInCalendarDays` from date-fns; Lucide icons; no inline styles).
