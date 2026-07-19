# Phase 51 Research — Code Hygiene
_Fix-approach research + will-fix validation for HYG-01..40. Source: .planning/audits/2026-07-11-full-audit.md_

## HYG-01 — Static remote Unsplash background on contact page
- **Finding:** src/components/contact/contact-form.tsx:191 (medium) — inline `style={{ backgroundImage: "url('https://images.unsplash.com/...')" }}` = rule-5 inline style AND a remote stock-photo that vercel.json CSP (`img-src 'self' data: blob: https://*.supabase.co`) blocks, so the background never renders anyway.
- **Root cause:** A hardcoded third-party stock photo was baked into an inline style on the contact hero's `.absolute.inset-0.bg-cover.bg-center` div (lines 189-195). It violates rule 5, the brand "generated-art-only" stance, and is dead at runtime under the CSP.
- **Fix:** Delete the `style={{ backgroundImage: … }}` attribute and the Unsplash dependency. Replace the image div's `bg-cover bg-center` with a brand gradient utility built from existing tokens (e.g. `bg-gradient-to-br from-primary/10 via-background to-accent/10`), so the hero keeps a branded backdrop with zero remote assets and no inline style. The existing overlay div at line 196 (`bg-linear-to-br from-background/30 …`) stays and layers on top.
- **Why it fixes it:** Removes the rule-5 inline style AND the CSP-blocked remote host in one change; the verifier's exact concern (inline style + `images.unsplash.com` not in `img-src`) is eliminated because the background becomes token-driven CSS classes served from `'self'`.
- **Risks / interactions:** Purely visual; confirm contrast of the foreground glass card (line 198) against the gradient in light+dark. Phase 44 (PUBUX) touches public marketing pages and may already restyle this hero — rebase on the phase-44 tree and re-confirm the finding still reproduces before editing.
- **Files touched:** src/components/contact/contact-form.tsx

## HYG-02 — Inline "expiring-enriched" lease query key in a dashboard component
- **Finding:** src/components/dashboard/expiring-leases-widget.tsx:29 (medium) — `queryOptions({ queryKey: [...leaseQueries.all(), "expiring-enriched", 60], … })` defined in the component; rule-9 violation, invisible to factory-directory invalidation audits.
- **Root cause:** A bespoke enriched-expiring query (FK-joined tenant/unit/property, mapped via `mapExpiringLeaseRow`) was written inline instead of as a factory alongside the sibling `leaseQueries.expiring(days)` (lease-keys.ts:117).
- **Fix:** Add `expiringEnriched: (days = 60) => queryOptions({ queryKey: [...leaseQueries.all(), "expiring-enriched", days], queryFn, staleTime })` to `leaseQueries` in `src/hooks/api/query-keys/lease-keys.ts`, moving the queryFn body from the widget. Relocate the mapper `src/components/dashboard/expiring-leases-mapper.ts` (its `ExpiringLeaseRow` type + `mapExpiringLeaseRow`) into the query-keys layer as `src/hooks/api/query-keys/expiring-leases-mapper.ts` so lease-keys.ts imports it without a components→query-keys back-import. **Move the co-located Vitest file with it** — `src/components/dashboard/expiring-leases-mapper.test.ts` → `src/hooks/api/query-keys/expiring-leases-mapper.test.ts`; its sole import (`import { mapExpiringLeaseRow } from "./expiring-leases-mapper"`, line 16) is relative, so moving the test alongside the mapper keeps that path valid with no edit. The only other importer of the mapper is the widget itself (`expiring-leases-widget.tsx:19-22`, `type ExpiringLeaseRow` + `mapExpiringLeaseRow`), and it stops importing the mapper entirely once it consumes `useQuery(leaseQueries.expiringEnriched())` (the queryFn/mapper move into the factory). After the move, grep for `./expiring-leases-mapper` and `dashboard/expiring-leases-mapper` must return zero stale references.
- **Why it fixes it:** The cache entry now lives in a `queryOptions()` factory in `src/hooks/api/query-keys/`, so it is discoverable when auditing lease invalidation coverage — exactly the gap the verifier cited (`use-lease-mutations.ts` invalidates `leaseQueries.lists()`/`stats()` but not this key). Relocating the mapper's test in the same commit closes the validator's objection: no `import "./expiring-leases-mapper"` is left dangling, so unit tests + typecheck stay green.
- **Risks / interactions:** Keep the key literal identical (`"expiring-enriched"`, default 60) so no cache-key change. The two mapper importers (widget + co-located test) are BOTH accounted for in the move — the widget drops its import (consumes the factory), the test travels with the mapper (relative path unchanged). Consider having lease mutations also invalidate `[...leaseQueries.all(), "expiring-enriched"]` (behavior improvement, optional). Phase 42 (DASH) edits dashboard widgets — rebase; if DASH already relocated this query, mark no_change_needed.
- **Files touched:** src/hooks/api/query-keys/lease-keys.ts, src/components/dashboard/expiring-leases-widget.tsx, src/hooks/api/query-keys/expiring-leases-mapper.ts (new — moved from src/components/dashboard/expiring-leases-mapper.ts, which is deleted), src/hooks/api/query-keys/expiring-leases-mapper.test.ts (new — moved from src/components/dashboard/expiring-leases-mapper.test.ts, which is deleted)

## HYG-03 — Duplicate `UnitWithProperty` in lease-utils vs relations.ts
- **Finding:** src/components/leases/table/lease-utils.ts:15 (medium) — `UnitWithProperty extends Unit { property?: Property }` collides with `src/types/relations.ts:135` `UnitWithProperty extends Unit { property: Property; leases: [...] }` (optional vs required `property`, missing `leases`).
- **Root cause:** A partial API-response shape (optional property, no leases) was given the same exported name as the canonical fully-hydrated relation type.
- **Fix:** Rename the lease-utils local to a distinct name — `UnitWithOptionalProperty` (or `LeaseTableUnit`). Update its internal use in `LeaseWithNestedRelations` (lease-utils.ts:22) and the only external importer `src/hooks/api/__tests__/use-lease.test.tsx` (lines 26, 1022). The canonical `relations.ts` `UnitWithProperty` is untouched.
- **Why it fixes it:** Eliminates the same-name/incompatible-shape collision the verifier flagged; the two shapes now have distinct names, so no import path resolves to the wrong optionality.
- **Risks / interactions:** Rename-only, no shape change. Phase 40 (TYPE) may already consolidate this — rebase and re-verify.
- **Files touched:** src/components/leases/table/lease-utils.ts, src/hooks/api/__tests__/use-lease.test.tsx

## HYG-04 — Three inline query keys in the lease-wizard selection step
- **Finding:** src/components/leases/wizard/selection-step.tsx:83/101/126 (medium) — inline `[...propertyQueries.all(),"list"]`, `[...unitQueries.all(),"by-property",property_id,"available"]`, `[...tenantQueries.all(),"list-for-lease"]`; rule-9. Worse, line 83's key is byte-identical to `propertyQueries.lists()` (property-keys.ts:33) yet caches a partial-column `Property[]` rather than `PaginatedResponse<Property>`, so a prefix-scoped read against `lists()` sees two incompatible shapes.
- **Root cause:** Three bespoke option-list queries hand-assembled keys in the component; the property one collides with the paginated `lists()` namespace.
- **Fix:** Add three `queryOptions()` factories:
  - `propertyQueries.selectOptions()` keyed `[...propertyQueries.all(), "select-options"]` (NOT under `lists()`) returning the partial `Property[]` — resolves the namespace collision.
  - `unitQueries.availableByProperty(propertyId)` keyed `[...unitQueries.all(), "by-property", propertyId, "available"]`.
  - `tenantQueries.listForLease()` keyed `[...tenantQueries.all(), "list-for-lease"]`.
  Move each queryFn body into the factory; the component consumes `useQuery(factory)`.
- **Why it fixes it:** All three keys become auditable factories in `src/hooks/api/query-keys/`, and the property list no longer shares the `["properties","list"]` prefix with `propertyQueries.list()` — directly closing the shape-collision the verifier described against `useEntityDetail`'s prefix `getQueriesData`.
- **Risks / interactions:** Changing line-83's key from `["properties","list"]` to `["properties","select-options"]` is the point (decouples caches); confirm nothing else reads the old literal (grep shows none). Same class as HYG-02/05/25. Phase 38 (FORM)/40 (TYPE) touch wizard code — rebase.
- **Files touched:** src/components/leases/wizard/selection-step.tsx, src/hooks/api/query-keys/property-keys.ts, src/hooks/api/query-keys/unit-keys.ts, src/hooks/api/query-keys/tenant-keys.ts

## HYG-05 — Inline expenses query key duplicated within maintenance detail
- **Finding:** src/components/maintenance/detail/maintenance-details.client.tsx:43 and 73 (medium) — `[...maintenanceQueries.all(), id, "expenses"]` hand-built in the useQuery (43) and re-typed in `handleRefresh` invalidate (73); no factory in maintenance-keys.ts; expense mutations (`expenseKeys.all`) never prefix-match this key.
- **Root cause:** A maintenance-scoped expenses query was inlined with a literal key repeated in two places, with no factory.
- **Fix:** Add `expenses: (id: string) => queryOptions({ queryKey: [...maintenanceQueries.all(), id, "expenses"], queryFn, enabled: !!id })` to `maintenanceQueries` in `src/hooks/api/query-keys/maintenance-keys.ts` (move the `expenses` select + `.neq('status','inactive')` body). The component uses `useQuery(maintenanceQueries.expenses(id))` and `handleRefresh` invalidates `maintenanceQueries.expenses(id).queryKey`. Additionally, close the invalidation gap: have `useCreateExpenseMutation`/`useDeleteExpenseMutation` (src/hooks/api/use-expense-mutations.ts) also invalidate `maintenanceQueries.all()` (or `maintenanceQueries.expenses(maintenance_request_id)`), so a soft-deleted expense refreshes this list.
- **Why it fixes it:** The single literal is replaced by one factory used in both read and invalidate seams (no hand-sync), and the mutation invalidation now reaches it — resolving both the rule-9 violation and the concrete stale-list bug the verifier identified.
- **Risks / interactions:** Keep the key literal identical. Adding `maintenanceQueries.all()` to expense mutations is a small broadening; acceptable. Phase 39 (DATA)/42 (DASH) may touch maintenance queries — rebase.
- **Files touched:** src/hooks/api/query-keys/maintenance-keys.ts, src/components/maintenance/detail/maintenance-details.client.tsx, src/hooks/api/use-expense-mutations.ts

## HYG-06 — Duplicate maintenance `TimelineEvent` shadowing the section type
- **Finding:** src/components/maintenance/detail/maintenance-utils.ts:72 (medium) — a second maintenance `TimelineEvent` (6-value inline union, `user?`) duplicates `src/types/sections/maintenance.ts:105` `TimelineEvent` (`MaintenanceTimelineEventType`, `actor?`); timeline-card.tsx:3 imports the duplicate.
- **Root cause:** `generateTimeline()` was typed against a locally-declared `TimelineEvent` instead of the canonical section type.
- **Fix:** Delete the local `TimelineEvent` (maintenance-utils.ts:72-85) and import the canonical from `#types/sections/maintenance`; type `generateTimeline()`'s return as that. Point `src/components/maintenance/detail/timeline-card.tsx:3` at `#types/sections/maintenance` for `TimelineEvent` (rule 2 forbids re-exporting through maintenance-utils). Verified compatible: `generateTimeline` only emits `type` values `created|scheduled|status_change|completed` (all ⊂ the 8-value `MaintenanceTimelineEventType`) and never sets `user`/`actor`; timeline-card renders only `id/type/title/description/timestamp`, so the `user?`→`actor?` difference has no runtime touchpoint.
- **Why it fixes it:** Removes the duplicate name entirely; the maintenance timeline now has one type in `src/types`, resolving the rule-3 violation the verifier cited.
- **Risks / interactions:** None functional (no field references `user`/`actor`). Do NOT rename the section `TimelineEvent` here — it stays canonical for maintenance; see HYG-24 for the lease sibling. Phase 40 (TYPE)/41 (COMP) may pre-touch — rebase.
- **Files touched:** src/components/maintenance/detail/maintenance-utils.ts, src/components/maintenance/detail/timeline-card.tsx

## HYG-07 — Parallel duplicate `Property`/`Unit`/`PropertyType`/`PropertySummary` view-model system
- **Finding:** src/components/properties/types.ts:34/23/3/54 (medium) — camelCase presentation types re-use canonical names: `Property`/`Unit` (core.ts:120/121), lowercase `PropertyType` (vs uppercase constants union), and portfolio-totals `PropertySummary` (vs relations.ts:235 single-card shape).
- **Root cause:** A design/view-model layer was authored with names identical to the canonical DB-row/domain types; property-transforms.ts already had to alias (`PropertyType as DesignPropertyType`) to disambiguate.
- **Fix:** Rename the four colliding exports to `Design*` names (consistent with the existing `DesignPropertyType` alias): `PropertyType`→`DesignPropertyType`, `Property`→`DesignProperty`, `Unit`→`DesignUnit`, `PropertySummary`→`PortfolioSummary`. Update internal references in the file (`PropertiesProps`, `PropertiesListProps`, `PropertyDetailProps`, `Property.units: Unit[]`, `PropertiesSummary` alias) and the two external consumers: `src/stores/properties-store.ts:15` (imports `PropertyType`) and `src/app/(owner)/properties/components/property-transforms.ts:1-6` (imports `PropertyType as DesignPropertyType`, `PropertyItem`, `PropertySummary` — drop the now-redundant alias).
- **Why it fixes it:** Each design view-model gets a distinct, intent-revealing name, so `import { Property }`/`{ Unit }`/`{ PropertyType }`/`{ PropertySummary }` can no longer resolve to two incompatible shapes — the exact rule-3 trap the verifier described.
- **Risks / interactions:** Footprint is smaller than the finding claims — only 2 external importers (grep-confirmed), not the 6 listed. Several interfaces in this file (`Property`, `Unit`, `PropertiesProps`, `AddPropertyModalProps`, etc.) appear entirely unused and could be pruned as a follow-up. Phase 40 (TYPE)/41 (COMP)/42 (DASH) may pre-touch properties types — rebase and re-verify.
- **Files touched:** src/components/properties/types.ts, src/stores/properties-store.ts, src/app/(owner)/properties/components/property-transforms.ts
- **Decision:** Chosen: rename to `Design*`/`PortfolioSummary` (lowest churn, preserves the camelCase view-model layer). Alternative: delete this file and migrate the 2 consumers to canonical `Tables<>` DB types — rejected as far higher blast radius since the shapes are camelCase presentation models, not DB rows.

## HYG-08 — Inline `maxWidth:"28rem"` dead-codes `sm:max-w-80` on the tenant sheet
- **Finding:** src/components/tenants/tenant-detail-sheet.tsx:66 (medium) — `style={{ maxWidth: "28rem" }}` on the div whose className (65) declares `sm:max-w-80` (20rem); inline wins at every breakpoint, so the class is dead and the two widths silently conflict.
- **Root cause:** A static max-width was applied inline, overriding (and dead-coding) the responsive Tailwind utility on the same element.
- **Fix:** Remove the `style={{ maxWidth: "28rem" }}` attribute and the dead `sm:max-w-80` from the className; add `max-w-md` (Tailwind's exact 28rem) to the className. Net effective width (`min(75vw, 28rem)`) is preserved.
- **Why it fixes it:** Removes the rule-5 inline style and the silent class/inline conflict the verifier flagged, using the exact-equivalent utility.
- **Risks / interactions:** None (identical computed width). Phase 41 (COMP) may restyle the sheet — rebase.
- **Files touched:** src/components/tenants/tenant-detail-sheet.tsx

## HYG-09 — Duplicate `LeaseFilters` (lease-keys vs api-contracts)
- **Finding:** src/hooks/api/query-keys/lease-keys.ts:15 (medium) — local `LeaseFilters` (`unit_id`/`search`) collides with `src/types/api-contracts.ts:237` `LeaseFilters` (`start_date`/`end_date`).
- **Root cause:** Two same-named filter interfaces drifted; the api-contracts copy is dead (grep: zero importers) and structurally wrong (has `start_date`/`end_date` the query never uses; lacks `unit_id`/`search` the query DOES use).
- **Fix:** Delete the dead `LeaseFilters` from `src/types/api-contracts.ts:237-245`. The active lease-keys local (which matches the real `leaseQueries.list` filters) becomes the single definition. No consumer change.
- **Why it fixes it:** Eliminates the duplicate by removing the unused, divergent copy; the surviving definition is the one the queries actually use, so no shape reconciliation risk.
- **Risks / interactions:** Verified no importer of api-contracts `LeaseFilters`. Phase 39 (DATA)/40 (TYPE) may touch these — rebase.
- **Files touched:** src/types/api-contracts.ts
- **Decision:** See class Decision under Cross-cutting notes ("dead-src/types-copy deletion vs relocate-into-src/types") — applies to HYG-09/10/11/12/16/33/34/39.

## HYG-10 — Duplicate `SignatureStatus` (lease-keys vs api-contracts)
- **Finding:** src/hooks/api/query-keys/lease-keys.ts:26 (medium) — local `SignatureStatus` (`status`/`sent_for_signature_at`/`both_signed`) collides with `src/types/api-contracts.ts:247` `SignatureStatus` (`owner_signature_ip`/`tenant_signature_ip`).
- **Root cause:** The api-contracts variant (IP-based, from an older RPC shape) is dead; the lease-keys variant is the one every consumer uses (lease-signature-status.tsx, tests, the `signatureStatus` queryFn).
- **Fix:** Delete the dead `SignatureStatus` interface from `src/types/api-contracts.ts:247-255`. Keep lease-keys' active definition. No consumer change.
- **Why it fixes it:** Removes the unused, incompatible copy so no component can compile against IP fields the RPC never returns — the latent trap the verifier described.
- **Risks / interactions:** Grep-confirmed the api-contracts copy has zero importers; the neighboring `SignatureStatusResponse` (api-contracts.ts:257) is a separate type (see HYG-39). Phase 43 (SIGN) edits e-sign code — rebase and re-verify this still reproduces.
- **Files touched:** src/types/api-contracts.ts
- **Decision:** See class Decision (Cross-cutting).

## HYG-11 — Duplicate `LeaseListItem` (lease-keys vs api-contracts)
- **Finding:** src/hooks/api/query-keys/lease-keys.ts:38 (medium) — local `LeaseListItem` (Pick of 10 columns incl. `owner_user_id`/`updated_at`) collides with `src/types/api-contracts.ts:147` `LeaseListItem` (Pick of 8).
- **Root cause:** Two same-named `Pick<Lease,…>` list types drifted; the api-contracts copy is dead (grep: zero importers), the lease-keys copy is used by the `expiring` queryFn (line 120).
- **Fix:** Delete the dead `LeaseListItem` from `src/types/api-contracts.ts:147-157`. Keep the lease-keys definition (matches the `expiring`/`expiring-enriched` column selection). No consumer change.
- **Why it fixes it:** One `LeaseListItem` remains; switching import paths can no longer silently gain/lose columns.
- **Risks / interactions:** Confirm the HYG-02 `expiringEnriched` factory (also in lease-keys.ts) still references the surviving `LeaseListItem` if applicable. Phase 40 (TYPE) may pre-touch — rebase.
- **Files touched:** src/types/api-contracts.ts
- **Decision:** See class Decision (Cross-cutting).

## HYG-12 — Duplicate `PropertyFilters` (property-keys vs relations.ts)
- **Finding:** src/hooks/api/query-keys/property-keys.ts:19 (medium) — local `PropertyFilters` (`status: PropertyStatus`/`property_type`/`search`/`limit`/`offset`) collides with `src/types/relations.ts:275` `PropertyFilters` (`minUnits`/`maxUnits`/`minRent`/`maxRent`/`city`/`state`, hardcoded status union).
- **Root cause:** The relations.ts copy is an aspirational, unused filter shape (grep: only the doc comment appears; the real consumer `use-properties.ts:13` imports the property-keys copy).
- **Fix:** Delete the dead `PropertyFilters` (and its doc comment) from `src/types/relations.ts:272-284`. **Also delete the now-orphaned import** `import type { PropertyType } from "../../src/lib/constants/status-types";` at `relations.ts:7` — grep confirms `PropertyType` is referenced in relations.ts at exactly ONE site, `property_type?: PropertyType` on line 276 inside this interface, so removing `PropertyFilters` strands the import and `noUnusedLocals` fails the typecheck unless line 7 goes too. The property-keys local — which already references canonical `PropertyStatus`/`PropertyType` from `#types/core` — becomes the single definition. No consumer change.
- **Why it fixes it:** Removes the unused, divergent copy; the surviving definition is the one `useProperty`/`propertyQueries.list` actually use. Deleting the paired `PropertyType` import in the same edit closes the validator's objection — no unused `import type` is left behind, so the strict `noUnusedLocals` typecheck stays green.
- **Risks / interactions:** `PropertyApiFilters` (api-contracts.ts:268) is a separate, not-flagged property filter type — leave it. `PropertyType` is imported nowhere else in relations.ts, so removing line 7 cannot break another reference (grep-verified: only lines 7 + 276). Phase 40 (TYPE) may pre-touch — rebase.
- **Files touched:** src/types/relations.ts
- **Decision:** See class Decision (Cross-cutting).

## HYG-13 — `vendorKeys` factory defined outside src/hooks/api/query-keys/
- **Finding:** src/hooks/api/use-vendor.ts:27 (medium) — a full query-key factory (`all`/`lists`/`list`/`details`/`detail`, root `["vendors"]`) lives in the hook file; rule-9 only exempts `authKeys`.
- **Root cause:** The vendor query factory was authored inline in the hook rather than in the factory directory (where its sibling `vendorMutations` already lives, in maintenance-keys.ts:446).
- **Fix:** Create `src/hooks/api/query-keys/vendor-keys.ts` exporting the factory as `vendorQueries` (naming convention parity with `leaseQueries`/`unitQueries`), moving `VENDOR_SELECT_COLUMNS` and `VendorListResponse` with it. `src/hooks/api/use-vendor.ts` imports `vendorQueries` and updates its internal references (list/detail calls and any invalidations). Optionally relocate `vendorMutations` from maintenance-keys.ts into the new vendor-keys.ts for domain cohesion (note: expands scope; keep as a follow-up if minimizing blast radius).
- **Why it fixes it:** The `["vendors"]` keys become visible to invalidation sweeps that browse the factory directory — the exact gap the verifier cited.
- **Risks / interactions:** `vendorKeys` is a module-local `const` (not exported) used only within use-vendor.ts, so relocating is contained. If `vendorMutations` stays in maintenance-keys.ts, ensure its imports still resolve. Phase 39 (DATA)/41 (COMP) may touch vendor code — rebase.
- **Files touched:** src/hooks/api/query-keys/vendor-keys.ts (new), src/hooks/api/use-vendor.ts

## HYG-14 — Module-level Supabase client in use-supabase-upload
- **Finding:** src/hooks/use-supabase-upload.ts:9 (medium) — `const supabase = createClient();` at module scope; violates the "no module-level Supabase client" Hook-Organization rule.
- **Root cause:** The browser client is instantiated as an import-time side effect and shared for the module lifetime, instead of being created inside the function that uses it.
- **Fix:** Delete line 9. The only usage is `supabase.storage` inside `onUpload` (line 90); add `const supabase = createClient();` at the top of `onUpload` (the sole call site). Keep the `import { createClient }` (line 7).
- **Why it fixes it:** Client creation moves inside the callback that uses it, matching every other hook in the codebase and removing the import-time side effect — the precise rule the verifier cited.
- **Risks / interactions:** Trivial; the browser client is effectively a singleton so no behavior change. No other phase touches this file.
- **Files touched:** src/hooks/use-supabase-upload.ts

## HYG-15 — Duplicate `SecurityEventType` (core.ts DB-aligned vs status-types app-monitoring)
- **Finding:** src/lib/constants/status-types.ts:382 (medium) — `SecurityEventType` derived from SECURITY_EVENT_TYPES (snake_case app/WAF vocab: `cors_violation`, `account_takeover`, …) shares zero members with `src/types/core.ts:63` `SecurityEventType` (dot-namespaced, matches the `security_events_event_type_check` DB constraint).
- **Root cause:** Two genuinely different concepts (DB audit-event vocabulary vs app threat-monitoring vocabulary) were given the same exported name.
- **Fix:** Rename the status-types one to a distinct name — `SecurityMonitoringEventType` — and its backing const usage stays (`SECURITY_EVENT_TYPES`). Keep `core.ts`'s `SecurityEventType` (DB-aligned) as canonical.
- **Why it fixes it:** The name collision the verifier flagged is gone; the DB-constraint type and the monitoring-vocabulary type no longer share `SecurityEventType`, so no import can silently type-check against the wrong value set.
- **Risks / interactions:** Grep shows NEITHER `SecurityEventType` nor `SECURITY_EVENT_TYPES` is imported by any consumer — both are currently dormant, so the rename is zero-risk. Phase 50 (ADMIN)/47 (A11Y) unlikely to touch; Phase 40 (TYPE) may — rebase.
- **Files touched:** src/lib/constants/status-types.ts
- **Decision:** Chosen: rename (preserves the monitoring vocabulary for future use). Alternative: delete the status-types `SecurityEventType` + `SECURITY_EVENT_TYPES` const outright as dead code — viable since both are unused, but rename is safer if the monitoring vocab is intended.

## HYG-16 — Duplicate `CreateCheckoutSessionRequest` (core.ts vs stripe-client)
- **Finding:** src/lib/stripe/stripe-client.ts:13 (medium) — local `CreateCheckoutSessionRequest` (`priceId`/`planName`/`tenant_id?`/`source?`) collides with `src/types/core.ts:101` `CreateCheckoutSessionRequest` (required `productName`/`tenantId`/`domain`).
- **Root cause:** The core.ts variant is dead (grep: zero importers) and misleading — it demands fields the stripe-checkout Edge Function never reads (the fn reads `price_id ?? priceId` and `source`), while the stripe-client local matches the real payload.
- **Fix:** Delete the dead `CreateCheckoutSessionRequest` interface from `src/types/core.ts:101-109`. The stripe-client local (accurate to the Edge Function contract) becomes the single definition. No consumer change.
- **Why it fixes it:** Removes the unused, wrong-shape copy so a developer can't build a checkout payload from a type the backend ignores — the concrete hazard the verifier described.
- **Risks / interactions:** Confirm the neighboring `StripeSessionStatusResponse` in core.ts is untouched. Phase 36 (BILL) edits Stripe/checkout code — rebase and re-verify this still reproduces (BILL may already delete it).
- **Files touched:** src/types/core.ts
- **Decision:** See class Decision (Cross-cutting).

## HYG-17 — Duplicate `BillingInterval` (currency.ts vs stripe.ts)
- **Finding:** src/lib/utils/currency.ts:8 (medium) — `BillingInterval = "monthly"|"annual"|"month"|"year"` collides with `src/types/stripe.ts:25` `BillingInterval = BillingPeriod` (`"monthly"|"annual"`).
- **Root cause:** The currency formatter legitimately needs the 4-value union (it also accepts Stripe's raw `"month"`/`"year"` intervals), but it was given the same name as the 2-value stripe-side type.
- **Fix:** Rename currency.ts's export to a distinct, intent-revealing name — `PriceInterval` — and update its two internal uses (`PriceFormatOptions.interval`, line 20; `getIntervalSuffix(interval)`, line 119). Keep `stripe.ts`'s `BillingInterval` (= `BillingPeriod`) canonical.
- **Why it fixes it:** The name collision is removed; a `"month"`/`"year"` value can no longer be mistaken for the stripe-side 2-value type in a switch/`assertNever` — the divergence the verifier flagged.
- **Risks / interactions:** Grep confirms currency's `BillingInterval` has no external importers (used only within currency.ts), so blast radius is one file. Phase 36 (BILL) may touch currency/pricing — rebase.
- **Files touched:** src/lib/utils/currency.ts
- **Decision:** Chosen: rename currency's to `PriceInterval`. Alternative: `import type { BillingPeriod } from "#types/stripe"` and define `type PriceInterval = BillingPeriod | "month" | "year"` to link them — slightly better but adds a cross-module import for negligible gain.

## HYG-18 — Validation file re-exports duplicate `Lease`/`LeaseUpdate`/`LeaseFormData`
- **Finding:** src/lib/validation/leases.ts:217/218/265 (medium) — `Lease` dup of core.ts:123, `LeaseUpdate` dup of api-contracts.ts:214, `LeaseFormData` collides with lease-generator.types.ts:79.
- **Root cause:** zod-inferred types were exported under names already owned by canonical DB-row/update types and an unrelated PDF-payload type.
- **Fix:** (a) `Lease` (217): dead (no external importer) → delete the export. (b) `LeaseUpdate` (218): used by `lease-mutation-options.ts:19` → rename to `LeaseUpdateInput`; update that import. (c) `LeaseFormData` (265): no external importer (only internal `transformLeaseFormData`/`LeaseCreateFormData`) → rename to `LeaseFormValues` (or drop `export`); update the internal `transformLeaseFormData` param.
- **Why it fixes it:** No two importable types share `Lease`/`LeaseUpdate`/`LeaseFormData` anymore; the zod "validated update input" keeps a distinct name from the DB `TablesUpdate<"leases">`, satisfying rule 3.
- **Risks / interactions:** Rename-only (no shape change). See class Decision on the validation *Update types. Phase 38 (FORM)/40 (TYPE) edit validation + lease forms — rebase.
- **Files touched:** src/lib/validation/leases.ts, src/hooks/api/query-keys/lease-mutation-options.ts
- **Decision:** See class Decision under Cross-cutting ("validation *Update rename vs canonical") — HYG-18/19/20/21/22.

## HYG-19 — Validation file re-exports duplicate `MaintenanceRequest`/`MaintenanceRequestUpdate`
- **Finding:** src/lib/validation/maintenance.ts:225/226 (medium) — `MaintenanceRequest` dup of core.ts:124, `MaintenanceRequestUpdate` dup of api-contracts.ts:220.
- **Root cause:** zod-inferred types re-use the canonical row/update names.
- **Fix:** (a) `MaintenanceRequest` (225): dead (no external importer) → delete the export. (b) `MaintenanceRequestUpdate` (226): used by `use-maintenance-form.ts:5-8` and `maintenance-keys.ts:19-22` → rename to `MaintenanceRequestUpdateInput`; update both imports.
- **Why it fixes it:** Removes the row-name collision and disambiguates the update-input type from the DB `TablesUpdate<"maintenance_requests">`.
- **Risks / interactions:** Rename-only. Phase 38 (FORM)/40 (TYPE) rebase. See class Decision.
- **Files touched:** src/lib/validation/maintenance.ts, src/hooks/use-maintenance-form.ts, src/hooks/api/query-keys/maintenance-keys.ts
- **Decision:** See class Decision (Cross-cutting).

## HYG-20 — Validation file re-exports duplicate `Property`/`PropertyUpdate`/`PropertyStats`
- **Finding:** src/lib/validation/properties.ts:194/195/199 (medium) — `Property` dup of core.ts:120, `PropertyUpdate` dup of api-contracts.ts:202, `PropertyStats` dup of stats.ts:10.
- **Root cause:** zod-inferred types re-use canonical names; the z.infer `Property` even diverges (missing `acquisition_cost`/`sale_price`/`search_vector`, `address_line2?: string` vs `string | null`).
- **Fix:** (a) `Property` (194): dead (no external importer) → delete the export. (b) `PropertyUpdate` (195): used by `property-keys.ts:10-13` → rename to `PropertyUpdateInput`; update that import. (c) `PropertyStats` (199): dead (consumers use `#types/stats`) → delete the export.
- **Why it fixes it:** The three canonical names resolve to a single definition each; `import { Property }`/`{ PropertyStats }` can no longer land on the divergent z.infer shapes.
- **Risks / interactions:** Rename/delete-only. api-contracts.ts:19 imports `PropertyCreate` from this file (unaffected). Phase 38/40 rebase. See class Decision.
- **Files touched:** src/lib/validation/properties.ts, src/hooks/api/query-keys/property-keys.ts
- **Decision:** See class Decision (Cross-cutting).

## HYG-21 — Validation file re-exports duplicate `TenantInput`/`Tenant`/`TenantUpdate`/`EmergencyContact`
- **Finding:** src/lib/validation/tenants.ts:158/159/160/163 (medium) — dup of core.ts:127/122/128 and api-contracts.ts:374.
- **Root cause:** zod-inferred types re-use canonical names; both `TenantUpdate` shapes are live simultaneously (api-contracts.ts:21 imports the validation one; tenant-mappers import `Tenant` from core).
- **Fix:** (a) `TenantInput` (158): dead → delete export. (b) `Tenant` (159): dead → delete export. (c) `TenantUpdate` (160): used by `api-contracts.ts:21` (re-exported as `UpdateTenantRequest` at line 567) and `tenant-mutation-options.ts:6` → rename to `TenantUpdateInput`; update both imports and the api-contracts alias. (d) `EmergencyContact` (163) + `UpdateEmergencyContact` alias (164): dead (no external importer; canonical is api-contracts.ts:374) → delete both type exports (keep the `emergencyContactSchema` value if used elsewhere).
- **Why it fixes it:** Each canonical name has one definition; the validated tenant-update input keeps a distinct name from core's `TenantUpdate` = `Partial<TablesInsert<"tenants">>`.
- **Risks / interactions:** Verify `emergencyContactSchema`/`tenantSchema`/`tenantInputSchema` value exports remain (only the redundant TYPE exports are removed). Rename-only for `TenantUpdate`. Phase 38 (FORM)/40 (TYPE) rebase. See class Decision.
- **Files touched:** src/lib/validation/tenants.ts, src/types/api-contracts.ts, src/hooks/api/query-keys/tenant-mutation-options.ts
- **Decision:** See class Decision (Cross-cutting).

## HYG-22 — Validation file re-exports duplicate `Unit`/`UnitUpdate`/`UnitStats`
- **Finding:** src/lib/validation/units.ts:140/141/143 (medium) — `Unit` dup of core.ts:121, `UnitUpdate` dup of api-contracts.ts:208, `UnitStats` dup of stats.ts:36 (divergent: `average_rent_amount`/`total_rent_amount` vs `averageRent`/`totalPotentialRent`).
- **Root cause:** zod-inferred types re-use canonical names.
- **Fix:** (a) `Unit` (140): dead → delete export. (b) `UnitUpdate` (141): used by `unit-keys.ts:20` → rename to `UnitUpdateInput`; update that import. (c) `UnitStats` (143): dead (consumers use `#types/stats`) → delete export.
- **Why it fixes it:** One definition per canonical name; the divergent stats shape can no longer be reached via `import { UnitStats }`.
- **Risks / interactions:** Rename/delete-only. Phase 38/40 rebase. See class Decision.
- **Files touched:** src/lib/validation/units.ts, src/hooks/api/query-keys/unit-keys.ts
- **Decision:** See class Decision (Cross-cutting).

## HYG-23 — Static inline style objects in the portfolio data table
- **Finding:** src/components/dashboard/components/portfolio-data-table.tsx:217/225/237 (low) — `style={{display:"grid"}}`, `{display:"grid",position:"sticky",top:0,zIndex:1}`, `{display:"flex",width:"100%"}` are fully static; only the line-250 `flex: 1 1 ${getSize()}px` is genuinely dynamic.
- **Root cause:** Static layout values were written as inline styles next to legitimately-dynamic virtualizer styles.
- **Fix:** Convert the three static objects to utilities on the existing `className`/`cn()`: table (217) → add `grid`; TableHeader (225-230) → `className="bg-muted/30 grid sticky top-0 z-[1]"`; header TableRow (237) → `className="flex w-full"`. Keep the dynamic `style` at 245-256 (getSize-based flex). `TableHeader`/`TableRow` merge className via `cn()` with no conflicting display/position utilities (verified table.tsx primitives).
- **Why it fixes it:** The three rule-5 violations become Tailwind utilities; `display:grid` on `<table>`/`<thead>` (load-bearing for the sticky-header + virtualizer per the file's comment) is preserved exactly (`grid` == `display:grid`).
- **Risks / interactions:** Preserve the grid/sticky semantics — the comment at 207-214 explains why the header must stick to `scrollRef`; `sticky top-0 z-[1]` is equivalent. Phase 42 (DASH) owns this table — rebase and re-verify.
- **Files touched:** src/components/dashboard/components/portfolio-data-table.tsx

## HYG-24 — Exported `TimelineEvent` in lease-detail-utils collides with the section type
- **Finding:** src/components/leases/detail/lease-detail-utils.ts:15 (low) — a lease-domain `TimelineEvent` is the third same-named export (with sections/maintenance.ts:105 and maintenance-utils.ts:72).
- **Root cause:** The lease timeline type re-used the generic name `TimelineEvent` despite a lease-specific `type` union.
- **Fix:** Rename to `LeaseTimelineEvent`; update its use in `generateTimelineEvents` (return type) and the importer `src/components/leases/detail/lease-timeline-tab.tsx:14` (`type TimelineEvent` → `LeaseTimelineEvent`, used at line 18). Combined with HYG-06 (maintenance-utils reuses the section type), the codebase is left with one maintenance `TimelineEvent` (canonical, in src/types) and one `LeaseTimelineEvent`.
- **Why it fixes it:** Distinct domain names remove the three-way `TimelineEvent` collision the verifier flagged.
- **Risks / interactions:** Rename-only; `generateTimelineEvents` return is inferred so `lease-details.client.tsx` (imports the fn, not the type) is unaffected. Sequence after HYG-06 conceptually but both land in this phase. Phase 40 (TYPE)/43 (SIGN) may pre-touch — rebase.
- **Files touched:** src/components/leases/detail/lease-detail-utils.ts, src/components/leases/detail/lease-timeline-tab.tsx

## HYG-25 — Ad-hoc entity-snapshot query keys in the lease creation wizard
- **Finding:** src/components/leases/wizard/lease-creation-wizard.tsx:102/115/128 (low) — `[...propertyQueries.all(), id]`, `[...unitQueries.all(), id]`, `[...tenantQueries.all(), id]` with bespoke `{id,name}` queryFns; bypass the `detail(id)` factories and sit outside any factory the invalidation sweep audits (`['tenants', id]` is not matched by `details()`-prefixed invalidations).
- **Root cause:** Lightweight name-snapshot fetches for the review step were keyed ad-hoc rather than through factories, and their keys don't nest under the `details()` prefix that mutations invalidate.
- **Fix:** Add lightweight name-snapshot factories keyed UNDER `details()` so invalidations reach them: `propertyQueries.nameById(id)` keyed `[...propertyQueries.details(), id, "name"]`, and equivalently `unitQueries.nameById(id)`, `tenantQueries.nameById(id)` in their key files; move the minimal-select queryFns there. The wizard consumes `useQuery(propertyQueries.nameById(selectionData.property_id))`, etc.
- **Why it fixes it:** The three keys become auditable factories and now nest under the `details()` namespace, so entity mutations that invalidate `details()` refresh the wizard's name snapshots — closing the cache-coherence gap the verifier described.
- **Risks / interactions:** Same class as HYG-04. Phase 38 (FORM)/40 (TYPE) touch wizard — rebase.
- **Files touched:** src/components/leases/wizard/lease-creation-wizard.tsx, src/hooks/api/query-keys/property-keys.ts, src/hooks/api/query-keys/unit-keys.ts, src/hooks/api/query-keys/tenant-keys.ts
- **Decision:** Chosen: add dedicated lightweight `nameById` factories keyed under `details()`. Alternative: reuse the existing `detail(id)` factories — cache-coherent too, but over-fetches the full joined row when only `name` is needed.

## HYG-26 — Local `MaintenanceRequest` interface duplicates the canonical type name
- **Finding:** src/components/maintenance/detail/maintenance-header-card.tsx:30 (low) — a local `interface MaintenanceRequest` (8 fields) duplicates `core.ts:124` `MaintenanceRequest = Tables<"maintenance_requests">`; all 8 fields exist on the row type.
- **Root cause:** A component props sub-shape was declared as a fresh interface named `MaintenanceRequest` instead of `Pick`-ing the canonical row.
- **Fix:** Import the canonical row (`import type { MaintenanceRequest as MaintenanceRow } from "#types/core"` — the file already imports `MaintenancePriority`/`MaintenanceStatus` from there at line 17) and replace the local interface with `type MaintenanceHeaderRequest = Pick<MaintenanceRow, "id"|"title"|"description"|"status"|"priority"|"scheduled_date"|"estimated_cost"|"actual_cost">`; update `MaintenanceHeaderCardProps.request` to `MaintenanceHeaderRequest`.
- **Why it fixes it:** Removes the same-named local duplicate; the props type derives from the canonical row, so nullability stays in sync with the DB — the rule-3 fix the verifier prescribed.
- **Risks / interactions:** Caller (`maintenance-details.client.tsx`) passes the full detail row, so the `Pick` (which carries the row's real `string|null` nullability, unlike the local's `?`) is satisfied. Phase 41 (COMP)/42 (DASH) may pre-touch — rebase.
- **Files touched:** src/components/maintenance/detail/maintenance-header-card.tsx

## HYG-27 — Local `KanbanColumnProps` duplicates the dead section type
- **Finding:** src/components/maintenance/kanban/maintenance-kanban.client.tsx:136 (low) — local `KanbanColumnProps` (`column: ColumnConfig`, `requests: MaintenanceDisplayRequest[]`, …) collides with `sections/maintenance.ts:182` `KanbanColumnProps` (`title`/`count`/`colorClass`/`icon`/`requests: MaintenanceRequestItem[]`, …), which is imported nowhere.
- **Root cause:** The section type is stale dead weight with a shape that no longer matches the live kanban component.
- **Fix:** Delete the dead `KanbanColumnProps` interface from `src/types/sections/maintenance.ts:182-191`. **Also delete the now-orphaned import** `import type { ReactElement } from "react";` at `maintenance.ts:2` — grep confirms `ReactElement` is referenced in this file at exactly ONE site, `icon: ReactElement` on line 186 inside `KanbanColumnProps`, so removing the interface strands the React import and `noUnusedLocals` fails the typecheck unless line 2 goes too. The component's local props interface then has no importable collision. (Leave `MaintenanceRequestItem`/`MaintenanceListProps` unless separately dead.)
- **Why it fixes it:** Removes the duplicate by deleting the unused, divergent copy — the component-local props interface is legitimate and now unique. Deleting the paired `ReactElement` import in the same edit closes the validator's objection — no unused `import type` is left behind, so the strict `noUnusedLocals` typecheck stays green.
- **Risks / interactions:** Grep-confirmed the section `KanbanColumnProps` has zero importers and that `ReactElement` has no other reference in maintenance.ts (only lines 2 + 186), so removing line 2 cannot break another type. Phase 40 (TYPE)/41 (COMP) rebase.
- **Files touched:** src/types/sections/maintenance.ts
- **Decision:** Chosen: delete the dead section type. Alternative: rename the component-local to `KanbanColumnConfigProps` — also valid, but leaves dead code in src/types.

## HYG-28 — Static inline width/animationDelay styles in blog-empty-state
- **Finding:** src/components/shared/blog-empty-state.tsx:29/33/37/39/42 (low) — static literals like `style={{ width:"100%", animationDelay:"0ms" }}` and `{ width:"60%" }` map 1:1 to utilities; sibling of blog-loading-skeleton.
- **Root cause:** Fixed skeleton dimensions/delays were written inline instead of as arbitrary-value Tailwind utilities (the codebase's canonical pattern — loading-spinner.tsx uses `[animation-delay:var(--duration-200)]`, asserted by TOKEN-02).
- **Fix:** Convert each inline style to arbitrary-value utilities on the className: `w-full [animation-delay:0ms]` (29), `w-[85%] [animation-delay:var(--duration-300)]` (33), `w-[92%] [animation-delay:var(--duration-500)]` (37), `w-[60%]` (39), `[animation-delay:var(--duration-1000)]` (42). Leave the scoped `<style>` `@keyframes` block (not a `style=` attribute; out of this finding's scope — optionally migrate keyframes to globals.css as a follow-up).
- **Why it fixes it:** All five rule-5 inline `style` attributes become utilities matching the sanctioned pattern.
- **Risks / interactions:** Ensure the `--duration-*` custom props resolve as `animation-delay` values (they do — same pattern as loading-spinner). Phase 45 (CONTENT)/46 (MKTUI) may touch blog UI — rebase.
- **Files touched:** src/components/shared/blog-empty-state.tsx

## HYG-29 — Static inline height/animationDelay styles in chart-loading-skeleton
- **Finding:** src/components/shared/chart-loading-skeleton.tsx:14/18/22/26/30 (low) — each bar hardcodes `style={{ height:"40%", animationDelay:… }}`; five rule-5 violations.
- **Root cause:** Same class as HYG-28 — fixed skeleton bar heights/delays written inline.
- **Fix:** Convert to arbitrary-value utilities per bar: `h-[40%] [animation-delay:0ms]` (14), `h-[65%] [animation-delay:var(--duration-200)]` (18), `h-[45%] [animation-delay:var(--duration-300)]` (22), `h-[80%] [animation-delay:var(--duration-500)]` (26), `h-[55%] [animation-delay:var(--duration-700)]` (30). Leave the `<style>` `@keyframes chart-rise` block.
- **Why it fixes it:** Eliminates the five inline `style` attributes using the same arbitrary-value pattern the codebase standardizes on.
- **Risks / interactions:** None functional. Phase 42 (DASH)/45 (CONTENT) may touch — rebase.
- **Files touched:** src/components/shared/chart-loading-skeleton.tsx

## HYG-30 — Static inline positioning on the tenant floating action bar
- **Finding:** src/components/tenants/tenant-action-bar.tsx:36 (low) — `style={{ bottom:"24px", left:"50%", transform:"translateX(-50%)" }}` with exact utility equivalents.
- **Root cause:** Static positioning of a portaled floating toolbar written inline.
- **Fix:** Remove the `style` object and add `bottom-6 left-1/2 -translate-x-1/2` to the existing className (line 35).
- **Why it fixes it:** Rule-5 inline style replaced by the exact-equivalent utilities; the portal + `fixed` positioning behavior is unchanged.
- **Risks / interactions:** None (`bottom-6` == 24px, `left-1/2` == 50%, `-translate-x-1/2` == translateX(-50%)). Phase 41 (COMP) may touch — rebase.
- **Files touched:** src/components/tenants/tenant-action-bar.tsx

## HYG-31 — Local `Property` interface duplicates the canonical Property name
- **Finding:** src/components/units/unit-form-fields.tsx:10 (low) — `interface Property { id; name }` shadows `core.ts:120` `Property = Tables<"properties">`; the data actually comes from `propertyQueries.list()` rows.
- **Root cause:** A minimal props shape was declared as a fresh interface named `Property` instead of `Pick`-ing the canonical type (the sibling selection-step.tsx already does this).
- **Fix:** Follow the sanctioned sibling pattern (selection-step.tsx:40,52): `import type { Property as SharedProperty } from "#types/core"` then `type Property = Pick<SharedProperty, "id" | "name">`. This keeps the local name but derives it from the canonical type, so it is no longer an independent duplicate.
- **Why it fixes it:** The local `Property` becomes a `Pick` of the canonical row rather than a from-scratch interface — exactly the fix the verifier referenced.
- **Risks / interactions:** None (structurally identical `{id,name}`). Phase 38 (FORM) owns unit forms — rebase.
- **Files touched:** src/components/units/unit-form-fields.tsx

## HYG-32 — Emoji characters in env validation error strings
- **Finding:** src/env.ts:156 and 166 (low) — U+274C ❌ + U+1F4CB 📋 (156) and U+274C ❌ (166) in thrown error messages; rule-7 (no emojis in code).
- **Root cause:** Emoji were used as message prefixes in `onValidationError`/`onInvalidAccess`.
- **Fix:** Replace with plain-text prefixes: line 156 `\n❌ Invalid environment variables:` → `\nERROR: Invalid environment variables:` and `\n📋 Check your .env.local file…` → `\nNOTE: Check your .env.local file…`; line 166 `❌ Attempted to access…` → `ERROR: Attempted to access…`.
- **Why it fixes it:** Removes the three literal emoji code points the verifier cited; error text stays informative.
- **Risks / interactions:** None. No other phase touches env.ts.
- **Files touched:** src/env.ts

## HYG-33 — Duplicate `MaintenanceFilters` (maintenance-keys vs api-contracts)
- **Finding:** src/hooks/api/query-keys/maintenance-keys.ts:36 (low) — local `MaintenanceFilters` collides with `api-contracts.ts:276` `MaintenanceFilters` (a superset that adds `search`).
- **Root cause:** Same-named filter interfaces; the api-contracts copy is dead (grep: zero importers), the local is used by `maintenanceQueries.list`.
- **Fix:** Delete the dead `MaintenanceFilters` from `src/types/api-contracts.ts:276-284`. Keep the maintenance-keys local. No consumer change. (The local lacks `search`, which the list queryFn doesn't use — no functional change.)
- **Why it fixes it:** Removes the duplicate by deleting the unused copy.
- **Risks / interactions:** api-contracts.ts is already imported by maintenance-keys for `PaginatedResponse` (line 23) — unaffected. Phase 39 (DATA)/40 (TYPE) rebase.
- **Files touched:** src/types/api-contracts.ts
- **Decision:** See class Decision (Cross-cutting).

## HYG-34 — Duplicate `UnitFilters` (unit-keys vs api-contracts)
- **Finding:** src/hooks/api/query-keys/unit-keys.ts:30 (low) — local `UnitFilters` (status narrowed to the 4 unit statuses) collides with `api-contracts.ts:286` `UnitFilters` (`status?: string`).
- **Root cause:** Same-named filter interfaces; the api-contracts copy is dead (grep: zero importers), the local (with the correct narrow `UnitStatus` union) is the one used by `unitQueries.list`.
- **Fix:** Delete the dead `UnitFilters` from `src/types/api-contracts.ts:286-292`. Keep the unit-keys local (the narrower, correct one). No consumer change.
- **Why it fixes it:** Removes the duplicate; the surviving definition keeps the tighter status typing.
- **Risks / interactions:** Verified only the unit-keys local is consumed. Phase 39/40 rebase.
- **Files touched:** src/types/api-contracts.ts
- **Decision:** See class Decision (Cross-cutting).

## HYG-35 — Duplicate `SubscriptionStatus` (status-types vs core.ts)
- **Finding:** src/lib/constants/status-types.ts:80 (low) — `SubscriptionStatus` derived from SUBSCRIPTION_STATUS vs `core.ts:475` hand-written identical 8-member union; two independent definitions that can drift.
- **Root cause:** core.ts hand-wrote the union instead of aliasing the constants-derived type (unlike `PropertyType`/`MaintenanceCategory`, which it correctly aliases at 181-183).
- **Fix:** In `src/types/core.ts`, add `SubscriptionStatus as SubscriptionStatusFromConstants` to the existing `import type { … } from "../../src/lib/constants/status-types"` block (line 88-92) and replace the hand-written union (475-483) with `export type SubscriptionStatus = SubscriptionStatusFromConstants`.
- **Why it fixes it:** One constants-derived source of truth; a Stripe status change updates both call sites — the drift risk the verifier cited.
- **Risks / interactions:** Unions are byte-identical (verified), and grep shows no importer of either `SubscriptionStatus` by name, so zero risk. Phase 36 (BILL) may touch subscription types — rebase.
- **Files touched:** src/types/core.ts

## HYG-36 — Duplicate `TenantStatus` (status-types superset vs api-contracts)
- **Finding:** src/lib/constants/status-types.ts:95 (low) — `TenantStatus` = `active|inactive|EVICTED|pending|MOVED_OUT|ARCHIVED` (mixed-case) vs `api-contracts.ts:226` `active|inactive|pending`; divergent superset.
- **Root cause:** The status-types union carries mixed-case values that match neither the api-contracts type nor the actual persisted set (tenant-mappers uses active/inactive/pending/SUSPENDED/DELETED/moved_out); it is unused.
- **Fix:** Delete the dead `TenantStatus` type export (status-types.ts:95) and its backing `TENANT_STATUS` const (86-93) — grep confirms both are used nowhere. Keep `api-contracts.ts:226` `TenantStatus` as canonical.
- **Why it fixes it:** Removes the duplicate + its divergent value set so no code can accept statuses the UI never handles — the verifier's concern.
- **Risks / interactions:** Grep-confirmed zero importers of `TenantStatus` from status-types and no other use of `TENANT_STATUS`. Phase 40 (TYPE)/39 (DATA) rebase.
- **Files touched:** src/lib/constants/status-types.ts
- **Decision:** Chosen: delete (both are dead + wrong-valued). Alternative: rename to `TenantLifecycleStatus` if the extended vocabulary is intended for future use — not warranted given the mixed-case values don't match the DB.

## HYG-37 — Duplicate `PlanType` (status-types vs stripe.ts)
- **Finding:** src/lib/constants/status-types.ts:202 (low) — `PlanType` derived from PLAN_TYPES vs `stripe.ts:15` hand-written identical `"FREETRIAL"|"STARTER"|"GROWTH"|"TENANTFLOW_MAX"`; unlinked.
- **Root cause:** stripe.ts hand-wrote the union instead of aliasing the constants-derived type.
- **Fix:** In `src/types/stripe.ts`, replace the hand-written union (line 15) with `import type { PlanType as PlanTypeFromConstants } from "#lib/constants/status-types"; export type PlanType = PlanTypeFromConstants`.
- **Why it fixes it:** Single constants-derived source; a plan rename happens once — the drift the verifier flagged.
- **Risks / interactions:** Byte-identical unions; grep shows no importer of `PlanType` from either location, so zero risk. Confirm the `#lib/constants/status-types` alias path resolves from `src/types/stripe.ts` (core.ts already imports from it). Phase 36 (BILL) rebase.
- **Files touched:** src/types/stripe.ts

## HYG-38 — Duplicate `EntityType`/`ActionType`/`Permission` (core.ts vs status-types)
- **Finding:** src/lib/constants/status-types.ts:243/255/260 (low) — constants-derived `EntityType`/`ActionType`/`Permission` are value-identical to but independent of the hand-written unions at `core.ts:218-225`.
- **Root cause:** core.ts hand-wrote the three unions instead of aliasing the constants-derived exports.
- **Fix:** In `src/types/core.ts`, add `EntityType as EntityTypeFromConstants`, `ActionType as ActionTypeFromConstants`, `Permission as PermissionFromConstants` to the existing status-types import block (88-92) and replace lines 218-225 with `export type EntityType = EntityTypeFromConstants; export type ActionType = ActionTypeFromConstants; export type Permission = PermissionFromConstants`.
- **Why it fixes it:** One source per type; adding an entity/action updates both — the desync risk the verifier cited.
- **Risks / interactions:** Value-identical (verified); grep shows no importer of any of the three, so zero risk. Phase 40 (TYPE) rebase.
- **Files touched:** src/types/core.ts

## HYG-39 — Duplicate `SignatureStatusResponse` (lease-wizard.schemas vs api-contracts)
- **Finding:** src/lib/validation/lease-wizard.schemas.ts:341 (low) — `SignatureStatusResponse = z.infer<…>` duplicates the identical-shape `interface SignatureStatusResponse` at `api-contracts.ts:257`.
- **Root cause:** A z.infer type re-uses the canonical contract name; both are unused (grep: neither imported elsewhere).
- **Fix:** Remove the duplicate TYPE export from `src/lib/validation/lease-wizard.schemas.ts:341` (delete or drop `export`), keeping the `signatureStatusResponseSchema` value if it is referenced. Keep `api-contracts.ts:257` `SignatureStatusResponse` as canonical.
- **Why it fixes it:** One `SignatureStatusResponse` remains, in src/types — the type-lookup-order canonical location.
- **Risks / interactions:** Confirm `signatureStatusResponseSchema` (the value) usage before deleting only the type; both types are dead so no consumer breaks. Phase 43 (SIGN) may touch — rebase.
- **Files touched:** src/lib/validation/lease-wizard.schemas.ts
- **Decision:** See class Decision (Cross-cutting) — both are dead, so keep the src/types copy and drop the z.infer duplicate.

## HYG-40 — `DataDensity` copy-pasted in preferences-store
- **Finding:** src/stores/preferences-store.ts:11 (low) — `export type DataDensity = "compact"|"comfortable"|"spacious"` duplicates `src/types/domain.ts:138` (identical union + doc comment); the store already imports `ThemeMode` from `#types/domain` (line 3).
- **Root cause:** The type was copy-pasted into the store instead of imported from its canonical domain home.
- **Fix:** In `preferences-store.ts`, delete the local `export type DataDensity` (line 11) and add `DataDensity` to the existing `import type { ThemeMode } from "#types/domain"` (line 3). Because rule 2 forbids re-exporting through the store, update the consumers that import `DataDensity` from `#stores/preferences-store` to import from `#types/domain`: `src/components/settings/general-settings.tsx:20` and `src/stores/__tests__/data-density.test.ts:12`.
- **Why it fixes it:** One `DataDensity` definition (in `#types/domain`); the store consumes it like it already consumes `ThemeMode` — the fix the verifier prescribed.
- **Risks / interactions:** The store's `DEFAULT_DATA_DENSITY`/function signatures still resolve `DataDensity` (now imported). Update the 2 consumer import paths so nothing references the removed store export. Phase 49 (STATE) owns stores — rebase and re-verify.
- **Files touched:** src/stores/preferences-store.ts, src/components/settings/general-settings.tsx, src/stores/__tests__/data-density.test.ts

## Cross-cutting notes

### Phase-order dependency (HYG is phase 51, executed LAST)
Every other v9.0 phase (36 BILL → 50 ADMIN) lands before HYG. Several touch HYG's exact files and may pre-resolve or shift findings:
- **Phase 40 TYPE** is the highest-overlap risk: it edits `src/types/*` and could already delete/rename many of the duplicate types here (HYG-03, 06, 07, 09–12, 15–22, 24, 26, 27, 33–40). Before implementing HYG, rebase on the phase-50 tree and re-run each finding's grep; mark any already-fixed finding `no_change_needed`.
- **Phase 38 FORM** → validation files + forms (HYG-18–22, 25, 31). **Phase 36 BILL** → stripe/currency/subscription (HYG-16, 17, 35, 37). **Phase 42 DASH** → dashboard tables/widgets (HYG-02, 23). **Phase 43 SIGN** → e-sign types (HYG-10, 24, 39). **Phase 44 PUBUX** → contact page (HYG-01). **Phase 49 STATE** → stores (HYG-40).
Treat HYG as a "sweep the remainder" phase: re-verify each finding reproduces on the final pre-51 tree, then fix.

### Class A — Rule-5 inline styles → Tailwind utilities (HYG-01, 08, 23, 28, 29, 30)
All are static inline `style={{}}` objects with exact utility equivalents. Class-wide approach: convert to className utilities (arbitrary values `[animation-delay:var(--duration-*)]`/`h-[40%]`/`w-[85%]` for skeletons; `grid`/`sticky`/`flex w-full`/`bottom-6 left-1/2 -translate-x-1/2` for layout). Only genuinely runtime-computed styles (e.g. portfolio-data-table.tsx:250 `flex: 1 1 ${getSize()}px`) stay inline. HYG-01 additionally removes a CSP-blocked remote asset (replace with a brand gradient). The scoped `<style>{@keyframes}</style>` blocks in the skeletons are out of scope (they are `<style>` elements, not `style=` attributes); optionally migrate keyframes to globals.css later.

### Class B — Rule-9 inline query keys → queryOptions factories (HYG-02, 04, 05, 25; placement HYG-13)
Class-wide approach: move each inline `queryKey`/`useQuery` into a `queryOptions()` factory in the matching `src/hooks/api/query-keys/*-keys.ts`, keeping the key literal stable EXCEPT where it collides with an existing namespace (HYG-04 line 83 must move OFF the `lists()` prefix; HYG-25 name-snapshots should nest UNDER `details()` so mutation invalidations reach them). HYG-13 is placement-only: relocate the whole `vendorKeys` factory into a new `query-keys/vendor-keys.ts` (rename to `vendorQueries`). Where extraction exposes an invalidation gap (HYG-05), also add the missing invalidation to the relevant mutation.

### Class C — Rule-3 duplicate types
Three sub-patterns, each with a firm direction:
- **(C-delete-dead) Duplicate where one copy is provably unused: delete the dead copy.** HYG-09/10/11/16/33/34 → the `src/types` (api-contracts/core) copy is dead + structurally divergent; delete it, keep the active query-keys/stripe-client local. HYG-12 → delete the dead `relations.ts` copy. HYG-39 → both dead; keep the api-contracts copy, drop the z.infer duplicate. HYG-27/36 → delete the dead section/status-types type. HYG-18/19/20/21/22 → delete the dead bare-name validation exports (`Lease`/`Property`/`Tenant`/`Unit`/`MaintenanceRequest`/`*Stats`/`TenantInput`/`EmergencyContact`).
- **(C-alias) Duplicate that should alias the constants-derived type:** HYG-35/37/38 → core.ts/stripe.ts alias `SubscriptionStatus`/`PlanType`/`EntityType`/`ActionType`/`Permission` from `#lib/constants/status-types` (the existing `*FromConstants` pattern). HYG-15 → rename the status-types monitoring type instead (different concept, not an alias candidate).
- **(C-rename) Duplicate that is a legitimately-distinct concept sharing a canonical name:** rename the non-canonical one. HYG-03 (`UnitWithOptionalProperty`), HYG-06 (reuse canonical, no rename), HYG-07 (`Design*`/`PortfolioSummary`), HYG-17 (`PriceInterval`), HYG-24 (`LeaseTimelineEvent`), HYG-26 (`MaintenanceHeaderRequest` via `Pick`), HYG-31 (`Pick` of canonical), HYG-40 (import from `#types/domain`), and the used validation *Update types HYG-18/19/20/21/22 (`*UpdateInput`).

**Class Decision — dead-src/types-copy deletion vs relocate-into-src/types (HYG-09/10/11/12/16/33/34/39):** In every one of these, the `src/types` copy is grep-confirmed unused AND the query-keys/stripe-client local is the active, correct definition. Chosen direction = delete the dead src/types duplicate (lowest blast radius: touches only dead declarations, zero risk to active queries; the surviving definition already matches the real query shape). Alternative = relocate each active definition INTO `src/types` (api-contracts.ts) with a reconciled shape and import it back — more literally "types live in src/types," but higher churn and requires shape reconciliation on live code. Query-domain filter/list types are legitimately co-located with their factories in `src/hooks/api/query-keys/`, so the chosen direction is consistent with the codebase's actual layering.

**Class Decision — validation *Update rename vs consolidate onto canonical (HYG-18/19/20/21/22):** The used exports (`LeaseUpdate`/`PropertyUpdate`/`TenantUpdate`/`UnitUpdate`/`MaintenanceRequestUpdate`) are zod-inferred "validated update input" types, semantically distinct from the DB `TablesUpdate<…>`. Chosen = rename them to `*UpdateInput` (pure disambiguation, zero shape/behavior change, satisfies rule 3). Alternative = delete them and switch the ~1-2 consumers each to the canonical `TablesUpdate<…>` from api-contracts — more "canonical" but risks type mismatches where the zod optionality differs from the raw DB update shape.

### Verification before implementing
`typecheck`/`lint`/`unit` all pass on current main; every rename/delete here must keep them green. The rename findings (HYG-03/06/07/17/24/26/31/40 + validation *Update) change type names referenced by tests (`use-lease.test.tsx`, `data-density.test.ts`, tenant/wizard property tests) — update those imports in the same change. The delete-dead findings should be preceded by a fresh grep confirming the copy is still unused on the pre-51 tree (an earlier phase may have added a consumer).
