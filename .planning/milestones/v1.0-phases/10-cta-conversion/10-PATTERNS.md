# Phase 10: CTA & Conversion Standardization - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 5 new regression-test files (no production source changes — all CONS/TRUST code shipped via PRs #694/#695)
**Analogs found:** 5 / 5

> Phase 10 is a verify-and-pin phase. The only files written are 5 NEW Vitest
> regression tests. No production source is modified. Every test mechanic
> needed already exists in the codebase — the work is assertion authoring,
> not infrastructure. Mirror Phases 7-9's one-test-file-per-finding layout.

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/app/__tests__/cta-label-canonical.test.ts` | test (source-text scan) | transform (file → assertion) | `src/app/__tests__/marketing-home.test.tsx` | exact (same dir, same `readFileSync` scan pattern) |
| `src/app/compare/[competitor]/__tests__/compare-neutral-framing.test.tsx` | test (render + source scan) | request-response (render) + transform (scan) | `src/components/compare/__tests__/compare-breadcrumb.test.tsx` | exact (same domain `compare/`, same render pattern) |
| `src/components/contact/__tests__/contact-form-fields.test.tsx` | test (component render) | request-response (render) | `src/components/compare/__tests__/compare-breadcrumb.test.tsx` | role-match (component render in jsdom) |
| `src/data/__tests__/testimonials.test.ts` | test (data-shape + render) | transform (data array assertion) + request-response (render) | `src/components/sections/__tests__/home-faq.test.tsx` | role-match (exported-array shape pin + render) |
| `src/app/security-policy/__tests__/monitored-inboxes.test.ts` | test (source-text scan) | transform (file → assertion) | `src/app/__tests__/marketing-copy-landlord-only.test.ts` | exact (same `readFileSync` + `join(cwd, rel)` scan pattern) |

**Match-quality legend:** *exact* = analog shares role + data flow + project domain; *role-match* = analog shares role + test mechanic but different domain.

---

## Pattern Assignments

### `src/app/__tests__/cta-label-canonical.test.ts` (test, source-text scan — CONS-06)

**Analog:** `src/app/__tests__/marketing-home.test.tsx` (source-text scan) + `src/app/__tests__/marketing-copy-landlord-only.test.ts` (the `for (const rel of FILES)` walker shape)

**Imports pattern** (`marketing-home.test.tsx:15-17`):
```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
```
> No `@vitest-environment` pragma — pure file-scan tests do not touch the DOM.
> `marketing-copy-landlord-only.test.ts:14-16` uses `join` + `process.cwd()`
> instead of `resolve(__dirname, ...)`; either is fine. Prefer `join(cwd, rel)`
> for a multi-file walker (cleaner relative paths in the `it()` title).

**Core scan pattern — required-presence + banned-absence** (mirrors `marketing-home.test.tsx:28-44` for the `.not.toMatch`/`.toMatch` shape, `marketing-copy-landlord-only.test.ts:203-211` for the file-list walker):
```typescript
describe("CONS-06: canonical Contact Sales label", () => {
  const cwd = process.cwd();
  const KILLED_VARIANTS = [
    "Talk to Sales",
    "Connect with sales",
    "Schedule a walkthrough",
    "Schedule a demo",
  ] as const;
  // CONS-06 scope is WIDER than 10-CONTEXT's "4 string swaps" — verification
  // found "Contact Sales" in 12 locations across these 7 files.
  const CTA_FILES = [
    "src/app/about/page.tsx",
    "src/app/pricing/pricing-content.tsx",
    "src/app/faq/page.tsx",
    "src/app/help/page.tsx",
    "src/components/sections/home-faq.tsx",
    "src/components/pricing/kibo-style-pricing.tsx",
    "src/components/pricing/pricing-card-standard.tsx",
  ] as const;

  for (const rel of CTA_FILES) {
    it(`${rel} uses no killed CTA-label variant`, () => {
      const content = readFileSync(join(cwd, rel), "utf8");
      for (const variant of KILLED_VARIANTS) {
        expect(content, `${rel} still contains "${variant}"`).not.toContain(variant);
      }
    });
  }

  it("at least one canonical 'Contact Sales' label exists across CTA files", () => {
    const present = CTA_FILES.some((rel) =>
      readFileSync(join(cwd, rel), "utf8").includes("Contact Sales"),
    );
    expect(present, "no file carries the canonical 'Contact Sales' label").toBe(true);
  });
});
```

**Source-of-truth shape under test:** 12 verified `"Contact Sales"` occurrences across 7 files (10-RESEARCH.md "Code Examples"). Killed variants — `grep "Talk to Sales|Connect with sales|Schedule a walkthrough|Schedule a demo" src/` returns ZERO matches.

---

### `src/app/compare/[competitor]/__tests__/compare-neutral-framing.test.tsx` (test, render + source scan — CONS-07)

**Analog:** `src/components/compare/__tests__/compare-breadcrumb.test.tsx` (jsdom render, `next/link` mock) + `src/components/sections/__tests__/home-faq.test.tsx` (exported-array shape pin)

> **Key constraint:** `FeatureIcon` is NOT exported from `compare-sections.tsx`
> (it is a module-private function — see `compare-sections.tsx:6`). It can only
> be rendered transitively via the exported `FeatureTable`
> (`compare-sections.tsx:99`, which calls `<FeatureIcon support={feature.tenantflow} />`
> at line 132). The render test must construct a minimal `CompetitorData`
> fixture with an `'na'` feature row and assert against the rendered `<table>`.

**`@vitest-environment` pragma + imports** (`compare-breadcrumb.test.tsx:9-13`):
```typescript
/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
```

**`next/link` mock — copy verbatim** (`compare-breadcrumb.test.tsx:15-29`). `FeatureTable` itself does not render a `Link`, but `compare-sections.tsx:2` imports `next/link` at module scope and `BottomCta`/`WhySwitchSection` use it — if any sibling export is touched, the mock prevents jsdom failures. Safe to include:
```typescript
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: {
    children: React.ReactNode; href: string; className?: string;
  }) => <a href={href} {...props}>{children}</a>,
}));
```

**Core render pattern — `'na'` row renders neutral `Minus`** (render-then-query shape from `compare-breadcrumb.test.tsx:34-46`):
```typescript
import { FeatureTable } from "#app/compare/[competitor]/compare-sections";
import type { CompetitorData } from "#types/sections/compare";

// Minimal fixture — only `name` + `features` are read by FeatureTable's
// <table> body (compare-sections.tsx:122-151). Reuse the CompetitorData type;
// never redefine it (Zero Tolerance Rule 3).
function makeData(overrides: Partial<CompetitorData> = {}): CompetitorData {
  return {
    name: "TestCompetitor", slug: "x", blogSlug: "x", tagline: "", description: "",
    metaDescription: "", heroSubtitle: "", capterra: "", g2: "", founded: "",
    bestFor: "", tenantflowPricing: [], competitorPricing: [], whySwitch: [],
    competitorStrengths: [],
    features: [
      { name: "ACH / Payment Processing", tenantflow: "na",
        tenantflowNote: "By design — landlord-only platform", competitor: "yes" },
    ],
    ...overrides,
  };
}

it("renders the 'na' feature support with aria-label 'Not applicable'", () => {
  const { container } = render(<FeatureTable data={makeData()} />);
  const naIcon = container.querySelector('[aria-label="Not applicable"]');
  expect(naIcon).not.toBeNull();
  // Neutral framing — muted-foreground, NOT destructive red.
  expect(naIcon).toHaveClass("text-muted-foreground");
});
```

**Source-scan pattern — `compare-data.ts` has exactly 4 `'na'` rows** (exported-data assertion, mirrors `home-faq.test.tsx:13-15` `toHaveLength` shape — but via `readFileSync` since `compare-data.ts` exports a nested `Record`, not a flat array):
```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";

it("compare-data.ts pins exactly 4 tenantflow:'na' rows (3x ACH/Payment, 1x HOA)", () => {
  const src = readFileSync(
    join(process.cwd(), "src/app/compare/[competitor]/compare-data.ts"), "utf8",
  );
  const naMatches = src.match(/tenantflow:\s*"na"/g) ?? [];
  expect(naMatches).toHaveLength(4);
});
```
> Alternative: `import { COMPETITORS } from "#app/compare/[competitor]/compare-data"`
> then flatten `Object.values(COMPETITORS).flatMap(c => c.features)` and
> `.filter(f => f.tenantflow === "na")` — a behavioral assertion preferable to
> a string scan. Planner's discretion; the `readFileSync` form is shown for
> consistency with the `marketing-home.test.tsx` analog.

**Type-contract pin** (compile-time + runtime — `FeatureSupport` union includes `'na'`, `compare.ts:5`):
```typescript
// A trivial assignability check pins the union member at compile time;
// no runtime assertion needed beyond the render test above.
```

**OUT-OF-SCOPE flag (do NOT assert/fix in Phase 10):** the `yes`/`no`/`partial`/`addon`
cases of `FeatureIcon` use raw Tailwind palette colors (`text-green-600`,
`text-red-400`, `text-amber-500`, `text-blue-500`) that are NOT `globals.css`
tokens. That drift is owned by Phase 11 / TOKEN-03. Only the `'na'` case's
`text-muted-foreground` is in-scope and correct.

---

### `src/components/contact/__tests__/contact-form-fields.test.tsx` (test, component render — CONS-08)

**Analog:** `src/components/compare/__tests__/compare-breadcrumb.test.tsx` (jsdom render + query)

**`@vitest-environment` pragma + imports** (`compare-breadcrumb.test.tsx:9-13`):
```typescript
/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
```

**Render pattern — `ContactFormFields` is prop-driven** (`contact-form-fields.tsx:20-30`). It takes `formData: ContactFormRequest`, `errors`, `onInputChange`. Construct a minimal `formData` and a no-op `onInputChange`:
```typescript
import { ContactFormFields } from "#components/contact/contact-form-fields";
import type { ContactFormRequest } from "#types/domain";

const baseFormData: ContactFormRequest = {
  name: "", email: "", company: "", phone: "",
  subject: "", type: "", message: "",
} satisfies Partial<ContactFormRequest> as ContactFormRequest;
// NOTE: `ContactFormRequest.type` is typed `"sales" | "support" | "general"`
// in src/types/domain.ts:45 — verify the exact required-field set against
// that file before finalizing the fixture. Reuse the type; never redefine it.

it('"How did you hear about us?" select shows the "Please select" placeholder', () => {
  render(
    <ContactFormFields
      formData={baseFormData}
      errors={{}}
      onInputChange={() => {}}
    />,
  );
  // The Radix SelectValue renders the placeholder text when no value is set.
  expect(screen.getByText("Please select")).toBeInTheDocument();
});
```

**Source-scan fallback** — if the Radix `Select` placeholder proves hard to query in jsdom (Radix portals + no native `<select>`), pin the literal string instead, mirroring `marketing-home.test.tsx:19-26`:
```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const src = readFileSync(
  resolve(__dirname, "..", "contact-form-fields.tsx"), "utf8",
);
it('referralSource select uses placeholder "Please select", no default value', () => {
  expect(src).toMatch(/<SelectValue placeholder="Please select" \/>/);
  // No `value=` default on the referralSource Select beyond the bound formData.type.
});
```

**Source-of-truth shape under test:** `contact-form-fields.tsx:155-174` — the
"How did you hear about us?" `<Field>` with `name="referralSource"`,
`<SelectValue placeholder="Please select" />`, six `<SelectItem>` options
(search/social/referral/sales/conference/other), no hardcoded default `value`.

---

### `src/data/__tests__/testimonials.test.ts` (test, data-shape pin + render — TRUST-01/04)

**Analog:** `src/components/sections/__tests__/home-faq.test.tsx` (exported-array shape pin: `toHaveLength`, `.map(...)` + `.not.toContain`)

> **CONTEXT-vs-reality conflict (10-RESEARCH.md Q1):** 10-CONTEXT.md (stale)
> says TRUST-01 is deferred. Reality: `src/data/testimonials.ts` ships
> **2 real, attributed testimonials** (PR #695 follow-up). REQUIREMENTS.md
> asks for "≥3". **Pin `>= 2`, NOT `>= 3`** — a `>= 3` assertion would fail,
> and fabricating a 3rd is explicitly rejected (re-introduces the Phase 67
> fabricated-attribution problem). Record "3rd testimonial pending next
> opt-in customer" as a deferred item.

**Imports pattern** (`home-faq.test.tsx:8-10` — render test; data-shape part needs no DOM):
```typescript
import { describe, expect, it } from "vitest";
import { realTestimonials } from "#data/testimonials";
```

**Core data-shape pin** (mirrors `home-faq.test.tsx:13-20` `toHaveLength` + `.map` + negative assertion):
```typescript
describe("TRUST-01: realTestimonials data shape", () => {
  it("ships at least 2 real testimonials", () => {
    expect(realTestimonials.length).toBeGreaterThanOrEqual(2);
  });

  it("every testimonial has a non-empty quote, author, and company", () => {
    for (const t of realTestimonials) {
      expect(t.quote.trim().length, `${t.author}: empty quote`).toBeGreaterThan(0);
      expect(t.author.trim().length, "empty author").toBeGreaterThan(0);
      expect(t.company.trim().length, `${t.author}: empty company`).toBeGreaterThan(0);
    }
  });

  it("no fabricated metric field (honesty guardrail — testimonials.ts header)", () => {
    for (const t of realTestimonials) {
      expect(t.metric, `${t.author} carries a metric`).toBeUndefined();
    }
  });

  it("no headshot avatar (renders as initials per testimonials.ts header)", () => {
    for (const t of realTestimonials) {
      expect(t.avatar, `${t.author} carries an avatar`).toBeUndefined();
    }
  });
});
```

**Render pattern — `TestimonialsSection` empty-state gate** (`@vitest-environment jsdom` pragma needed for THIS describe block; render shape from `compare-breadcrumb.test.tsx:34`). **CRITICAL — Pitfall 3:** import the `sections/` variant, NOT `landing/`:
```typescript
/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { TestimonialsSection } from "#components/sections/testimonials-section";
import { realTestimonials } from "#data/testimonials";

it("renders nothing when testimonials is empty (length===0 gate)", () => {
  const { container } = render(<TestimonialsSection testimonials={[]} />);
  expect(container).toBeEmptyDOMElement();
});

it("renders the real testimonial quotes when passed realTestimonials", () => {
  const { container } = render(
    <TestimonialsSection testimonials={realTestimonials} />,
  );
  expect(container).not.toBeEmptyDOMElement();
  // First testimonial quote appears in the carousel blockquote.
  expect(container.textContent).toContain(realTestimonials[0]!.quote);
});
```
> `testimonials-section.tsx:59-61` is the gate: `if (testimonials.length === 0) return null;`.
> The `landing/testimonials-section.tsx` variant always renders `null` (its
> `features-data.ts` `testimonials` export is `[]`) — do NOT test it for TRUST-01.

**Source-of-truth shape under test:** `src/data/testimonials.ts` — `realTestimonials`
array, 2 entries (Janet Shur / "8 properties", Jacob Lear / "13 properties"),
each `{ quote, author, title: "Landlord", company }`. `Testimonial` type at
`src/types/sections/marketing.ts:10-18`.

---

### `src/app/security-policy/__tests__/monitored-inboxes.test.ts` (test, source-text scan — TRUST-03/04)

**Analog:** `src/app/__tests__/marketing-copy-landlord-only.test.ts` (`readFileSync` + `join(cwd, rel)` source scan) + `src/app/__tests__/marketing-home.test.tsx` (`.toMatch` regex assertion)

**Imports pattern** (`marketing-copy-landlord-only.test.ts:14-16` — no DOM pragma):
```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
```

**Core scan pattern — both inboxes + SLA copy present** (mirrors `marketing-home.test.tsx:19-26` `readFileSync` + `.toMatch`/`.toContain` shape):
```typescript
describe("TRUST-03/04: monitored-inbox documentation", () => {
  const src = readFileSync(
    resolve(__dirname, "..", "page.tsx"), "utf8",
  );

  it("security-policy documents the security@ inbox", () => {
    expect(src).toContain("security@tenantflow.app");
  });

  it("security-policy documents the sales@ inbox", () => {
    expect(src).toContain("sales@tenantflow.app");
  });

  it("documents the § 7 'Contact & Monitored Inboxes' section", () => {
    // &amp; — the page escapes the ampersand in JSX (page.tsx:180).
    expect(src).toMatch(/Contact &amp; Monitored Inboxes/);
  });

  it("documents the security@ 24-hour acknowledgement SLA", () => {
    expect(src).toMatch(/Acknowledged within 24 hours/);
  });

  it("documents the sales@ 1-business-day response SLA", () => {
    expect(src).toMatch(/within 1 business day/);
  });
});
```
> **Gotcha:** `security-policy/page.tsx` is exempt from the SLA banlist
> (`marketing-copy-landlord-only.test.ts:288` — `"src/app/security-policy/page.tsx": ["sla"]`).
> The "within 24 hours" string here is a documented disclosure timeline, not a
> marketing claim. This new test asserts that string is *present* — the
> opposite intent — and is consistent with the banlist exemption.

**Source-of-truth shape under test:** `security-policy/page.tsx:178-202` — § 7
"Contact & Monitored Inboxes". `security@tenantflow.app` ("Acknowledged within
24 hours per § 3."), `sales@tenantflow.app` ("Responded to within 1 business
day (US business hours, Monday through Friday)."). `security@` also appears at
line 48-51 in an earlier section.

---

## Shared Patterns

### jsdom render setup
**Source:** `src/components/compare/__tests__/compare-breadcrumb.test.tsx:9-29`
**Apply to:** `compare-neutral-framing.test.tsx`, `contact-form-fields.test.tsx`, the render block of `testimonials.test.ts`
```typescript
/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Copy verbatim only when the component-under-test (or a module-scope import
// in its file) pulls in next/link. FeatureTable's file imports next/link at
// module scope (compare-sections.tsx:2) — include the mock there.
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: {
    children: React.ReactNode; href: string; className?: string;
  }) => <a href={href} {...props}>{children}</a>,
}));
```
> The `unit` Vitest project is jsdom by default per `vitest.config.ts`, but the
> proven analog files still carry the explicit `/** @vitest-environment jsdom */`
> pragma — keep it for parity and clarity.

### Source-text drift-guard scan
**Source:** `src/app/__tests__/marketing-copy-landlord-only.test.ts:14-16, 203-211` + `src/app/__tests__/marketing-home.test.tsx:15-26`
**Apply to:** `cta-label-canonical.test.ts`, `monitored-inboxes.test.ts`, the `compare-data.ts` `'na'`-count assertion
```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path"; // or `resolve` for __dirname-relative paths
import { describe, expect, it } from "vitest";

const content = readFileSync(join(process.cwd(), relPath), "utf8");
expect(content, `helpful failure message`).toContain("required string");
expect(content, `helpful failure message`).not.toContain("banned string");
```
> Always pass the 2nd `expect(value, message)` argument — every analog does;
> it makes a drift failure self-explaining.

### Exported-array / data shape pin
**Source:** `src/components/sections/__tests__/home-faq.test.tsx:13-20`
**Apply to:** `testimonials.test.ts` (realTestimonials count + field shape)
```typescript
import { realTestimonials } from "#data/testimonials";
expect(realTestimonials).toHaveLength(/* or .length).toBeGreaterThanOrEqual */);
for (const t of realTestimonials) { /* per-entry field assertions */ }
```

### Test-running command (CLAUDE.md is STALE)
**Source:** 10-RESEARCH.md Pitfall 2 + "State of the Art"
**Apply to:** every per-task verification step in the plan
```bash
# Single file — CORRECT (verified working):
bunx vitest --run --project unit src/path/to/file.test.ts

# Full unit project:
bun run test:unit

# CLAUDE.md's documented `bun run test:unit -- --run <file>` form CRASHES
# post-Vitest-4 (duplicate --run → "Expected a single value" CAC error).
# Do NOT use it for single-file runs.
```

---

## Project Convention Constraints (from CLAUDE.md — apply to all 5 test files)

- **No `any` types** — the `next/link` mock uses a precise inline type (see analog). Test fixtures use the real `CompetitorData` / `ContactFormRequest` / `Testimonial` types.
- **No duplicate types** — `FeatureSupport`, `CompetitorData`, `FeatureRow`, `ContactFormRequest`, `Testimonial` all exist in `src/types/` — import and reuse, never redefine.
- **No barrel files** — import directly from defining files via `#` subpath aliases (`#components/...`, `#types/...`, `#data/...`, `#app/...`).
- **No emojis in code.**
- **Vitest 4 + chai 6 bug** — if any test asserts a throw, use `.rejects.toMatchObject({ message: expect.stringContaining(...) })`, never `.rejects.toThrow('string')`. (None of the 5 Phase-10 tests assert throws — informational.)
- **`vi.hoisted()`** for any mock variable referenced inside `vi.mock()`. (The `next/link` mock here is self-contained — no hoisted variable needed.)
- **Max 300 lines/file, 50 lines/function** — all 5 test files will be well under budget.
- **Perfect-PR merge gate** — plan for at least one fix cycle; two consecutive zero-finding review cycles required.
- **Branch** — `gsd/phase-10-cta-conversion` (per 10-CONTEXT.md). Feature branch → push → `gh pr create`. Never push to `main`.

---

## No Analog Found

None. Every Phase-10 test file has a strong analog. The codebase already proves
both required test mechanics (jsdom component render + `readFileSync` source
scan) at scale — `marketing-copy-landlord-only.test.ts` runs ~100,161 assertions
green. No new test infrastructure, fixtures, or dependencies are needed.

**TRUST-02 (review badges):** correctly deferred — no code surface, no test. Not
a "no analog" case; it is an intentional non-deliverable.

---

## Metadata

**Analog search scope:** `src/app/__tests__/`, `src/components/compare/__tests__/`, `src/components/sections/__tests__/`, `src/components/marketing/__tests__/`
**Files scanned (analogs + sources under test):** `compare-breadcrumb.test.tsx`, `marketing-copy-landlord-only.test.ts`, `marketing-home.test.tsx`, `home-faq.test.tsx`, `testimonials.ts`, `compare-sections.tsx`, `compare-data.ts`, `compare.ts`, `contact-form-fields.tsx`, `testimonials-section.tsx`, `security-policy/page.tsx`, `marketing.ts`
**Project skills present:** `frontend-design`, `rls-policies`, `sql-migration-rules` (none directly govern test authoring)
**Pattern extraction date:** 2026-05-20
