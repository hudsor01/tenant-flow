# Phase 7: Pricing-Card Chrome - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 5 (3 source components + 2 test files to create)
**Analogs found:** 5 / 5

## Important Finding — Source Fixes Already Implemented

A read of the three target components shows **all three CONS fixes are already in source**:

| Req | Fix | Location | State in source |
|-----|-----|----------|-----------------|
| CONS-05 | Badge `top-0 -translate-y-1/2` (was `-top-4`) | `pricing-card-featured.tsx:146` | DONE — `absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10` |
| CONS-09 | `whitespace-nowrap` on price-row flex | `pricing-card-standard.tsx:171`, `pricing-card-featured.tsx:173` | DONE — both containers carry `whitespace-nowrap` |
| CONS-10 | Per-card "Save $X/year"; global badge removed | both cards lines ~191-200 / ~199-208; `bento-pricing-section.tsx:103-107` | DONE — per-card `text-success` savings line present; global badge removed (only a comment remains) |

Two divergences from RESEARCH.md to note for the planner:

1. **Savings math is inlined as `plan.price.monthly * 2`, NOT `calculateAnnualSavings()`.** RESEARCH.md recommended the helper. The shipped code uses `plan.price.monthly * 2` wrapped in `formatCurrency(...)`. The two are mathematically identical (`monthly×12 − monthly×10 = monthly×2`). The shipped inline form is acceptable and matches the in-file comment (`AUDIT-2 cycle-2 P3`). **Do not "fix" this to use the helper** — it would be a churn-only diff. The `z-10` (not `z-20`) on the badge wrapper is also the shipped choice and is fine.
2. **`formatCurrency` from `#lib/utils/currency`, not `NumberFlow`.** RESEARCH.md examples referenced `@number-flow/react`/`NumberFlow`; the actual cards render prices via `formatCurrency(...)` inside a `<span>`. Tests must assert against `formatCurrency` output (`$19`, `$38`, etc.).

**Consequence for the planner:** Phase 7's *only* remaining work is the **Wave 0 test files** — `src/components/pricing/__tests__/pricing-card-standard.test.tsx` and `src/components/pricing/__tests__/pricing-card-featured.test.tsx` (and optionally `bento-pricing-section.test.tsx` + a `calculateAnnualSavings` test). The plans should be framed as **regression-pinning tests for already-shipped fixes**, not as code changes. If the planner still wants belt-and-suspenders, a no-op verification pass on the three component files confirms the classes are present.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/pricing/__tests__/pricing-card-standard.test.tsx` | test | render-assertion | `src/components/blog/blog-pagination.test.tsx` | exact (jsdom render + className + role assertions) |
| `src/components/pricing/__tests__/pricing-card-featured.test.tsx` | test | render-assertion | `src/components/blog/blog-pagination.test.tsx` | exact |
| `src/components/pricing/__tests__/bento-pricing-section.test.tsx` (optional) | test | render-assertion | `src/components/sections/__tests__/home-faq.test.tsx` | exact (assert absence of removed element) |
| `src/components/pricing/pricing-card-featured.tsx` | component | event-driven (UI state) | already-fixed; self-reference | n/a — verify-only |
| `src/components/pricing/pricing-card-standard.tsx` | component | event-driven (UI state) | already-fixed; self-reference | n/a — verify-only |
| `src/components/pricing/bento-pricing-section.tsx` | component | event-driven (UI state) | already-fixed; self-reference | n/a — verify-only |

## Pattern Assignments

### `src/components/pricing/__tests__/pricing-card-standard.test.tsx` (test, render-assertion)

**Analog:** `src/components/blog/blog-pagination.test.tsx`

**Required mocks.** The pricing cards import `useMutation`, `createClient` (Supabase), `createCheckoutSession`, `checkoutRateLimiter`, `createLogger`, `toast`, and render `OwnerSubscribeDialog`. A pure `render()` of `PricingCardStandard` will pull all of these. Mock them with `vi.hoisted()` per the project convention (CLAUDE.md: "`vi.hoisted()` for any mock variable referenced in `vi.mock()`"). The analog's hoisted-mock structure is the template:

```typescript
// Source pattern: src/components/blog/blog-pagination.test.tsx:14-24
const mockMutate = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutateAsync: mockMutate, isPending: false }),
}));
vi.mock("#lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));
vi.mock("./owner-subscribe-dialog", () => ({ OwnerSubscribeDialog: () => null }));
```

**Test file header convention** (analog `blog-pagination.test.tsx:1-8`):
```typescript
/**
 * PricingCardStandard component tests — Phase 7 CONS-09 / CONS-10 regression pins.
 *
 * @vitest-environment jsdom
 */
```

**Render + className assertion pattern** (analog `blog-pagination.test.tsx:102-108`):
```typescript
import { render } from "@testing-library/react";
// ...
it("price-row container carries whitespace-nowrap (CONS-09)", () => {
  const { container } = render(
    <PricingCardStandard plan={starterPlan} billingCycle="monthly" variant="starter" />,
  );
  // price row is the flex container holding the $XX span + /mo span
  const priceRow = container.querySelector(".flex.items-baseline");
  expect(priceRow).toHaveClass("whitespace-nowrap");
});
```

**Conditional-render text assertion pattern** (analog `home-faq.test.tsx:22-25` + `blog-pagination.test.tsx:34-36`):
```typescript
import { render, screen } from "@testing-library/react";
// ...
it('renders "Save $38/year" for Starter when annual (CONS-10)', () => {
  render(<PricingCardStandard plan={starterPlan} billingCycle="yearly" variant="starter" />);
  expect(screen.getByText(/Save\s+\$38\/year/)).toBeInTheDocument();
});

it("hides the savings line on monthly (CONS-10)", () => {
  render(<PricingCardStandard plan={starterPlan} billingCycle="monthly" variant="starter" />);
  expect(screen.queryByText(/\/year/)).toBeNull();
});
```

**Note on the savings text.** The card renders `Save{" "}{formatCurrency(...)}/year` — the dollar figure and `/year` are separate text nodes split by JSX whitespace. Use a **regex matcher with `\s+`** (`/Save\s+\$38\/year/`) — an exact-string `getByText("Save $38/year")` will miss because Testing Library normalizes the nodes differently. This is the load-bearing detail; the analog's plain string matches work only because its text is a single node.

**Test data.** Build a minimal `PricingPlan` literal in the test file (the `interface PricingPlan` is defined locally in `pricing-card-standard.tsx:25-43`). Required fields: `id`, `name`, `description`, `audienceTagline`, `price: { monthly, yearly }`, `annualTotal`, `features: []`, `popular`, `stripeMonthlyPriceId`, `stripeAnnualPriceId`. Use Phase 5 numbers: Starter `monthly: 19, annualTotal: 190`; Max `monthly: 149, annualTotal: 1490`.

---

### `src/components/pricing/__tests__/pricing-card-featured.test.tsx` (test, render-assertion)

**Analog:** `src/components/blog/blog-pagination.test.tsx` (identical structure to the Standard test file)

**Same mock set** as the Standard test (the Featured card imports the same `useMutation` / `createClient` / `createCheckoutSession` / `OwnerSubscribeDialog` stack — verified `pricing-card-featured.tsx:1-21`).

**CONS-05 badge-position assertion** — the load-bearing class set is on the badge *wrapper* `<div>`, not the `<Badge>` itself (`pricing-card-featured.tsx:146`):
```typescript
it("Most Popular badge wrapper uses top-0 -translate-y-1/2, not -top-4 (CONS-05)", () => {
  const { container } = render(
    <PricingCardFeatured plan={growthPlan} billingCycle="monthly" />,
  );
  const badgeWrapper = container.querySelector(".absolute.top-0");
  expect(badgeWrapper).toBeTruthy();
  expect(badgeWrapper).toHaveClass("-translate-y-1/2");
  expect(badgeWrapper).not.toHaveClass("-top-4");
});
```
The `.not.toHaveClass("-top-4")` line is the regression guard — it fails loudly if the badge ever reverts.

**CONS-09 defensive nowrap** — Featured price row is `flex items-baseline justify-center gap-1 whitespace-nowrap` (`pricing-card-featured.tsx:173`). Assert on the `.justify-center` flex container to disambiguate from any other `.flex.items-baseline`.

**CONS-10 savings** — Growth `monthly: 49, annualTotal: 490`; assert `/Save\s+\$98\/year/` when `billingCycle="yearly"`, absent when `"monthly"`. Featured card savings line is `text-sm font-semibold text-success` (`pricing-card-featured.tsx:192`).

---

### `src/components/pricing/__tests__/bento-pricing-section.test.tsx` (test, render-assertion — optional)

**Analog:** `src/components/sections/__tests__/home-faq.test.tsx`

`home-faq.test.tsx` is the canonical "assert a removed element is absent" pattern (lines 22-25 — `screen.queryByText(...)` expected `null`). Mirror it for the dropped global savings badge:

```typescript
it("toggle bar renders no global 'Save $' badge (CONS-10 — removed)", () => {
  render(<BentoPricingSection defaultBillingCycle="yearly" />);
  // the toggle row previously held a global "Save $98" badge; CONS-10 removed it
  expect(screen.queryByText(/Save \$98/)).toBeNull();
});
```

`BentoPricingSection` pulls `getAllPricingPlans()` from `#config/pricing` (real config — fine to leave un-mocked, it's pure) and renders both card components. The cards still need the `useMutation` / `createClient` / `OwnerSubscribeDialog` mocks. Heavier render surface than the per-card tests — the planner may skip this file and rely on the per-card tests plus the `calculateAnnualSavings` unit test, since CONS-10's removal is already implicitly covered by the per-card savings tests.

---

### `calculateAnnualSavings()` unit coverage (optional — `src/config/__tests__/pricing.test.ts`)

No `src/config/__tests__/` directory exists. If pinning the helper, this is a 3-assertion pure-function test (no jsdom, no mocks):

**Source under test** (`src/config/pricing.ts:282-286`):
```typescript
export function calculateAnnualSavings(monthlyPrice: number): number {
  const yearlyPrice = monthlyPrice * 10;
  const monthlyCost = monthlyPrice * 12;
  return monthlyCost - yearlyPrice;
}
```

```typescript
import { describe, expect, it } from "vitest";
import { calculateAnnualSavings } from "#config/pricing";

describe("calculateAnnualSavings (Phase 7 CONS-10 math)", () => {
  it("Starter $19/mo -> $38/year", () => expect(calculateAnnualSavings(19)).toBe(38));
  it("Growth $49/mo -> $98/year", () => expect(calculateAnnualSavings(49)).toBe(98));
  it("Max $149/mo -> $298/year", () => expect(calculateAnnualSavings(149)).toBe(298));
});
```
Note: the cards inline `monthly * 2` rather than calling this helper, so this test pins the helper for *future* callers, not the current card render path. The card-render tests above are what actually pin the displayed savings.

## Shared Patterns

### Test framework conventions
**Source:** `src/components/blog/blog-pagination.test.tsx`, `src/components/sections/__tests__/home-faq.test.tsx`, CLAUDE.md
**Apply to:** all three new test files
- `@vitest-environment jsdom` in the file-header docblock for any test that calls `render()`.
- `import { render, screen } from "@testing-library/react"`; `import userEvent from "@testing-library/user-event"` only if simulating clicks (not needed here — billing state is a prop, not an interaction).
- `vi.hoisted()` for every mock variable referenced inside a `vi.mock()` factory (CLAUDE.md Testing section).
- `.rejects.toMatchObject({ message: expect.stringContaining(...) })` instead of `.rejects.toThrow('string')` (chai 6 bug) — not needed here since these tests assert render output, not throws.
- Place test files in a co-located `__tests__/` directory (`src/components/pricing/__tests__/`) — matches `src/components/sections/__tests__/`, `src/components/ui/__tests__/`. Note `src/components/blog/` co-locates `.test.tsx` next to source; the project mixes both — prefer `__tests__/` here since RESEARCH.md Wave 0 specified that path.

### Mocking the checkout/Supabase dependency stack
**Source:** import block of `pricing-card-standard.tsx:1-21` and `pricing-card-featured.tsx:1-21`
**Apply to:** `pricing-card-standard.test.tsx`, `pricing-card-featured.test.tsx`, `bento-pricing-section.test.tsx`
Both cards import the same external surface — mock all of it so `render()` does not touch network/auth:
```typescript
vi.mock("@tanstack/react-query", () => ({ useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("#lib/supabase/client", () => ({ createClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }) }));
vi.mock("#lib/stripe/stripe-client", () => ({ createCheckoutSession: vi.fn() }));
vi.mock("#lib/security", () => ({ checkoutRateLimiter: { canMakeRequest: () => true } }));
vi.mock("#lib/frontend-logger", () => ({ createLogger: () => ({ error: vi.fn(), info: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { loading: vi.fn(), error: vi.fn(), dismiss: vi.fn() } }));
vi.mock("../owner-subscribe-dialog", () => ({ OwnerSubscribeDialog: () => null }));
```
`#components/ui/badge`, `#components/ui/button`, `#lib/utils` (`cn`), `#lib/utils/currency` (`formatCurrency`) are pure — leave un-mocked so `formatCurrency` produces real `$19` / `$38` strings the assertions match against.

### Currency-formatted text assertions
**Source:** `src/lib/utils/currency.ts:26-48` (`formatCurrency`)
**Apply to:** every savings/price text assertion
`formatCurrency(38, { maximumFractionDigits: 0, minimumFractionDigits: 0 })` -> `"$38"`. The card JSX is `Save{" "}{formatCurrency(...)}/year` — three sibling text nodes. Always match with a `\s+`-tolerant regex (`/Save\s+\$38\/year/`), never an exact string.

### Design-token constraint (read-only awareness)
**Source:** CLAUDE.md zero-tolerance rules + 07-UI-SPEC.md Color section
**Apply to:** any verification pass on the three source components
The shipped classes are all token-backed: `bg-primary`, `text-primary-foreground`, `text-success`, `bg-card/95`. No hex / `rgb()` / `bg-white` / inline `style` / inline `[NNNms]`. If the planner schedules a verify-only pass, confirm these classes are unchanged — do not introduce new tokens.

## No Analog Found

None. All test files map cleanly to existing render-based component test analogs in the repo.

## Metadata

**Analog search scope:** `src/components/pricing/`, `src/components/blog/`, `src/components/sections/__tests__/`, `src/components/ui/__tests__/`, `src/config/`, `src/lib/utils/`
**Files scanned:** 11 (3 pricing components + 60-file component-test inventory sampled + `pricing.ts` + `currency.ts` + `badge.tsx` + existing `pricing/__tests__/page.test.ts`)
**Pattern extraction date:** 2026-05-20
