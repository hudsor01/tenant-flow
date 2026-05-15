# v1.0 Milestone Retrospective — UI Audit

**Date:** 2026-05-13
**Scope:** 45 items from `audit-ui-2026-05-08.md` audited against current `main` after all 13 phases shipped.

## Score

| Status | Count | Percent |
|--------|-------|---------|
| DONE | 35 | 78% |
| PARTIAL | 6 | 13% |
| GAP | 3 | 7% |
| SUPERSEDED | 1 | 2% |
| **Total** | **45** | **100%** |

## Real Gaps (need a cleanup PR)

### GAP-A: Hudson Digital footer link (audit #18)
- **File:** `src/components/layout/footer.tsx:94-101`
- **Evidence:** The "Powered by Hudson Digital" link is still rendered. The audit explicitly said "Remove for the campaign."
- **Fix:** Delete the link OR remove the whole `<Link href="https://hudsondigitalsolutions.com">...</Link>` block.

### GAP-B: Mobile nav missing `aria-current="page"` (audit #9, #42)
- **File:** `src/components/layout/navbar/navbar-mobile-menu.tsx`
- **Evidence:** Desktop nav (`navbar-desktop-nav.tsx:100`) sets `aria-current` correctly, but the mobile sheet menu only changes className for visual state.
- **Fix:** Mirror the `aria-current={isActive ? 'page' : undefined}` pattern on the mobile Sheet link list.

### GAP-C: Title separator inconsistent (audit #33)
- **Files:**
  - `src/app/features/page.tsx:13` — `"Property Management Features — Document Vault, ..."` (uses em-dash)
  - `src/app/about/page.tsx:43` — `"About TenantFlow - Our Mission"` (uses hyphen)
  - `src/app/faq/page.tsx` — `"Property Management FAQ — Questions About..."` (em-dash)
- **Evidence:** Phase 12 standardized pricing + compare to `|`. Three more pages got missed.
- **Fix:** Swap `—` and `-` for `|` so the root template's `'%s | TenantFlow'` produces coherent titles.

## Partial Items (low-priority polish)

### PART-A: Max pricing comment debt (audit #3)
- **File:** `src/config/pricing.ts:23` — comment still says `MAX_PUBLIC_PRICE_DISPLAY = '$149' // Phase 5 cleanup target`. Phase 5 shipped; the comment is stale.
- **Severity:** Cosmetic. Pricing is correct in all live surfaces.

### PART-B: G2/Capterra/Trustpilot badges (audit #32)
- **Status:** No review badges anywhere on the site.
- **Decision:** Defer until real reviews exist. Showing fabricated badges would violate the Phase 4 anti-fabrication lock.

### PART-C: DocuSeal plan-restriction copy (audit #24)
- **Locations:** `src/config/pricing.ts:122,153,187`. Mentioned 3 times across plan tiers + once in homeFaq.
- **Status:** Acceptable — the audit said "in 3+ places defensive"; the current count is exactly 3 (one per tier) which is descriptive, not defensive.

### PART-D: aria-current full audit (audit #42)
- Subsumed by GAP-B above.

### PART-E: Sales CTA label standardization (audit #43)
- **Status:** All 12 instances now use "Contact Sales". Confirmed via grep. Standardization complete.

### PART-F: Multi-Property Dashboard icon (audit #8)
- **Status:** Likely superseded by the homepage refactor. The original audit referenced a specific feature card with a back-arrow icon; the current homepage uses `HeroDashboardMockup` instead of a static feature grid. No back-arrow violation found in current code.
- **Decision:** Mark as resolved-by-refactor, not actively shipped a fix.

## What Worked Well

- **Perfect-PR gate.** Every phase landed only after 2 consecutive zero-finding review cycles. Catching `bg-white/[var(...)]` regression in cycle-1 of Phase 11 alone saved an in-prod CSS parse failure.
- **Anti-fabrication discipline (Phase 4).** Killing the fake "500+ subscribers" claim and replacing testimonials with author-confirmed names (Janet Shur, Jacob Lear) honors the user's "no fake metrics" rule that surfaced mid-milestone.
- **Cross-cutting design-token guard (Phase 11).** ESLint `color-tokens` plugin now blocks `#hex`, `rgb()`, `bg-white`, `[Nms]` at CI time. Zero drift can land silently again.
- **Sentry visibility audit (Phase 13 ride-along).** Found the `catch (_err)` swallow that hid 209 Stripe webhook failures for 9 days; audited all 20 Edge Functions to confirm no other swallows.

## What Could Be Improved

- **Audit-doc → roadmap coverage gap.** 7% of audit items (3 hard gaps) shipped without explicit phase ownership. A coverage matrix in PHASE-0 would have caught items #18, #32, #33 earlier.
- **Visual-only items hard to verify in code review.** Item #19 (Supabase logo opacity) genuinely needs eyes-on-pixels, not file:line evidence. Future milestones should pair this kind of item with a Playwright visual-regression assertion.
- **Cleanup-comment debt.** `pricing.ts:23` has a stale "Phase 5 cleanup target" comment. Phase verifiers should grep for "Phase N" annotations on completion.
- **Single-author velocity.** All 13 phases shipped by the assistant with strategic direction from the user. Pair-review or external review-AI handoff would catch judgment-call drift.

## Recommended Next Step

Open a **v1.0 cleanup PR** to address the 3 hard gaps (GAP-A/B/C) plus the stale comment (PART-A). Estimated diff: 4 files, ~20 lines.
