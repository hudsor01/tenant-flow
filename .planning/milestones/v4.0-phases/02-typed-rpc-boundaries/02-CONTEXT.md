# Phase 2: Typed RPC Boundaries - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning
**Source:** Re-scoped after live-code verification + user decision (full Zod validation)

<domain>
## Phase Boundary

Convert the **phase's named RPC/PostgREST read+write boundaries** to typed mappers with **field-level Zod validation**, and add a drift guard so the rule-#8 `as unknown as` violation cannot silently return.

**Critical reality check (verified 2026-06-05):** The `as unknown as` double-casts the 2026-05-29 audit flagged are ALREADY GONE — the only 2 matches in `src/hooks` are in comments. Since the audit, the code gained:
- `src/lib/rpc-shape.ts` — `jsonObject<T>()`/`jsonArray<T>()` do STRUCTURAL validation (throw if not object/array) then `return data as T`. NOT field-level validation.
- `tenant-mappers.ts` — `mapTenantRow` typed shaping function, but NO Zod `safeParse`.
- `maintenance-keys.ts` — still raw `data as MaintenanceRequest[]` (no mapper, no validation).

So the rule-#8 violation is resolved; what remains for the phase's success criteria ("typed mapper WITH Zod validation") is the field-level validation + the drift guard.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Scope — IN (the phase requirements only)
- **TYPE-01:** `src/hooks/api/use-analytics.ts` — the `LeaseAnalyticsPageData` paths (`{} as LeaseAnalyticsPageData` fallbacks at :64/:150 + the `jsonObjectOrEmpty<LeaseAnalyticsPageData>` returns). Replace with a typed mapper that field-validates via Zod `safeParse` and falls back safely on invalid/empty.
- **TYPE-02:** `src/hooks/api/query-keys/tenant-mutation-options.ts` (`created as Tenant` :39, `updated as Tenant` :63, the `updated as TenantPostgrestRow` :139) AND `src/hooks/api/query-keys/maintenance-keys.ts` (the raw `as MaintenanceRequest`/`as MaintenanceRequest[]` casts at :89/:112/:156/:206/:280/:312/:338). Route through typed mappers with Zod field validation. Upgrade the existing `mapTenantRow` in `tenant-mappers.ts` to validate (it currently shapes without `safeParse`).
- **TYPE-03:** `src/components/dashboard/expiring-leases-widget.tsx` (the `Row[]` cast at ~:71) → validated mapper. PLUS a drift-guard test asserting **zero `as unknown as`** at PostgREST/RPC boundaries under `src/hooks/api/` (library-shim casts in chart-tooltip/slider excluded), and `bun run typecheck` stays clean.

### Full-Zod standard (LOCKED — user chose "Full Zod validation")
- Each mapper validates the enum-shaped + NOT-NULL fields via Zod `safeParse` (mirror `mapDocumentRow` in `document-keys.ts` — the canonical reference CLAUDE.md cites: `requireString` throws on missing NOT-NULL, enum fields validated). Use Zod `safeParse` for enum/shape fields; throw on missing NOT-NULL.
- Nullable-in-DB fields stay nullable (don't over-validate — match the real column nullability, like `mapDocumentRow` does for `created_at`).
- No `as unknown as`. Plain `as Type` at the boundary is replaced by the mapper's validated return.

### Scope — OUT (explicitly deferred, NOT this phase)
- The broader `as Type` cast surface across the data layer — `property-keys.ts`, `lease-keys.ts`, `use-vendor.ts`, `expense-keys.ts`, `blog-keys.ts`, `session-keys.ts`, `subscription-verification-keys.ts`, `use-auth.ts`, `use-tour-progress.ts`. These share the plain-`as` pattern but are NOT in the TYPE-01/02/03 requirements. Converting all ~14 files would be a data-layer-wide rewrite beyond this phase. Flag as a candidate future phase; do NOT touch here.

### Claude's Discretion
- Where to place the new schemas/mappers (co-locate next to the existing mapper in the relevant `query-keys/*.ts` / a `*-mappers.ts`, following `tenant-mappers.ts` precedent).
- Whether the analytics `LeaseAnalyticsPageData` (a nested aggregate shape) gets a full Zod object schema or a targeted validator for its enum/numeric fields — pick the pragmatic validation depth that catches real RPC drift without over-engineering a deep nested schema.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The validated-mapper pattern (the standard to mirror)
- `src/hooks/api/query-keys/document-keys.ts` — `mapDocumentRow` (CLAUDE.md's cited reference): `requireString` throws on missing NOT-NULL, enum-shaped fields validated, nullable fields left nullable.
- `src/hooks/api/query-keys/document-category-keys.ts` — `mapDocumentCategoryRow` (slug regex validation, non-null treatment per DEFAULT+trigger).

### Existing partial work to upgrade
- `src/hooks/api/query-keys/tenant-mappers.ts` — `mapTenantRow` (shapes but doesn't Zod-validate; add validation).
- `src/lib/rpc-shape.ts` — `jsonObject`/`jsonArray` structural guards (the boundary the analytics path uses today).

### Types
- `src/types/` — browse for `Tenant`, `TenantWithLeaseInfo`, `MaintenanceRequest`, `LeaseAnalyticsPageData`, the expiring-leases `Row` shape before defining any schema (CLAUDE.md type-lookup order — no duplicate types).
</canonical_refs>

<specifics>
## Specific Ideas
- The drift-guard test (TYPE-03) should scan `src/hooks/api/**` source for `as unknown as` and fail on any match outside an explicit allowlist (chart-tooltip/slider library shims live in `src/components/ui/`, not `src/hooks/api/`, so the hooks/api scan is naturally clean — pin it).
- Mirror the Phase-1 drift-guard test style (`workflow-pins.test.ts`) — filesystem read, actionable `file:line` failure messages.
</specifics>

<deferred>
## Deferred Ideas
- Data-layer-wide `as Type` → validated-mapper conversion (property/lease/vendor/expense/blog/session/auth/tour-progress) — a future "Typed Data Layer" phase if desired.
</deferred>

---

*Phase: 02-typed-rpc-boundaries*
*Context gathered: 2026-06-05 — re-scoped after live verification; user locked "full Zod validation" for the phase's named boundaries.*
