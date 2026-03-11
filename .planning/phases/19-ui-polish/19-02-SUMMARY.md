---
phase: 19-ui-polish
plan: 02
status: complete
started: "2026-03-09"
completed: "2026-03-09"
duration: 12min
tasks_completed: 2
files_changed: 5
commits:
  - hash: "579778997"
    message: "refactor(19-02): consolidate button variants from 11 to 6 and sizes from 9 to 4"
  - hash: 8c26a8ad2
    message: "refactor(19-02): convert hero inline CTAs to Button component"
---

# Plan 19-02 Summary: Button Variant Consolidation

## What Changed
- Reduced button variants from 11 to 6: default, destructive, outline, secondary, ghost, link
- Removed niche variants: premium, masculine, navbar, navbarGhost, lightboxNav (all had 0 consumers)
- Reduced button sizes from 9 to 4: default, sm, lg, icon
- Removed niche sizes: xl, icon-sm, icon-lg, mobile-full, touch-friendly, navbar
- Migrated 4 `icon-sm` usages to `size="icon"` with className override (`h-8 w-8 min-h-8 min-w-8`)
- Converted hero section inline `<a>` CTAs to `Button asChild` + `Link` pattern with `ArrowRight` icon

## Files Modified
- `src/components/ui/button.tsx` — consolidated CVA variants and sizes
- `src/app/(owner)/payments/methods/payment-methods-list.client.tsx` — icon-sm → icon migration
- `src/app/(tenant)/tenant/payments/methods/tenant-payment-methods.client.tsx` — icon-sm → icon migration
- `src/components/tenants/tenant-table-row.tsx` — icon-sm → icon migration (2 instances)
- `src/app/marketing-home.tsx` — hero CTAs converted to Button component

## Verification
- `pnpm typecheck` — clean (CVA TypeScript inference confirmed no invalid variant/size references)
- `pnpm lint` — clean
- `pnpm test:unit` — 1,412 tests passing
