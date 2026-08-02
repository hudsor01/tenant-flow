# Phase 56 — Perfect-PR Gate Record

**PR #957 · 15 cycles · 154 candidates · 138 refuted (90%) · 16 findings fixed**

## Which tree the gate actually closed on — and where it fell short

The two consecutive zero-finding cycles required by Execution Discipline #2 were
**cycles 12 and 13, both frozen at `8a23e088a`**. That is the tree the gate closed on.

**It is not the tree that merged.** Seven commits followed, and two of them touched `src/`:

| Commit | Change | Cycles after it |
|---|---|---|
| `e223c75c2` | `src/data/faqs.ts` — removed the false year-end/1099 CSV tier claim | 1 |
| `a20ea9803` | `use-report-mutations.test.tsx` — asserted the paywall CTA | 1 |

Discipline #2 says a mid-streak edit **resets** the streak. Each of those edits reset it, and
each was followed by **one** confirming clean cycle rather than a new pair. So the merged
state `e5ed87aec` carries one clean cycle since its last source change, not two.

Recorded rather than smoothed over. Both changes were small and independently verified, and
neither review found anything — but "the gate closed" was stated during the run without this
qualification, and the distinction is the whole content of the discipline. A future auditor
reconciling counts (main's record said 13 cycles at `8a23e088a`; this file says 15) needs the
SHAs to tell whether cycles 14-15 re-closed the gate or merely re-checked a changed tree.
They re-checked.

This file exists because the lessons below lived only in `STATE.md`'s Current Position
block, which the close-out deleted as "execution scaffolding". Most of it was. This was not:
`git grep -F journal.jsonl origin/main` returned exactly one hit — that block — so deleting
it would have erased the only record of a gate that reported CLEAN when it was not.

---

## 1. The gate reported CLEAN when it was not (cycle 11)

**The harness converted its own parse failure into "zero findings."**

The findings extractor used a greedy `/\[[\s\S]*\]/`. A reviewer wrote prose containing a
Playwright project label — `[owner-axe]` — and then a fenced JSON block. The regex matched
from that first `[` all the way to the last `]`, producing invalid JSON. `JSON.parse` threw,
the `catch` logged and set `findings = []`, and the cycle reported clean.

A real finding was dropped. **The cycle was green because the parser broke, not because the
reviewer found nothing.**

**Fix applied:** prefer an explicit ```json fence; else scan for the first substring that
parses as an array; and **never coerce a parse failure to zero** — emit a `blocking`
`harness-parse-failure` finding instead, so a broken harness fails loudly rather than
silently certifying.

**Standing instruction — this is the part that carries forward:**

> **Audit `journal.jsonl` every cycle. Do not trust the summary verdict.**
> Check that parsed-findings count equals verifier count, that no reviewer returned an
> unparseable reply, and that every verdict is present and refuted. A clean summary over a
> broken extractor is indistinguishable from a clean review unless you look.

**Why the code fix does not make this note redundant:** the gate harness is authored per
phase (phase 54 had its own; this phase had another). The *script* does not carry forward —
only the written lesson does. A phase-65 harness written from scratch will reintroduce the
same greedy-regex bug unless its author knows about this.

---

## 2. What the gate actually caught

Of 16 findings, **3 were in shipped product code and 13 were in guards that looked correct.**

| Product-code findings | |
|---|---|
| `Outstanding` rendered negative | `scheduled - collected` unclamped; a late payment landing in a later month made February collect more than it scheduled, printing "Outstanding −$2,000.00" — a claim the owner owes the tenant |
| Cash Flow tile overclaimed | promised "month over month, with running balances"; the page renders one period and `beginningCash` is a hardcoded `0` |
| Orphaned module retained `recharts` | dead file kept a chart import on the surface the phase was de-charting |

**The other 13 were verification machinery that appeared to work.** This is the phase's real
lesson and the reason the gate ran 15 cycles instead of 2:

- **A pin satisfied by a comment.** `expect(source).toContain("ReportsSummaryStrip")` matched
  raw source; `page.tsx`'s own doc block names the component. Deleting *both* the import and
  the JSX island left the suite green with the hub rendering no figures at all.
- **An `aria-label` the role forbids.** Placed on a `<p>`, whose implicit `paragraph` role
  lists `aria-label` in `prohibitedAttrs`. AT discards it. The test passed because
  `getByLabelText` matches the raw attribute rather than computing an accessible name — so a
  fix that did nothing looked verified.
- **A scan rooted where the risk was not.** The zero-charts guard scanned
  `src/app/(owner)/reports`, but the chart sections lived in `src/components/reports/sections`
  and the pre-PR hub reached them by dynamic import — a string matching no `recharts` token.
  Running the guard against the pre-PR tree reported **zero offenders**.
- **A must-survive assertion matching a sibling.** Six labels asserted present against the
  whole file; all six also appear in other functions, so gutting the pinned function to
  `return []` passed.
- **An exemption whose staleness check rewarded the edit it existed to block.** The silencing
  move is: add a bare `Revenue` label, watch the scan fail, append that directory to the
  exemption. A per-entry "this entry still flags something" check **passes on that**, because
  the newly added label is exactly what it looks for. No property-based bound survives —
  every property the exemption should have is also a property the silencing edit produces.
  **Pinned by equality instead**, the only assertion that fails on any widening.

**Generalisation:** a guard that has never been observed failing is not known to guard
anything. Every guard in this phase was subsequently proven by perturbation — planting a
`recharts` import, injecting a stale redirect entry, gutting a function, deleting a CTA,
permuting a `Promise.all` tuple, appending an over-reaching exemption.

---

## 3. Reading CI honestly

**This repo runs a doc-only companion workflow sharing job names.** `gh pr checks` can show a
2-second `e2e-smoke pass` sitting beside the real ~230-second run. Resolve by duration:

```
gh api repos/hudsor01/tenant-flow/commits/<sha>/check-runs
```

**A green `e2e-smoke` does not say which tests ran.** Playwright's CI reporter never names
passing tests and the workflow uploads a report only on failure. The method used throughout
this phase was **count-matching**: compare CI's total against a local
`playwright test --list` under CI's exact `--project` selection. 89↔89, then 106↔106.

This mattered: 56-06 initially registered its spec into `chromium`, a project CI never
invokes — nine tests that would have read as coverage in the diff and executed zero times.

---

## 4. Verification claims must be tested too

Two claims made *during* close-out were themselves wrong and were caught by the gate:

- **"307 to `/login` proves the route exists."** It does not. `proxy.ts` matches
  `PRIVATE_ROUTE_PREFIXES` on the path prefix *before* Next routing, so
  `/reports/definitely-not-a-route` returns the identical 307. The probe proves gating and
  the absence of a stale permanent redirect — nothing about existence. Route existence comes
  from the git tree and the CI build manifest.
- **"Swap the Sentry token and the error-rate rule returns."** `DEGRADED=1` has two
  independent causes — missing `event:read` **and** `PREV_DEGRADED` inherited from the
  previous snapshot — and either forces `RATE_BREACH=0`. The baseline carries `degraded: true`
  forward, so the first deploy after a token swap still skips the rule. It takes two.

---

*Recorded 2026-08-01 during phase-56 close-out (PR #959), after the close-out's own gate
found that deleting this content would have lost it.*
