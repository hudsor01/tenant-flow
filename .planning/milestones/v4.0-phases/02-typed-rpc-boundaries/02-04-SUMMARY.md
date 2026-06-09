# Plan 02-04 Summary — Expiring-Leases Mapper + RPC-Boundary Drift Guard (TYPE-03)

**Status:** Complete
**Branch:** gsd/phase-2-typed-rpc-boundaries
**Commits:** `1a7217904` (feat: mapper + widget + mapper test), `ff3ed8fa9` (test: drift guard)

## What shipped
- `src/components/dashboard/expiring-leases-mapper.ts` — `mapExpiringLeaseRow(raw: unknown): ExpiringLeaseRow` with Zod field validation (mirrors `mapDocumentRow`). Reuses the existing `ExpiringLeaseRow` type — no duplicate.
- `src/components/dashboard/expiring-leases-widget.tsx` — the `Row[]` cast replaced with `(data ?? []).map(mapExpiringLeaseRow)`. No `as unknown as`, no `as Row[]`.
- `src/components/dashboard/expiring-leases-mapper.test.ts` — mapper unit coverage (valid→mapped, invalid/missing→handled).
- `src/lib/__tests__/rpc-boundary-cast-pins.test.ts` — TYPE-03 drift guard: filesystem scan of `src/hooks/api/**` (production `.ts`/`.tsx`), FAILS on any `as unknown as` outside `*.test.ts`/`*.spec.ts` + wholly-comment lines. Mirrors `workflow-pins.test.ts` (sanity "finds files to guard" assertion + actionable `file:line → snippet` failures).

## Verification
- 7/7 unit tests pass (mapper + drift guard). `bun run typecheck` clean; `biome` clean. Full lefthook gate passed on both commits — no `--no-verify`.
- **Drift guard proven load-bearing:** planted a temporary `as unknown as` under `src/hooks/api/` → the guard FAILED with `__drift_probe_tmp.ts:1 → …: expected [Array(1)] to deeply equal []`; removed the probe → guard passes clean. It is not a false-green.

## Recovery note
The first 02-04 executor run dropped on an API ConnectionRefused mid-execution. Its uncommitted work was on disk (mapper + widget edit + both tests) plus a leftover `__driftProbe` (`as unknown as number`) it had planted in `property-stats-keys.ts` to verify the guard. On resume: reverted the stray probe (`git restore property-stats-keys.ts`), re-ran the verification cleanly (incl. the load-bearing proof above), fixed one biome format nit, and committed. No duplicate work; no out-of-scope file left modified.

## Scope
Only `expiring-leases-widget.tsx` + the new mapper + the drift-guard test. No out-of-scope files touched (property-stats probe reverted to clean).
