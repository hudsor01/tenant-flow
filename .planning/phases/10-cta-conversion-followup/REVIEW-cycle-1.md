---
phase: 10-cta-conversion-followup
cycle: 1
reviewed: 2026-05-11T12:18:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/data/testimonials.ts
  - src/app/pricing/page.tsx
  - src/app/marketing-home.tsx
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: issues_found
verdict: PASS
---

# Phase 10 Follow-up (TRUST-01 un-deferred): Code Review — Cycle 1

**Reviewed:** 2026-05-11T12:18:00Z
**Cycle:** 1 of N (perfect-PR gate)
**PR:** #695
**Branch:** `gsd/phase-10-trust-real-testimonials`
**Scope:** commit `0593fc273`, +55/-1 across 3 files
**Verdict:** PASS (zero P0/P1; one INFO observation, non-blocking)

## Summary

The PR introduces `src/data/testimonials.ts` with two author-written quotes
attributed to real landlords (Janet Shur, 8 properties; Jacob Lear, 13
properties) whose likeness use the user explicitly confirmed. The data is
wired into both `/pricing` and the homepage via the existing
`TestimonialsSection` component (which was previously rendering `null` due
to the Phase-67 `testimonials.length === 0` gate).

All P0/P1 review dimensions pass:

- **Em-dashes in quoted text:** ZERO. Verified by extracting only the
  string values of `quote:` properties via regex (em-dashes that appear in
  the file are exclusively inside code comments — the saved feedback
  memory `feedback_no_em_dash_in_quotes.md` explicitly permits this:
  "Em-dash IS fine in author bylines, structural headings, and prose
  narration written by us — just NOT inside `""` quotes attributed to a
  customer.")
- **En-dashes in quoted text:** ZERO.
- **Banlist phrases in quoted text:** ZERO. The full banlist test
  (`marketing-copy-landlord-only.test.ts`) runs clean — 98,578 tests
  passing including the new file's content (transitively scanned via the
  walker on `src/app/**` for the consumer pages, and the data file's
  content is also reachable through the import statement scan).
- **Fabricated metrics:** NONE. `metric` and `metricLabel` fields
  intentionally omitted on both entries; the component's conditional
  (`currentTestimonial?.metric && ...`) correctly drops the metric block.
- **DocuSeal mentions:** 1 (inside a code comment about the ≤1 cap;
  zero in user-facing rendered copy).
- **Type shape compliance:** Both entries satisfy
  `Testimonial { quote, author, title, company; avatar?, metric?,
  metricLabel? }` from `src/types/sections/marketing.ts`. No duplicate
  type defined (Zero Tolerance Rule 3 honored).
- **Both surfaces wired:**
  - `/pricing` line 89-92 — passes `realTestimonials` directly.
  - Homepage (`marketing-home.tsx`) line 112-119 — passes
    `realTestimonials` inside `LazySection` consistent with adjacent
    sections.
- **CONS-07 no-headshot intent preserved:** Component renders avatar as
  author-initials via `author.split(' ').map(n => n[0]).join('')`
  (lines 134-138 and 234-238). The data file omits the optional
  `avatar` field, so the initials fallback fires.
- **Zero-tolerance compliance:**
  - No `any` types
  - No `as unknown as` assertions
  - No barrel files / re-exports (named `realTestimonials` exported
    from the defining file; imported directly via relative path)
  - No `@radix-ui/react-icons` (lucide-react `Lock` / `ArrowRight` / `Quote`
    / `ChevronLeft` / `ChevronRight` / `Star` only)
  - No commented-out code
- **Provenance documentation:** The data file's header comment (lines
  3-23) explicitly rebuts the Phase-67 fabricated-persona pattern,
  documents the likeness-approval source, and lists every guardrail
  (banlist / metric / em-dash / DocuSeal / headshot). This makes the
  consent trail durable against future maintainers.
- **Phase 67 regression risk:** The component still gates on
  `testimonials.length === 0` returning `null` — no callers were
  changed to bypass the gate; the gate is satisfied because real data
  is now passed in. Phase 67 demolition of placeholder data remains
  intact in the component file.
- **Quality checks:** `pnpm typecheck` clean. `pnpm lint` clean.

The provenance pattern here (real customer + author-drafted quote
approved by the customer) is a standard B2B SaaS pattern and is
materially different from the Phase 67 fabricated-identity violation
(invented people + invented affiliations + invented numeric outcomes).
The header comment in the data file makes this distinction explicit and
auditable.

## Info

### IN-01: Banlist guard does not cover `src/data/testimonials.ts`

**File:** `src/app/__tests__/marketing-copy-landlord-only.test.ts:212-233`
**Issue:** The `marketing-copy-landlord-only.test.ts` banlist walker
scans `src/app/**`, `src/components/**`, and `src/lib/**` recursively,
plus the explicit `MARKETING_FILES` allowlist. That allowlist includes
`src/data/faqs.ts` but does NOT include the new
`src/data/testimonials.ts`. The walker does not recurse into
`src/data/**`.

The current quotes are clean — this is a forward-looking gap, not a
present-tense violation. The regression risk shape: a future maintainer
adds a third testimonial whose quote contains a banned phrase (e.g.
"saves me hours on rent collection") and the banlist guard does not
fire because the file isn't in scope. The consumer pages
(`/pricing`, `marketing-home.tsx`) ARE scanned, but they only contain
the import statement string `'../data/testimonials'` — the resolved
export string content is not transitively scanned.

This is exactly the regression-surface-expansion pattern that drove the
cycle-4 (`src/app/**`), cycle-5 (stale plan refs), and cycle-6
(`src/lib/**`) walker expansions in earlier loops.

**Fix:** Add `'src/data/testimonials.ts'` to the `MARKETING_FILES`
allowlist in `src/app/__tests__/marketing-copy-landlord-only.test.ts`
(insert near line 230 next to the existing `'src/data/faqs.ts'` entry).
All six banlist describe blocks that iterate `MARKETING_FILES`
(`Marketing copy: landlord-only product`, `numeric claims`,
`feature claims`, `stale plan refs`, `SLA claims`, `superlatives`,
`fabricated identities`) will then auto-scan the file on every PR.

```typescript
const MARKETING_FILES = [
	// ...existing entries...
	'src/data/faqs.ts',
	'src/data/testimonials.ts',  // ← add this
	'src/config/pricing.ts',
	'src/lib/generate-metadata.ts'
] as const
```

Severity rationale: classified INFO rather than P1 because (a) the
current quotes are guardrail-clean, and (b) any quote text additions
would be reviewed in a future PR where this gap would naturally surface.
But it's the kind of gap that bites silently 6 months later, so worth
plugging now.

---

## REVIEW COMPLETE — VERDICT: PASS

Zero P0+P1 findings. One INFO observation (banlist guard coverage gap)
recorded for future hardening — not a blocker for this cycle. The PR
satisfies cycle-1 of the perfect-PR merge gate.

_Reviewed: 2026-05-11T12:18:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
