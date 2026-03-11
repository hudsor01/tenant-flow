# Phase 18 - Deferred Items

## Pre-existing Type Errors (Out of Scope)

These errors exist in the committed codebase before any Phase 18 work and are not caused by component splitting.

1. **chart-tooltip.tsx** - imports `useChart` and `getPayloadConfigFromPayload` from `chart.tsx` but those are not exported (pre-existing Plan 01 chart refactoring)
2. **AlertDialog imports** - Multiple files import `AlertDialog*` from `#components/ui/dialog` but those exports were removed during Plan 01 dialog consolidation. Affected files:
   - `src/app/(owner)/units/page.tsx`
   - `src/app/(tenant)/tenant/payments/methods/tenant-payment-methods.client.tsx`
   - `src/app/(tenant)/tenant/profile/page.tsx`
3. **chart.tsx** - `useMemo` import is declared but never used (TS6133)
