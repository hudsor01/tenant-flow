---
phase: 66
slug: rental-application-intake
status: draft
shadcn_initialized: true
preset: "new-york / slate / cssVariables / lucide (existing components.json)"
created: 2026-08-06
mode: auto
---

# Phase 66 — Rental Application Intake: UI Design Contract

> Single source of truth for the visual and interaction contract of BOTH surfaces this
> phase renders. The planner turns this into tasks; the executor builds from it; the
> ui-checker and ui-auditor validate against it.

**Two surfaces, two audiences, two sets of constraints:**

| | Surface 1 | Surface 2 |
|---|---|---|
| Route | `/apply/[token]` | `/applications`, `/applications/[id]` |
| Auth | **none** — public, unauthenticated | Supabase Auth + proxy subscription gate |
| Shell | **none** — no sidebar, no app shell | inside `(owner)` app shell |
| Device assumption | **phone, 375px, from a Zillow/Craigslist listing** | desktop primary, phone supported |
| Regulatory status | **regulated surface** — 42 U.S.C. § 3604(c) reaches the form's own layout and labels | ordinary product surface |
| Precedent to mirror | `src/app/sign/[token]/page.tsx` | `/documents`, `/units`, `/maintenance` |

**Auto-mode note.** Run with `--auto`; the owner delegated design ("you decide"). Every open
question below is decided here with its reasoning recorded. Nothing is escalated. Items whose
correctness cannot be established from source are marked `[UAT]` and land in the human-UAT
list rather than as blocking questions.

---

## 0. Decision Ledger

Everything this file decides that was not already decided upstream. Read this table first;
the rest of the document is the elaboration.

| ID | Decision | Why |
|----|----------|-----|
| **UI-01** | `/apply` is a **single-scroll form in 5 labelled sections**. Not multi-step, not accordion. | §A-2 — four independent reasons, the decisive one being unrecoverable state loss on a surface with no account and no resume path (D-10 forbids emailing the applicant anything). |
| **UI-02** | Every input on `/apply` is `inputSize="lg"` → **48px tall**. | §D-1 — an *unlayered* `@media (max-width:768px)` block in `globals.css` forces `padding: clamp(.75rem,2vw,1rem)` onto every `input`, beating Tailwind utilities outright. The default `h-11` then leaves an 18px content box. 48px restores headroom and is a better one-shot touch target. |
| **UI-03** | **No `Select` anywhere on `/apply`.** State is a 2-char `TextField` with `autoComplete="address-level1"`. | A 51-item radix listbox at 375px is worse than the native autofill path, and it dodges the `data-[size=default]:h-11` specificity fight UI-02 would otherwise need `!` to win. |
| **UI-04** | The APPLY-06 disclaimer is **one bordered block immediately above the submit control**, `<section>` with its own `<h2>`. It requires **no acknowledgement**. | §A-4. A consent checkbox on a screening disclaimer implies a screening authorization is being given — the exact opposite of what APPLY-06 says. Research: FCRA does not attach to TenantFlow at all. |
| **UI-05** | **One** required checkbox: an accuracy attestation, rendered below the disclaimer, above submit. | Standard on paper rental applications, meaningful to the landlord, not screening-shaped. Also a free server-side bot gate (`certified: true` in the zod schema). |
| **UI-06** | **No sticky submit bar** on mobile. Submit sits in normal flow directly below the disclaimer. | A floating bar would let an applicant submit without the disclaimer ever entering the viewport, defeating APPLY-06 and falsifying the E2E geometry assertion in §E. |
| **UI-07** | Rate-limited / capped rejection renders as an `Alert` **inside the intact form**, never as a page replacement. Submit stays enabled. | D-04b. Replacing the page discards everything the applicant typed. A legitimate household or shared-wifi applicant can trip this. |
| **UI-08** | Invalid, expired and revoked tokens render a **byte-identical card**. One string, one icon, one HTTP 200. | Mirrors `/sign`'s deliberate non-leak. Enforced by a single `TOKEN_UNAVAILABLE_COPY` constant so the three paths cannot drift apart. |
| **UI-09** | Income section: the **only required money field is source-neutral**; employment and non-employment detail share **one** optional group at **identical** visual weight. | F-3(a). Giving employment its own container or placing it above the neutral total communicates a preference for employed applicants — a source-of-income discrimination risk in CA/WA/NY and ~20 other jurisdictions. |
| **UI-10** | Household is **one** numeric field, with helper copy that states we deliberately do not ask for names, ages or relationships. | F-3(b). The helper both gets the right answer and makes the omission legible as a policy, not an oversight. |
| **UI-11** | Owner nav gains a **flat** `Applications` entry (`Inbox`) inserted between `Leases` and `Maintenance`. **No unread badge this phase.** | Flat because `renderNavItem`'s `hasChildren` branch renders a `<button>` with no `<Link>` (Phase 65, §A-1). A badge needs a per-status count query that nothing else on the page needs — deferred. |
| **UI-12** | The queue is a **`<ul>` of `Item` rows**, not a `DataTable`. | Three lines of content per row is row-shaped, not cell-shaped; `DataTable` at 375px forces horizontal scroll or column hiding; a vacancy yields 10–60 rows, far below the threshold that justifies the virtualized table rail. |
| **UI-13** | Status chips reuse **existing `Badge` variants**: `new`→`info`, `reviewing`→`warning`, `approved`→`success`, `rejected`→`outline`. Zero new CSS. | The variants already bake in the `-text` WCAG companions. `rejected` is deliberately **not** `destructive`: red on a fair-housing-regulated surface reads as a judgment, and a declined applicant is not an error state. |
| **UI-14** | DB value stays `rejected` (D-07). **UI label is "Declined" / "Decline".** | Copy quality. Recorded here explicitly so a reviewer does not "fix" the intentional mismatch. |
| **UI-15** | One primary action: **`Approve and open tenant form`**, with a helper line stating the tenant record is not created until that form is submitted. | Satisfies SC-3's approve→convert while telling the truth about D-08's human-check step. Relabels to `Open tenant form` (approved, unconverted) and `View tenant` (converted). |
| **UI-16** | `Decline` opens a small `Dialog` with a **required fixed-list reason** `Select`. Not a `ConfirmDialog`. | D-11d needs `disposition_reason` captured at decision time. A closed vocabulary cannot become free-text PII. Decline is reversible, so no destructive confirm. |
| **UI-17** | `Delete application` is the only destructive action. `ConfirmDialog`, destructive variant, copy that names the fair-housing consequence. | Deleting destroys the record the 730-day retention window exists to preserve (F-1/F-2). |
| **UI-18** | Link surface: a **persistent read-only `Input` holding the URL + a copy icon button**, on `/applications` under the queue. Never a shown-once dialog. | D-03a. The owner re-copies over a 60-day listing. Repeat retrieval is the primary use case, not the exception. |
| **UI-19** | Detail view is a **route** (`/applications/[id]`), not a `Sheet`. | Linkable, breadcrumb-able, back-button correct; 26 fields are cramped in a sheet at 375px; and approve navigates away anyway, so a sheet would only add a close step. |
| **UI-20** | Public page renders **no owner contact information** — no owner email, no owner phone. Owner display name only, in the "delivered to" line. | D-10 says the owner initiates contact. Publishing owner contact details to anyone holding a public capability URL is an unforced disclosure. |

---

## Design System

| Property | Value |
|----------|-------|
| Tool | **shadcn** — `components.json` present at repo root |
| Preset | `style: new-york`, `baseColor: slate`, `cssVariables: true`, `rsc: true`, `tsx: true` |
| Component library | radix-ui (via the vendored `src/components/ui/*` primitives) |
| Icon library | **lucide-react** (sole icon library — `@radix-ui/react-icons` is banned) |
| Font | `--font-sans` (Roboto/Geist stack). `--font-display` (Playfair) is **marketing-only** and appears nowhere in this phase. |
| Tailwind | v4, config-less. All tokens live in `src/app/globals.css` `@theme`. |
| New components fetched | **zero** |
| New npm runtime dependencies | **zero** (standing project invariant) |

**Primitives this phase uses — all pre-existing in `src/components/ui/`:**
`Card`, `Button`, `Input`, `Textarea`, `Checkbox`, `Label`, `Field`/`FieldGroup`/`FieldLabel`/`FieldDescription`/`FieldError`, `Alert`, `Badge`, `Item` (+ `ItemMedia`/`ItemContent`/`ItemTitle`/`ItemDescription`/`ItemActions`), `Empty`, `Skeleton`, `Select`, `Tabs`, `Dialog`, `ConfirmDialog`, `DropdownMenu`, `Breadcrumb`.

**Form rail:** `useAppForm` from `#lib/forms/form-hook` with `formOptions({ defaultValues })`. Field
components: `TextField`, `NumberField`, `TextareaField`, `DateField`. `SubmitButton` from
`#lib/forms/form-components/submit-button`.

> **Binding constraint from `submit-button.tsx`:** never pair `SubmitButton` with a **form-level
> `onBlur`** validator — that combination deadlocks `canSubmit` and the click never lands. Use a
> form-level **`onChange`** zod validator.

---

## Spacing Scale

Tailwind base `--spacing: 0.25rem`. Every declared value is a multiple of 4.

| Token | Value | Usage in this phase |
|-------|-------|---------------------|
| xs | 4px (`gap-1`) | icon-to-count in a status chip |
| sm | 8px (`gap-2`) | skeleton row gap; chip internal gap |
| — | 12px (`gap-3`, `p-3`) | checkbox-to-label; disclaimer paragraph rhythm; `<dl>` row gap on the detail page |
| md | 16px (`gap-4`, `p-4`) | paired-field grid gap; `Item` row padding; disclaimer block padding; card content padding **at <640px** |
| — | 20px (`gap-5`) | **field-to-field rhythm inside a `/apply` section** — a deliberate override of `FieldGroup`'s default `gap-7` (§A-3) |
| lg | 24px (`gap-6`, `px-6`, `py-6`) | card padding at ≥640px; page-shell vertical rhythm on `/apply` |
| xl | 32px (`gap-8`) | section-to-section on `/apply`; band-to-band on `/applications` |
| 2xl | 40px (`py-10`) | `/apply` page top/bottom padding (mirrors `/sign`) |

**Exceptions:**
1. `FieldGroup`'s primitive default is `gap-7` (28px). On `/apply` it is overridden to `gap-5`
   (20px) — a measured density decision for a 26-field public form; 20px is still a multiple of 4.
2. `Field`'s primitive default `gap-3` (12px) label→control→error is inherited unchanged.
3. `Card`'s primitive `py-6` is inherited unchanged; `CardContent` is `px-4 sm:px-6` on `/apply`
   only, reclaiming 16px of field width at 375px. Justified: `/sign` has two fields, this has 26.
4. **Never `space-y-*` in this phase.** Use `flex flex-col gap-*` or `grid gap-*` everywhere.
   Rationale in §D-2 — `space-y-*` compiles inside `:where()` at specificity 0 and any explicit
   margin utility on a child flattens the rung. Removing `space-y` removes the whole trap class.

---

## Typography

Declared roles — **4 sizes, 2 weights.**

| Role | Size | Weight | Line height | Usage |
|------|------|--------|-------------|-------|
| Page title | `typography-h1` → `clamp(24px, 3vw, 30px)` | 700 *(utility default — see exception)* | 1.2 | the single `<h1>` on `/apply`, `/applications`, `/applications/[id]` |
| Section / card title | 16px (`text-base`) | **600** (`font-semibold`) | 1.35 | every `<h2>`; `CardTitle`; disclaimer heading |
| Body | 14px (`text-sm`) | **400** | 1.5 | field labels, descriptions, `<dd>` values, button labels, queue row titles, disclaimer paragraphs |
| Metadata | 12px (`text-xs`) | 400 | 1.5 | `typography-label` eyebrows, helper text, expiry lines, `ItemDescription`, `<dt>` labels |

**Input text size is not a declared role.** `Input`/`Textarea` carry `text-base md:text-sm` from
the primitive — 16px on mobile, 14px at ≥768px. **Do not override this.** 16px on mobile is what
prevents iOS Safari's focus-zoom. It is a primitive-level decision, not a per-phase one.

**Weight exceptions — three, all inherited from shared primitives, none newly declared here:**

| Source | Weight | Disposition |
|--------|--------|-------------|
| `typography-h1` utility | 700 | Inherited. Same documented exception Phase 65 recorded. |
| `Label` / `FieldLabel` | 500 (`font-medium`) | Inherited unchanged. Overriding it app-wide is out of scope and would diverge every other form in the repo. **One local exception:** the attestation label (§A-4) is `font-normal`, because it is a body-length sentence, not a field label. |
| `Badge` | 500 (`font-medium`) | Inherited unchanged. |

**No component authored by this phase declares a weight outside 400 / 600.**

**Forbidden here:** `typography-hero`, `typography-display*`, `typography-display-sans*` (Playfair,
marketing-only). Gradient text (`background-clip: text`) is forbidden project-wide. No emojis —
lucide only. No em-dashes in user-facing strings.

**Case conventions:** sentence case for every button, label, helper line, heading one-liner,
empty/error copy and status chip. Title Case only for proper nouns and the four `typography-label`
eyebrows (which the utility uppercases anyway).

---

## Color

| Role | Token | Usage |
|------|-------|-------|
| Dominant (60%) | `bg-background` (`/applications`) · `bg-muted/40` (`/apply` page canvas) | page canvas |
| Secondary (30%) | `bg-card` | the `/apply` form card; the link panel; every detail-page card |
| Accent (10%) | `--color-primary` / `--color-primary-text` | see the reserved list below |
| Destructive | `--color-destructive` / `--color-destructive-text` | validation-error `Alert`; the delete-application confirm |

**Accent is reserved for exactly these elements and nothing else:**

*On `/apply/[token]`:*
1. The single filled primary `Button` — `Submit application`. The only filled button on the page.
2. The checked state of the attestation `Checkbox` (`data-[state=checked]:bg-primary`, primitive default).
3. The focus ring (`--focus-ring-color` → `--color-ring`, global).

*On `/applications` and `/applications/[id]`:*
4. The single filled primary `Button` per view — `Create link` (empty queue) / `Approve and open tenant form` (detail).
5. Text-link affordances — `text-primary-text hover:underline underline-offset-4`.
6. The focus ring.

**Accent is explicitly NOT applied to:** queue rows, status chips, the copy button, section
headings, medallions, or any icon that is not inside the primary button.

**Semantic color budget:**

| Token | Where | Rule |
|-------|-------|------|
| `text-warning` | the `AlertCircle` glyph on the unavailable-token card (mirrors `/sign`) | **icon only** |
| `text-success` | the `CheckCircle2` glyph on the confirmation card | **icon only** |
| `Badge variant="info" \| "warning" \| "success" \| "outline"` | status chips | variants already carry the `-text` companions |
| `text-destructive-text` | `FieldError` (primitive default), the validation-error `Alert` | **text only** |

> **WCAG companion rule (CLAUDE.md, `vivid-token-text-companions` memory):** vivid tokens
> (`text-destructive`, `text-success`, `text-warning`, `text-info`) fail AA as *text* in one theme
> or the other. Vivid tokens are for **icon fills**; `-text` companions are for **text**. Bare
> `text-destructive` / `text-success` / `text-warning` / `text-info` on a text run is a blocking
> violation in this phase.

Also binding (CLAUDE.md Accessibility): `text-muted-foreground` never bare `text-muted`;
`bg-background` never `bg-white`.

---

## Copywriting Contract

Summary table required by the template. The full copy deck is §A-7 (public) and §B-8 (owner) —
those are the authoritative strings.

| Element | Copy |
|---------|------|
| Primary CTA — `/apply` | **Submit application** |
| Primary CTA — queue empty state | **Create an application link** |
| Primary CTA — application detail | **Approve and open tenant form** |
| Empty state heading — queue | **No applications yet** |
| Empty state body — queue | **Create an application link for a vacant unit and share it on your listing.** |
| Empty state heading — link panel | **No units yet** |
| Empty state body — link panel | **Add a unit to a property before you can accept applications for it.** |
| Error state — public submit failure | **We could not submit your application.** + *Check your connection and try again. Nothing you typed has been lost.* |
| Error state — queue load failure | **Couldn't load applications.** + `Retry` (ghost, `size="sm"`). Never a raw PostgREST string — route through `handlePostgrestError`. |
| Destructive confirmation | **Delete application** — *This permanently deletes the application and the reason you recorded for your decision. TenantFlow keeps applications for two years so you can show why a decision was made. This cannot be undone.* |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | **none fetched** — every primitive already exists in `src/components/ui/` | not required |
| `@magicui`, `@supabase`, `@diceui`, `@aceternity`, `@formcn`, `@nuqs`, `@shadcn-hooks`, `@blocks`, `@shadcnblocks` | **none** | **not triggered** — zero blocks pulled from any third-party registry in this phase |

`components.json` declares nine third-party registries. This phase pulls **zero blocks** from any
of them and fetches **zero** components from shadcn official. The `npx shadcn view` vetting gate is
**not triggered**. Zero new npm runtime dependencies.

*Registry vetting gate status: NOT TRIGGERED — no third-party block declared — 2026-08-06.*

---

# A. Surface 1 — `/apply/[token]` (public, unauthenticated)

## A-1. Page shell and geometry

Mirrors `src/app/sign/[token]/page.tsx` structurally. Server Component; only the form is
`'use client'`.

```tsx
export const metadata: Metadata = {
  title: "Rental Application",
  description: "Submit a rental application to the property owner.",
  robots: { index: false, follow: false },   // D-14
};
export const dynamic = "force-dynamic";      // the token must reflect live state
```

```
<main id="main-content" className="min-h-dvh bg-muted/40 px-4 py-10">
  <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
    ├─ wordmark          text-xl font-semibold tracking-tight text-foreground, centered
    ├─ <Card>            the single card — form | unavailable | confirmation
    └─ footer <p>        text-center text-xs text-muted-foreground mb-0
  </div>
</main>
```

**Measurable geometry (asserted in §E):**

| Viewport | Page gutter | Card width | Card border | `CardContent` padding | Field width |
|----------|-------------|------------|-------------|----------------------|-------------|
| 375px | `px-4` = 16px | 343px | 1px × 2 | `px-4` = 16px | **309px** |
| 640px | `px-4` = 16px | 608px | 1px × 2 | `px-6` = 24px | 558px |
| ≥ 704px | `px-4` = 16px | **672px** (`max-w-2xl` cap) | 1px × 2 | `px-6` = 24px | **622px** |

> **The card border is a term in this table and was missing from it.** The three field widths
> originally read 311 / 560 / 624 — card width minus the two paddings, with `cardVariants`' bare
> `border` never subtracted. `Card`'s box is `border-box`, so the quoted card width is its BORDER
> box and 2px of it is border; the content box is 2px narrower. E-4 asserted the uncorrected 311
> and therefore could not pass against any correct build. Corrected here and in E-4; all three
> figures verified by measuring the real page against the compiled Tailwind bundle in Chrome.

- No app shell, no sidebar, no breadcrumb, no `page-offset-navbar`, no marketing navbar/footer.
  `/apply` sits outside both `(owner)` and the marketing `page-layout`.
- `<h1>` is **visible** (`typography-h1`, "Rental application") — unlike `/sign`, which uses an
  `sr-only` h1. An applicant arriving cold from a listing needs the orientation.
- No skip-to-content link: one landmark, and the first focusable element is already inside it.
- Wordmark is `font-semibold` (600), a deliberate one-step divergence from `/sign`'s `font-bold`
  (700), to stay inside this phase's two-weight contract.

**The footer `<p>` carries `mb-0`** — it is a flex item of a `gap-6` parent, so the unscoped base
`p { margin-bottom: 1rem }` would be *added* to the item's height rather than collapsing out. See §D-3.

## A-2. Form length management — DECIDED: single scroll, 5 sections

**Decision: one continuous form, five labelled `<section>`s, one submit. Not multi-step. Not an
accordion.**

Four independent reasons, in order of weight:

1. **State loss is unrecoverable on this surface.** The applicant has no account, and D-10
   forbids emailing them anything — so there is no resume link and no draft. Every additional
   navigation before the single commit point is an additional chance to lose ~26 fields of typed
   input with no recovery path. Single scroll has exactly one navigation. A stepper's Back gesture
   on mobile is the browser's Back gesture; without a `?step=` param it leaves the page entirely,
   and `NuqsAdapter` is scoped to `(owner)` and `blog`, so a URL-driven step is not available here.
2. **Server validation errors can land on an unrendered step.** The Edge Function's zod schema is
   the authoritative validator (V5). In a multi-step form a server error keyed to a step-1 field
   cannot be shown while step 4 is mounted. That is a defect class, not a hypothetical. Single
   scroll means every error is scrollable-to and focusable.
3. **Autofill.** Mobile browsers fill name / email / phone / street / city / state / ZIP in one
   pass when the fields are in one document. Splitting them across steps that mount and unmount
   breaks the heuristic and costs more taps than the chunking saves.
4. **Honesty.** Showing the full scope up front lets the applicant decide before investing. On a
   § 3604(c)-regulated surface, progressive length concealment to maximise submit rate is the
   wrong instinct.

**Rejected: accordion.** Collapsed sections hide validation errors, and a tap-to-expand step
before every field group is pure added friction on the exact device this form targets.

**Rejected: multi-step.** Also: `Stepper`'s `StepperList` renders 4 indicators plus 3 separators
horizontally; at 375px minus gutters, the card border and card padding that is 309px of rail, which crowds even
with `StepperDescription` hidden below `sm` (the lease wizard's own compromise).

**Length mitigations, all required:**

| Mitigation | Spec |
|---|---|
| Expectation set up front | A one-line preamble under the `<h1>`: *"About 5 minutes. Five short sections."* |
| Section ordinals | `<span className="typography-label">` eyebrow above each `<h2>`: `SECTION 1 OF 5` … A `<span>`, not a `<p>` — spans carry no base margin (§D-3). |
| Optional is labelled, not inferred | Every optional field's label ends with ` (optional)`. No asterisks on required fields; required is the default and optional is the marked case. |
| `autoComplete` on every field | The single largest measurable mobile win. Table in §A-3. |
| Tighter rhythm | `FieldGroup className="gap-5"` (20px) instead of the 28px default. |
| Unsaved-changes guard | `useUnsavedChangesWarning(isDirty)` from `#hooks/use-unsaved-changes` — the closest thing to a safety net that exists without persisting applicant PII to the device. |

**No client-side persistence.** No `localStorage`, no `sessionStorage`, no IndexedDB draft.
An applicant may well be on a library or shared-household device; persisting name, email, phone,
address and income to that device is a worse failure than losing a form. This is a locked
invariant, not a simplification.

## A-3. Section-by-section field layout

Container per section:

```
<section aria-labelledby="apply-s{n}" className="flex flex-col gap-4">
  <div className="flex flex-col gap-1">
    <span className="typography-label">SECTION {n} OF 5</span>
    <h2 id="apply-s{n}" className="text-base font-semibold text-foreground">{title}</h2>
  </div>
  <FieldGroup className="gap-5"> … </FieldGroup>
</section>
```

Sections are separated by the parent's `gap-8` (32px). No horizontal rules between them — the
eyebrow + heading pair carries the break.

Paired fields use `grid gap-4` and go **single-column below 640px, without exception**:

```
<div className="grid gap-4 sm:grid-cols-2">        {/* first / last name */}
<div className="grid gap-4 sm:grid-cols-4">        {/* city (col-span-2) / state / ZIP */}
```

### Section 1 — About you

| Field | Component | Required | `autoComplete` | Notes |
|---|---|---|---|---|
| First name | `TextField` `inputSize="lg"` | ✔ | `given-name` | `autoFocus` (CLAUDE.md: primary input of key forms) |
| Last name | `TextField` `inputSize="lg"` | ✔ | `family-name` | pairs at `sm:grid-cols-2` |
| Email | `TextField` `inputSize="lg" type="email" inputMode="email"` | ✔ | `email` | |
| Phone | `TextField` `inputSize="lg" type="tel" inputMode="tel"` | ✔ | `tel` | |
| Desired move-in date | `DateField` `inputSize="lg"` | ✔ | — | native `<input type="date">` picker |

### Section 2 — Where you live now

| Field | Component | Required | `autoComplete` |
|---|---|---|---|
| Street address | `TextField` `inputSize="lg"` | ✔ | `address-line1` |
| City | `TextField` `inputSize="lg"` (`sm:col-span-2`) | ✔ | `address-level2` |
| State | `TextField` `inputSize="lg" maxLength={2} autoCapitalize="characters"` | ✔ | `address-level1` |
| ZIP | `TextField` `inputSize="lg" inputMode="numeric" maxLength={10}` | ✔ | `postal-code` |
| Current landlord name (optional) | `TextField` `inputSize="lg"` | — | `off` |
| Current landlord phone (optional) | `TextField` `inputSize="lg" type="tel"` | — | `off` |
| Reason for moving (optional) | `TextareaField` `className="min-h-24!"` | — | `off` |

State validates against the existing `USState` union / `stateNames` map in
`src/lib/templates/lease-template.ts` — **do not create a second states constant** (CLAUDE.md: no
duplicate types). Error copy: *"Enter the two-letter state code, for example TX."*

### Section 3 — Income  *(the F-3(a) constrained section — layout is compliance)*

**Field order is load-bearing. Do not reorder.**

| Order | Field | Component | Required |
|---|---|---|---|
| 1 | **Gross monthly income from all sources** | `NumberField` `inputSize="lg" min={0} step="0.01"` | ✔ |
| 2 | *(helper, `FieldDescription`)* | — | — |
| 3 | Sub-heading: **Where your income comes from (optional)** | `<h3 className="text-sm font-semibold text-foreground">` | — |
| 4 | Employer (optional) | `TextField` `inputSize="lg"` | — |
| 5 | Job title (optional) | `TextField` `inputSize="lg"` | — |
| 6 | Months at this employer (optional) | `NumberField` `inputSize="lg" min={0} step={1}` | — |
| 7 | Other income source (optional) | `TextField` `inputSize="lg"` | — |
| 8 | Other monthly amount (optional) | `NumberField` `inputSize="lg" min={0} step="0.01"` | — |

**Binding layout rules for this section:**

- The **only** required money field is the source-neutral total. It is **first**.
- Fields 4–8 live in **one** group, at **identical** visual weight, under **one** "(optional)"
  sub-heading. Employment does **not** get its own container, its own heading, its own card, its
  own icon, or any visual precedence over fields 7–8. A layout that separates "Employment" from
  "Other income" into two visually distinct groups is a **blocking violation of this contract**.
- There is **no** "type of income" `Select`. Enumerating income sources hands the owner a filter
  (F-3(a) explicit).
- Helper copy under field 1 (`FieldDescription`, 12px muted):
  > Wages, self-employment, benefits, housing assistance, retirement, disability, child support,
  > alimony, and any other regular lawful income all count the same.
- Helper copy under the sub-heading:
  > All of these are optional. Leave anything blank that does not apply to you.

**The owner's fair-housing statement** renders at the end of this section, before Section 4:

```
<p role="note" className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground mb-0">
```
> This owner does not discriminate on the basis of race, color, religion, sex, disability,
> familial status, or national origin, or on any other basis protected by state or local law.

**Locked invariant:** this string is template text the owner cannot edit or remove. § 3604(c)
regulates the form's content, and an owner-editable statement could be edited into a violation.

### Section 4 — Household

| Field | Component | Required |
|---|---|---|
| Number of people who will live in the unit | `NumberField` `inputSize="lg" min={1} step={1}` | ✔ |
| Pets (optional) | `TextareaField` `className="min-h-24!"` | — |
| Vehicles (optional) | `TextareaField` `className="min-h-24!"` | — |

Helper copy (each a `FieldDescription`, 12px muted):

- Occupants: *"Count everyone who will live here, including yourself. We do not ask for names, ages, or relationships."*
- Pets: *"Type, number, and approximate weight. Leave blank if none."* — **plus a second line:**
  *"Assistance animals are not pets and are not subject to pet policies. You do not need to disclose one here."*
- Vehicles: *"Make, model, and license plate for each vehicle you will park here. Leave blank if none."*

**No boolean "Do you have pets?" toggle.** One optional free-text field, no conditional reveal.
A required yes/no adds a decision the applicant does not need to make, and a conditional reveal
adds render state to a form that has none.

**Schema constraint restated (D-05 / F-3(b)):** occupant **count** only. No occupant names, ages,
relationships, or an `occupants jsonb` with per-person detail. A per-occupant sub-form would be a
blocking violation regardless of how it is labelled.

### Section 5 — References

| Field | Component | Required |
|---|---|---|
| Reference name | `TextField` `inputSize="lg"` | ✔ |
| Relationship to you (optional) | `TextField` `inputSize="lg"` | — |
| Reference phone | `TextField` `inputSize="lg" type="tel"` | ✔ |
| Second reference — name / relationship / phone (optional) | as above | — |

The second reference sits under a `<h3 className="text-sm font-semibold text-foreground">Second
reference (optional)</h3>`. All three of its fields are optional; if any one is filled the zod
schema requires name + phone together (a partial reference is useless to the owner).

### Fields that must NOT exist anywhere on this form (D-06, contract)

SSN · date of birth · government ID number · driver's licence number · bank account or routing
number · card details · file/document/pay-stub upload · disability, medical need, or
assistance-animal documentation · occupant names, ages, or relationships · "type of income"
selector · marital status · country of origin · criminal-history question.

The form must also **not imply these arrive later** — no "we'll ask for this next", no
"verification pending", no progress rail implying a later step.

## A-4. The APPLY-06 disclaimer block

**Placement:** the last block before the submit control, inside the same `<CardContent>`, after
Section 5 and before the attestation. `role` is implicit (`<section>` + `<h2>`), giving it real
document structure rather than fine-print status.

```tsx
<section
  aria-labelledby="apply-disclaimer"
  className="rounded-lg border border-border bg-muted/40 p-4 flex flex-col gap-3"
>
  <h2 id="apply-disclaimer" className="text-base font-semibold text-foreground">
    About this application
  </h2>
  <p className="text-sm text-muted-foreground mb-0">…¶1…</p>
  <p className="text-sm text-muted-foreground mb-0">…¶2…</p>
  <p className="text-sm text-muted-foreground mb-0">…¶3…</p>
</section>
```

**Visual weight:** bordered, tinted (`bg-muted/40`) container at 14px body — the same size as the
form's own body copy, deliberately **not** 12px. It reads as a notice, not fine print. It is the
only bordered non-field block in the card, so it is visually distinct from every section above it.

**Acknowledgement: NO.** (UI-04.) FCRA does not attach to TenantFlow at all — the disclaimer is a
scope statement, not a consent. A checkbox on it would imply a screening authorization is being
granted, which inverts its meaning.

**Copy (verbatim, from research; store as a single exported constant so the E2E snapshot and the
render cannot drift):**

> **About this application**
>
> TenantFlow does not screen applicants. We do not run credit checks, background checks, criminal
> history checks, or eviction searches, and we do not obtain or provide consumer reports. We are
> not a consumer reporting agency.
>
> This form is delivered directly to the property owner, who alone decides whether to rent to you.
> If the owner obtains a background or credit report about you from a screening company, that is
> separate from this form and the owner is responsible for the notices the Fair Credit Reporting
> Act requires. We will not email you about this application — the owner will contact you directly.
>
> We do not ask for your Social Security number, date of birth, or financial account details. Do
> not enter them.

> **Copy note:** the em-dash in ¶2 is the one exception to the project's no-em-dash rule. This is
> statutory-adjacent notice copy lifted verbatim from research and reviewed as a unit; rewriting it
> for punctuation style risks changing its meaning. Recorded so a reviewer does not "fix" it.

**A second, shorter orientation line** appears in the page header, above `<h1>`'s preamble. It is
**different copy** and is **not** the APPLY-06 block:

> This form goes directly to the property owner. TenantFlow does not screen applicants.

The §E geometry assertion targets the canonical block only (`#apply-disclaimer`).

### The attestation (UI-05)

Immediately below the disclaimer block, above submit:

```tsx
<Field orientation="horizontal" className="items-start gap-3">
  <Checkbox id="apply-certify" … />
  <FieldLabel htmlFor="apply-certify" className="text-sm font-normal leading-snug">
    I certify that the information I have provided is true and complete to the best of my knowledge.
  </FieldLabel>
</Field>
```

- `items-start`, not the primitive's `items-center` — the label wraps to two lines at 309px.
- `font-normal` overrides `Label`'s `font-medium`; this is a sentence, not a field label.
- Required. `SubmitButton` stays disabled until it is checked (the form-level `onChange` zod
  schema requires `certified: true`), and the server schema requires it too.
- `[UAT]` At ≤768px the shared `Checkbox` renders **44×44** rather than 16×16 — see §D-1. Verify
  the oversized control still reads as aligned against the two-line label at 375px.

## A-5. Every state of the public page

Six states. All six are `<Card>` swaps inside the same shell, so the page never jumps.

| # | State | Treatment |
|---|-------|-----------|
| 1 | **Valid token** | Listing summary + 5 sections + disclaimer + attestation + submit. |
| 2 | **Unavailable token** — invalid **or** expired **or** revoked **or** unit deleted | **One card, one string, one icon, HTTP 200.** `AlertCircle className="size-5 text-warning"` + `CardTitle` + one `<p className="text-sm text-muted-foreground mb-0">`. |
| 3 | **Submitting** | `SubmitButton` → `Submitting...`, disabled. The whole field area wrapped in `<fieldset disabled={isSubmitting} className="contents">` so nothing can be edited mid-flight. No spinner overlay, no page-level loader. |
| 4 | **Success** | Card content is replaced in place (§A-6 copy). Container gets `role="status"`; the confirmation `<h2>` gets `tabIndex={-1}` and is focused on mount, and the window scrolls to top. Form state is cleared so a Back navigation cannot restore PII on a shared device. |
| 5 | **Validation errors** | Per-field `FieldError` (primitive, `text-destructive-text`) **plus** a summary `Alert variant="destructive"` immediately above the submit button, **plus** programmatic focus to the first invalid control. |
| 6 | **Rate-limited / capped (429)** | `Alert` (default variant, **not** destructive) between the attestation and the submit button. **The form stays fully intact and the submit button stays enabled.** |

**State 2 is the non-leak requirement.** `/sign` deliberately returns HTTP 200 with a `reason` for
every genuine token state so status codes cannot enumerate tokens. `/apply` inherits that
exactly. Enforce it structurally: a single exported `TOKEN_UNAVAILABLE_COPY` constant consumed by
all four reason branches, so no future edit can make revoked read differently from invalid.
`apply-context.ts` mirrors `sign-context.ts`, including that only a transport/server fault maps to
a distinct recoverable reason.

**State 6 is the D-04b requirement.** Copy must not accuse — no "too many requests", no "blocked",
no "suspicious activity". A couple applying from one household NATs to one IP; a library or coffee
shop NATs dozens.

**Loading:** there is no loading state. The page is a Server Component with `force-dynamic`; the
token context resolves before first paint. No skeleton, no spinner, no `Suspense` boundary.

### Listing summary (state 1 header)

A `<dl className="grid gap-3 rounded-lg border bg-background p-4 text-sm">` above Section 1,
mirroring `/sign`'s `SummaryRow`. Rows:

| Row | Source | Rule |
|---|---|---|
| Property | context RPC, required | always shown |
| Unit | context RPC, if present | omitted when null |
| Monthly rent | context RPC, if returned | omitted when null; formatted via the repo's existing currency formatter |
| Delivered to | owner **display name** only, if returned | **never** owner email, **never** owner phone (UI-20) |

## A-6. Honeypot

A genuine independent layer (D-04): zero external dependencies, works when Upstash is down.

```tsx
<div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
  <label htmlFor="apply-company-website">Company website</label>
  <input id="apply-company-website" name="company_website" type="text"
         tabIndex={-1} autoComplete="off" />
</div>
```

- **Tailwind classes only, no inline styles** (CLAUDE.md rule 5).
- Field name is `company_website` — plausible to a bot, and deliberately not a name any password
  manager or autofill heuristic targets. **Never** name it `honeypot`, and never use `address`,
  `phone`, `email` or `name`.
- `tabIndex={-1}` is what keeps `aria-hidden="true"` axe-clean (`aria-hidden-focus` accepts
  `tabindex="-1"`).
- Filled → HTTP 200 success response to the client, **zero rows written**. The bot must not learn
  it was caught.

> **Correction to `66-RESEARCH.md` §"What CANNOT be unit-tested".** That row prescribes
> `toBeHidden()` "from the a11y tree" as one of the honeypot assertions. **`toBeHidden()` will
> fail here.** Playwright's visibility model is geometric — a rendered element with a non-empty
> bounding box and `visibility: visible` is "visible" even at `left: -9999px`. Use instead:
> `await expect(hp).not.toBeInViewport()` **and** a geometric assertion
> (`getBoundingClientRect().right < 0`) **and** the Tab-order assertion. See §E.

**Timing guard.** The form records `mountedAt` and sends elapsed milliseconds; a submit under 3
seconds returns 200 and writes nothing. This is a **bot filter, not a security control** — a
client-reported elapsed time is trivially forged. The real bound is the fail-closed DB cap (F-6).
Say so in the code comment; do not let a later reader mistake it for a defence.

## A-7. Copy deck — public page

| Slot | Copy |
|------|------|
| `<title>` | **Rental Application** |
| `<h1>` | **Rental application** |
| Header orientation line | **This form goes directly to the property owner. TenantFlow does not screen applicants.** |
| Header preamble | **About 5 minutes. Five short sections.** |
| Section 1 heading | **About you** |
| Section 2 heading | **Where you live now** |
| Section 3 heading | **Income** |
| Section 3 sub-heading | **Where your income comes from (optional)** |
| Section 4 heading | **Household** |
| Section 5 heading | **References** |
| Section 5 sub-heading | **Second reference (optional)** |
| Disclaimer heading | **About this application** |
| Disclaimer body | verbatim, §A-4 |
| Fair-housing note | verbatim, §A-3 |
| Attestation | **I certify that the information I have provided is true and complete to the best of my knowledge.** |
| **Primary CTA** | **Submit application** |
| Submitting label | **Submitting...** |
| Page footer line | **Delivered directly to the property owner. TenantFlow does not screen applicants.** |
| **Unavailable — title** | **This application link isn't available** |
| **Unavailable — body** | **This link is no longer accepting applications. If you found it on a rental listing, contact the person who posted the listing for a current link.** |
| **Success — title** | **Application received** |
| **Success — body ¶1** | **{Property label}{, Unit {n}} has your application. The owner will contact you directly if they would like to move forward.** |
| **Success — body ¶2** | **We will not email you about this application, and there is no status page to check. TenantFlow does not make rental decisions.** |
| **Success — body ¶3** | **You can close this page.** |
| **Validation summary — title** | **{n} answer needs your attention** / **{n} answers need your attention** |
| **Validation summary — body** | **Check the highlighted fields above, then submit again.** |
| **Rate-limited — title** | **This listing is busy right now** |
| **Rate-limited — body** | **Nothing you typed has been lost. Please wait a few minutes and submit again.** |
| **Submit failure — title** | **We could not submit your application** |
| **Submit failure — body** | **Check your connection and try again. Nothing you typed has been lost.** |

**Nothing on this page offers a copy, print or download of the submitted answers.** Re-displaying
applicant PII after submit on a possibly-shared device is an unforced risk, and it would need a
print stylesheet nothing else in this phase needs.

---

# B. Surface 2 — Owner review queue

## B-1. Navigation and routes

| Change | File | Detail |
|---|---|---|
| Sidebar entry | `src/components/shell/main-nav.tsx` `coreItems` | **`{ label: "Applications", href: "/applications", icon: Inbox }`** inserted between `Leases` and `Maintenance` |
| Cmd+K palette | `src/components/shell/app-shell.tsx` (~:99) | same entry, same position, in the mirrored array |
| Breadcrumb labels | `src/lib/breadcrumbs.ts` `LABEL_MAP` | `applications: "Applications"` — a fallback no-op (the capitalize default already yields "Applications"), added for honesty exactly as `vault` was in Phase 65 |

**Nav blast radius: 3 files.** Verified by reading both nav consumers; `main-nav.tsx` and
`app-shell.tsx` carry duplicated arrays that must stay in sync.

**Flat, not a parent with children** — `renderNavItem`'s `hasChildren` branch renders the parent as
a `<button onClick={toggleExpanded}>` with **no `<Link>`**, which would leave `/applications`
unreachable from the sidebar. Same finding Phase 65 recorded at `main-nav.tsx:211-230`.

`Inbox` is confirmed present in the installed `lucide-react` and **unused anywhere in `src/`**.
`ClipboardList` is taken by Leases; `ClipboardCheck` by the Phase 65 property-inspection tile.
`UserSearch` was rejected — it reads as screening, which this product explicitly does not do.

**Routes added:** `/applications` (queue + link panel), `/applications/[id]` (detail).
Neither is added to `PRIVATE_ROUTE_PREFIXES` **as a new prefix** unless the deny-list needs it —
they sit under the `(owner)` group; the planner confirms against `src/lib/routes/private-routes.ts`.
`/apply` is **not** added to `PRIVATE_ROUTE_PREFIXES` and **not** added to
`ROBOTS_ONLY_PRIVATE_PATHS` (D-13/D-14); the existing bidirectional drift guard is extended to
assert its absence from both.

## B-2. `/applications` page composition

```
<div className="p-6 lg:p-8 bg-background min-h-full flex flex-col gap-8">
  ├─ header
  │    <h1 className="typography-h1">Applications</h1>
  │    <p className="text-sm text-muted-foreground mb-0">Review applicants for your vacant units and turn approvals into tenant records.</p>
  │
  ├─ BAND 1 — the queue  (primary weight, no card wrapper — it is the page)
  │    filter row  →  unit Select  +  status Tabs
  │    <ul> of Item rows
  │    pager
  │
  └─ BAND 2 — application links  (secondary weight, bg-card rounded-lg border p-6)
       id="application-links"
```

**Queue first, links second — and the empty state bridges them.** A returning owner wants
applications; a brand-new owner has none. The queue's zero-applications `Empty` carries the
primary `Create an application link` button, which focuses the links band. Weight follows the
common case; the empty state handles the first-run case.

**Filter row** — `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`:
- Unit filter: `Select`, `w-full sm:w-64`, first option "All units".
- Status: `Tabs` with 5 triggers — **All · New · Reviewing · Approved · Declined**.
  `TabsList` gets `overflow-x-auto scrollbar-hide` (existing `@utility` at `globals.css:1797`)
  so five triggers scroll horizontally at 375px instead of wrapping or overflowing.
- **No counts on the tabs** this phase — a per-status count needs its own query that nothing else
  on the page needs. Deferred (§F).

**Pagination:** `.range()`, **25 per page**, `{ count: 'exact' }` — never `data.length`
(CLAUDE.md). Control: `Showing {from}–{to} of {total}` at `text-xs text-muted-foreground` plus
`Previous` / `Next` `Button variant="outline" size="sm"`.

**Data:** `queryOptions()` factories in `src/hooks/api/query-keys/application-keys.ts` and
`application-link-keys.ts`. No string-literal query keys. Typed `mapRentalApplicationRow` at the
PostgREST boundary — never `as unknown as` (`mapDocumentRow` is the reference implementation).
Mutations invalidate `applicationKeys` + `ownerDashboardKeys.all`.

## B-3. Queue row anatomy and density

`<ul className="flex flex-col gap-2 pl-0 mt-0 [&>li]:mb-0">` — the three base-rule neutralizers
from §D-3, mandatory.

Each `<li>` holds one `Item size="default"` (`p-4 gap-4`), `asChild` over a `<Link>`:

| Slot | Primitive | Spec |
|------|-----------|------|
| Row link | `<Link className="no-underline text-foreground">` | **Both classes are required.** `no-underline` defeats the base `a:not(...)` transparent-underline rule; `text-foreground` defeats that same rule's `color: var(--color-primary)`, which would otherwise tint the whole row accent-blue. Phase 65 hit exactly this. |
| Icon | `ItemMedia variant="icon"` | lucide `User`, `size-4 text-muted-foreground`, `aria-hidden="true"` |
| Title | `ItemTitle` | applicant name, or `ANONYMIZED_HEADING` when `isAnonymized(row)` (see §B-5's anonymized-rows note) · 14px / **400** (`font-normal`, overriding the primitive's `font-medium`) · `block w-full min-w-0 truncate` |
| Meta | `ItemDescription` | `{property} · Unit {n} · {relative date}` · `text-xs mb-0 line-clamp-none` · via `formatRelativeDate` from `#lib/formatters/date` |
| Content wrapper | `ItemContent` | **`min-w-0`** — load-bearing, not defensive |
| Action | `ItemActions` | the status `Badge` (§B-4). No buttons in the row — the whole row is the affordance. |

> **`truncate` on `ItemTitle` is inert without help.** `ItemTitle` is `flex w-fit`; a flex
> container has nothing to clip, so `text-overflow: ellipsis` never fires. It needs
> `block w-full min-w-0` on itself **and** `min-w-0` on the flex parent (`ItemContent`). This is
> the exact defect Phase 65 shipped and then fixed in `c22cb1f0e`.

**Density (measurable at §E):** `p-4` top+bottom (32px) + two text lines (20px + 16px at their
declared leadings) ≈ **72px per row**, `gap-2` (8px) between rows. At 375px the meta line will
wrap for long property names; the row grows, and that is correct — no fixed height, no
`line-clamp` on the meta line.

> **`line-clamp-none` is required to deliver that, not optional.** `ItemDescription`'s base
> string is `… line-clamp-2 …` (`item.tsx:131-143`), and `text-xs mb-0` is in no conflicting
> tailwind-merge group, so the clamp survives unless it is explicitly displaced. At 375px
> `ItemContent` resolves to ~165px and a long meta line runs to three lines — the clipped one
> being the applied date, the row's only time-ordering signal.

**Row states:**

| State | Treatment |
|---|---|
| Loading | 5 `Skeleton` rows at `h-[72px] rounded-lg`, in a `flex flex-col gap-2`. Never a spinner, never a full-page loader. |
| Empty (no applications at all) | `Empty` with `EmptyHeader` → `EmptyMedia variant="icon"` (`Inbox`) → `EmptyTitle` → `EmptyDescription`, plus `EmptyContent` holding the primary `Create an application link` button. |
| Empty (filter matched nothing) | `Empty` **without** `EmptyMedia` and **without** a CTA — `EmptyTitle` "No applications match this filter" + `EmptyDescription` "Clear the unit or status filter to see everything." |
| Error | Inline `text-sm text-muted-foreground` + `Button variant="ghost" size="sm"` labelled `Retry`. Route through `handlePostgrestError` — never a raw PostgREST string. Never an error boundary that removes the link panel. |

> **`Empty` compaction gotcha (Phase 65 L-07):** `<Empty className="py-6">` does **not** compact —
> tailwind-merge leaves the primitive's `md:p-12` intact. A compact `Empty` needs the `md:`
> companion, e.g. `className="py-6 md:p-6"`.

## B-4. Status vocabulary

| DB value (D-07) | UI label | `Badge variant` | Rendered tokens |
|---|---|---|---|
| `new` | **New** | `info` | `border-info/20 bg-info/10 text-info-text` |
| `reviewing` | **Reviewing** | `warning` | `border-warning/20 bg-warning/10 text-warning-text` |
| `approved` | **Approved** | `success` | `border-success/20 bg-success/10 text-success-text` |
| `rejected` | **Declined** | `outline` + `text-muted-foreground` | `text-foreground` base, muted override |

Every variant already carries its `-text` WCAG companion — **zero new CSS, zero new tokens**.

`rejected` is deliberately not `destructive` (UI-13). A declined applicant is not an error, and
red on a fair-housing-regulated surface reads as a judgment about the person.

Label/value mismatch is intentional (UI-14): the column value stays `rejected` because D-07 locks
the CHECK constraint; the label is "Declined". Both the badge map and the action label live in one
exported `APPLICATION_STATUS` module so they cannot drift.

## B-5. `/applications/[id]` detail page

```
<div className="p-6 lg:p-8 bg-background min-h-full flex flex-col gap-6">
  ├─ <Breadcrumb aria-label="Breadcrumb">  Applications / {Applicant name}
  ├─ header row (flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between)
  │    left:  <h1 className="typography-h1">{name}</h1>
  │           <p className="text-sm text-muted-foreground mb-0">{property} · Unit {n} · Applied {date}</p>
  │    right: status Badge  +  overflow DropdownMenu (MoreVertical, aria-label="Application actions")
  ├─ action bar   (§B-6)
  ├─ detail cards (one Card per applicant-form section, same order and same headings)
  └─ owner notes  (Textarea className="min-h-24!"  +  Button "Save notes")
```

**Detail cards** — one `<Card>` per form section, `CardHeader` + `CardContent`, containing:

```
<dl className="grid gap-3 sm:grid-cols-2">
  <div className="flex flex-col gap-1">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="text-sm text-foreground mb-0">{value ?? "Not provided"}</dd>
  </div>
  …
</dl>
```

- Single column below 640px, two columns at `sm` and above.
- Optional fields the applicant left blank render **"Not provided"** in `text-muted-foreground` —
  they are **not** hidden. An owner needs to see that a field was offered and skipped.
- **`mb-0` on every `<dd>`** — `<dd>` is not a `<p>`, but each is the last child of a
  `flex flex-col gap-1` wrapper; verify against §D-3's parent-box rule before adding or removing it.

**Breadcrumb** — the `<nav>` requires `aria-label="Breadcrumb"` (CLAUDE.md accessibility), and
`BreadcrumbList` needs the same `pl-0 mt-0 mb-0 [&>li]:mb-0` set as every other list on this
surface: it renders a bare `<ol>` whose own classes are all layout, so §D-3's unscoped `ul, ol`
and `li` base rules land on it in full. It is the first flex item of a `flex flex-col gap-6`
shell, so none of those margins collapse.

**Anonymized rows.** After the 730-day sweep an application still exists as a stub. The detail
page must render that honestly rather than showing `[deleted]` placeholders as if they were data:
a full-width `Alert` above the detail cards —

> **This application has been anonymized.** TenantFlow removes applicant details two years after a
> decision. The unit, dates, status and recorded reason are kept.

— and the PII cards are **not rendered at all**. Only the stub card (unit, dates, status,
`disposition_reason`) renders.

**The queue row must ask the same question.** A swept row still appears in the queue, and reading
`applicant_first_name`/`applicant_last_name` unconditionally renders it as a person named
`[deleted] [deleted]` under a normal icon and a normal status chip — indistinguishable from a live
applicant. The row title reads `ANONYMIZED_HEADING` from `#lib/applications/application-copy`
whenever `isAnonymized(row)`, which is the same constant the detail page's `<h1>` and breadcrumb
read, so the list and the page it opens cannot disagree. `anonymized_at` is already in
`LIST_SELECT_COLUMNS` and already mapped by `mapRentalApplicationSummaryRow` for exactly this. The
meta line is untouched: the sweep clears applicant columns only, so the property, unit and applied
date are still real.

## B-6. The approve / convert affordance (UI-15)

The action bar is a `flex flex-col gap-2 sm:flex-row sm:items-center` block. Its primary control
depends on three pieces of state:

| `status` | `converted_tenant_id` | Primary control | Secondary |
|---|---|---|---|
| `new` \| `reviewing` | null | **`Approve and open tenant form`** (filled primary) | `Mark reviewing` (outline, only when `new`) · `Decline` (outline) |
| `approved` | null | **`Open tenant form`** (filled primary) | `Decline` (outline) |
| any | set | **`View tenant`** (outline) | — |

**Helper line, always rendered directly beneath the primary control**, `text-xs
text-muted-foreground mb-0`:

> Marks this application approved and opens the tenant form with these details filled in. The
> tenant record is not created until you submit that form.

For the `View tenant` case the helper becomes:

> Converted to tenant {Name} on {date}.

…and when the tenant was later deleted (`converted_tenant_id` nulled by `on delete set null`):

> The tenant record created from this application no longer exists.

**Navigation carries the application ID only** — `/tenants/new?application=<uuid>`. **Never**
`?email=…&first_name=…`: applicant PII in a query string lands in Vercel access logs, browser
history, and the `Referer` header of every outbound link on the destination page. This is a
contract clause, not a preference.

**Duplicate-tenant notice** (research edge case) renders on the *destination* page, not here: a
non-blocking `Alert` above the prefilled form — *"This email already matches tenant {Name}. Link to
the existing tenant instead?"* — with both actions available. **Never a hard block**; the same
person legitimately applies for a second unit.

## B-7. Decline and delete

**Decline (UI-16)** — a `Dialog`, not a `ConfirmDialog`, because a reason must be captured:

| Element | Spec |
|---|---|
| Title | **Decline this application** |
| Body | **Choose a reason. This is stored with the application and is kept after applicant details are removed, so you can show why a decision was made.** |
| Control | `Select`, required, `aria-label="Reason"` — fixed vocabulary below |
| Confirm | `Button` (default variant, **not** destructive) labelled **Decline application** |
| Cancel | `Button variant="outline"` labelled **Cancel** |

Fixed `disposition_reason` vocabulary (D-11d — closed list so it can never become free-text PII):

`Unit no longer available` · `Income did not meet the stated requirement` · `Rental history did not
meet the stated requirement` · `Incomplete application` · `Applicant withdrew` · `Another applicant
was selected` · `Other`

**No confirmation dialog beyond this one, and no destructive styling.** Decline is reversible (the
status can be changed back), it sends the applicant nothing (D-10), and it deletes nothing.

**Delete application (UI-17)** — the only destructive action in the phase. Lives in the header
overflow `DropdownMenu`, opens the existing `ConfirmDialog` with `confirmVariant="destructive"`:

| Element | Copy |
|---|---|
| Title | **Delete application** |
| Description | **This permanently deletes the application and the reason you recorded for your decision. TenantFlow keeps applications for two years so you can show why a decision was made. This cannot be undone.** |
| `confirmText` | **Delete** |

Deleting an application **never** touches the converted tenant (D-09) — nothing points from
`tenants` back to `rental_applications`, so no cascade is possible. Do not add a warning implying
otherwise.

## B-8. Copy deck — owner surfaces

| Slot | Copy |
|------|------|
| `/applications` `<h1>` | **Applications** |
| `/applications` subtitle | **Review applicants for your vacant units and turn approvals into tenant records.** |
| Status tabs | **All · New · Reviewing · Approved · Declined** |
| Unit filter placeholder | **All units** |
| Pager | **Showing {from}–{to} of {total}** · **Previous** · **Next** |
| Queue empty — title | **No applications yet** |
| Queue empty — body | **Create an application link for a vacant unit and share it on your listing.** |
| Queue empty — CTA | **Create an application link** |
| Filtered empty — title | **No applications match this filter** |
| Filtered empty — body | **Clear the unit or status filter to see everything.** |
| Queue error | **Couldn't load applications.** + `Retry` |
| Detail — primary CTA | **Approve and open tenant form** |
| Detail — approved CTA | **Open tenant form** |
| Detail — converted CTA | **View tenant** |
| Detail — secondary | **Mark reviewing** · **Decline** |
| Detail — blank optional value | **Not provided** |
| Detail — owner notes label | **Private notes** |
| Detail — owner notes helper | **Only you can see these. They are removed when applicant details are anonymized.** |
| Detail — owner notes save | **Save notes** |
| Detail — anonymized banner | **This application has been anonymized.** + **TenantFlow removes applicant details two years after a decision. The unit, dates, status and recorded reason are kept.** |
| Decline dialog | per §B-7 |
| Delete confirm | per §B-7 |

**On the short trigger labels `Decline` and `Revoke`.** These are deliberate, not oversights,
and a reviewer should not "fix" them into `Decline application` / `Revoke link`. Both are
triggers that open a confirm surface, and the confirm button there IS explicit
(`Decline application`, `Revoke link` — §B-7, §C). Naming the object twice in a row reads as a
stutter, and each trigger already sits in a container that supplies the object unambiguously:
`Decline` next to `Approve and open tenant form` on one application's detail page, `Revoke` in
the row of the link it revokes. This differs from the banned generic labels (`Save`, `Submit`,
`OK`, `Cancel`), which name no domain action at all — `Decline` and `Revoke` each name exactly
one. The explicit noun belongs on the button that commits the change, which is where it is.

---

# C. Owner link-management surface (D-03a)

Band 2 of `/applications`, `id="application-links"`,
`className="rounded-lg border bg-card p-6 flex flex-col gap-4"`.

| Element | Spec |
|---|---|
| Heading | `<h2 className="text-base font-semibold text-foreground">Application links</h2>` |
| One-liner | `<p className="text-sm text-muted-foreground mb-0">Post one link per vacant unit. Anyone with the link can apply. You can revoke a link at any time.</p>` — `mb-0` required (flex parent, §D-3) |
| Body | `<ul className="flex flex-col gap-3 pl-0 mt-0 [&>li]:mb-0">`, one `<li>` per unit |

**Per-unit row** — `flex flex-col gap-2 rounded-md border p-4`:

```
row 1:  {Property} · Unit {n}                                    [state chip]
row 2:  ── state-dependent control block ──
row 3:  {expiry line, text-xs text-muted-foreground mb-0}
```

| Link state | Chip | Control block | Expiry line |
|---|---|---|---|
| No link | none | `Button variant="outline" size="sm"` **Create link** | — |
| **Active** | `Badge variant="success"` **Active** | `flex gap-2`: read-only `Input` (URL, `readOnly`, `font-mono text-xs`, `onFocus` selects all) + `Button variant="outline" size="icon"` with `Copy` glyph and **`aria-label="Copy application link"`** + `Button variant="ghost" size="sm"` **Revoke** | **Expires {Oct 5, 2026} ({58 days})** |
| Expired | `Badge variant="outline"` **Expired** | `Button variant="outline" size="sm"` **Create a new link** | **Expired {date}** |
| Revoked | `Badge variant="outline"` **Revoked** | `Button variant="outline" size="sm"` **Create a new link** | **Revoked {date}** |

**The URL is always visible and always re-copyable.** No "copy now, you will not see this again"
dialog, no reveal-once modal, no regenerate-to-retrieve. That is the whole point of D-03a: the
owner pastes this link to Zillow on Monday and to Craigslist on Thursday, and a shown-once model
would force a rotation that silently breaks the listing already posted.

**Copy feedback — both, because a toast can be missed on mobile:**
1. `toast.success("Application link copied")` (sonner; the `two-factor-setup-dialog.tsx` precedent).
2. The icon swaps `Copy` → `Check` for 2000ms, and the button's `aria-label` swaps to
   `Application link copied` so the change is announced, not just seen.

**Revoke confirm** — `ConfirmDialog`, `confirmVariant="destructive"`:

| Element | Copy |
|---|---|
| Title | **Revoke this link?** |
| Description | **Anyone who opens it, including from a listing you have already posted, will see that the link is no longer available. Applications you have already received are not affected. You can create a new link afterward.** |
| `confirmText` | **Revoke link** |

**Link panel states:** loading → 3 `Skeleton` rows `h-24 rounded-md`; empty (owner has no units) →
`Empty` compact, `EmptyTitle` "No units yet" + `EmptyDescription` "Add a unit to a property before
you can accept applications for it."; error → inline copy + `Retry`, never an error boundary that
removes the queue.

**Icon-only buttons carry `aria-label`, not `title`** (CLAUDE.md accessibility). The copy button is
the only icon-only control in this phase.

---

# D. Repo-specific CSS traps (binding)

These are the failure modes this codebase has actually shipped. A spec that assumes a clean slate
will be wrong. Each is stated with its cause, so the executor can reason about new cases rather
than pattern-matching the listed ones.

## D-1. The **unlayered** mobile touch-target block — NEW, not seen in Phase 65

`src/app/globals.css:1536` opens `@media (max-width: 768px)` at **brace depth 0** — outside every
`@layer`. Verified by brace-balance scan, not by eye.

```css
@media (max-width: 768px) {         /* UNLAYERED */
  .btn, button, [role="button"] { min-height: 2.75rem; min-width: 2.75rem; padding: clamp(.75rem, 2vw, 1rem); }
  .form-input, input, select, textarea { min-height: 2.75rem; padding: clamp(.75rem, 2vw, 1rem); }
}
```

**Unlayered normal declarations outrank every layered declaration, at any specificity.** Tailwind
v4 emits utilities into `@layer utilities`. Therefore at ≤768px these rules beat `px-3`, `py-1`,
`min-h-16`, `h-9` — everything.

| Consequence | Effect at 375px | This spec's response |
|---|---|---|
| `Input` `px-3 py-1` → `padding: 12px` all round | with `h-11` (44px) the content box is 44 − 24 − 2 = **18px** for a 16px font | **UI-02:** `inputSize="lg"` (48px) everywhere on `/apply` → 22px content box |
| `Textarea` `min-h-16` (64px) → `min-height: 44px` | an empty textarea looks like a text input | `className="min-h-24!"` — a **layered `!important`** declaration is the only thing that beats an unlayered normal one. The trailing-`!` v4 syntax is new to this repo; comment it at each use site. |
| `SelectTrigger` (a `<button>`) → 44px min, 12px padding | `data-[size=default]:h-11` (0,2,0) blocks a plain `h-12` override | **UI-03:** no `Select` on `/apply` at all |
| `Checkbox` (a `<button role="checkbox">`) → **44×44** on mobile, 16×16 on desktop | the attestation control is large on phones | `Field className="items-start gap-3"` so it top-aligns against a two-line label. `[UAT]` visual check at 375px. |
| `Button size="sm"` and `size="default"` are **the same height** at ≤768px | both floor at 44px | do not chase a phantom size difference on mobile |

**D-1 is viewport-scoped, not surface-scoped.** The media query keys off width alone, so it fires
on the OWNER surfaces too whenever the window is ≤768px — `/applications` is documented as
phone-supported in the surface table. Every `Input`, `Textarea`, `Select` and `Checkbox` this phase
renders inherits it, on either surface. Concretely this means the owner-notes `Textarea` in §B-5
carries `className="min-h-24!"` for exactly the same reason the `/apply` textareas do. When adding
any control not listed in the table above, check it against the two selector lists first.

**Do not "fix" `globals.css` in this phase.** Moving that block into `@layer base` would change
every form, button and input in the app at ≤768px. It is a real systemic defect and belongs in its
own phase with its own regression sweep. Record it; do not touch it.

## D-2. `space-y-*` is banned in this phase

Tailwind v4 compiles space utilities as `:where(.space-y-4 > :not(:last-child))` — **specificity
0**. Any explicit margin utility on a child (`mb-0`, `my-0`, `mt-0`) outranks it and **flattens the
rung entirely**. Phase 65 shipped this bug twice in one commit (`120f81b68`).

The rule that survives is not "avoid `mb-0`" — the two needs genuinely collide. The rule is:
**use `flex flex-col gap-*` or `grid gap-*` everywhere**, which removes the conflict rather than
managing it. `gap` is not cancelled by a child margin.

If a `space-y-*` parent is genuinely unavoidable in inherited code: use the **single-axis** utility
that does not touch the contested side (`mt-0` on a non-last child, `mb-0` on the last child), never
`my-0`. Specificity: `mt-0` is (0,1,0) and beats the `:where()` rule (0,0,0) — that is the point, and
also the hazard.

## D-3. Unscoped `@layer base` element rules

`globals.css:499–525`, all inside `@layer base` — so a Tailwind utility beats them by **layer
order**, not specificity. A long form is mostly `<p>`, `<label>`, `<a>`, `<ul>` and `<li>`.

| Rule | Neutralizer | When it is needed |
|---|---|---|
| `p { margin-bottom: 1rem; line-height: 1.7 }` | `mb-0` | **Depends on the parent box.** Trapped (and therefore a defect) when the `<p>` is a **flex/grid item** or the **last child of a padded box**. Absorbed (and `mb-0` is inert) when the parent is a plain block whose own rhythm is ≥16px. |
| `a:not([role="button"]):not(.button):not([class*="button"])` — `color: primary` + transparent underline that turns visible on hover | `no-underline` **and** `text-foreground` on the `<Link>` | Every `<Button asChild><Link>` and every whole-row `<Link>`. `buttonVariants` contains no "button" substring and sets no `role="button"`, so it satisfies all three `:not()` guards and the rule applies. |
| `ul, ol { margin: 1rem 0; padding-left: 1.5rem }` | `pl-0 mt-0` (or `my-0` when the `<ul>` is not inside a `space-y-*`) | Every list in this phase — the queue, the link panel |
| `li { margin-bottom: 0.25rem }` | `[&>li]:mb-0` on the `<ul>` | Same |

Also inherited: `p`'s `line-height: 1.7` (`--leading-relaxed`), which is why the typography table
declares body leading as 1.5 via `text-sm`'s own line-height rather than relying on the element
default.

**Every `mb-0` and `mt-0` in this phase carries a one-line comment naming the parent box that makes
it necessary.** An uncommented one is indistinguishable from cargo cult, and an *inert* one is
worse than none — it teaches the next reader the wrong rule.

## D-4. `truncate` is inert on a flex container

`ItemTitle` is `flex w-fit`. `text-overflow: ellipsis` needs a block box with `overflow: hidden`
and a constrained width. Required: `block w-full min-w-0 truncate` on `ItemTitle` **and** `min-w-0`
on `ItemContent`. Without the parent's `min-w-0`, the flex item's `min-width: auto` floor keeps it
from ever shrinking below its content, so `w-full` never constrains anything.

## D-5. Everything else

- No gradient text (`background-clip: text`) — forbidden project-wide.
- `text-muted-foreground`, never bare `text-muted`. `bg-background`, never `bg-white`.
- Vivid tokens for **icons**, `-text` companions for **text** (see §Color).
- No inline styles anywhere, including the honeypot's off-screen positioning.
- No emojis. lucide only.
- Max 300 lines per component, 50 lines per function — the applicant form **must** be split into
  `application-fields-*.tsx` modules; a single 26-field component will breach it.
- `Alert`'s `[&>svg]:text-current` (specificity 0,1,1) beats a `text-warning` class (0,1,0) placed
  on the svg. Alert icons inherit the Alert's text colour. **Do not fight this** — leave alert
  glyphs at currentColor and carry semantics via the variant.

---

# E. Measurable acceptance geometry

jsdom computes **no layout** — asserting that a class string is present proves spelling, not
behaviour. That is exactly how Phase 65 shipped an inert `truncate` and a flattened `space-y` rung.

`/apply/[token]` is public and unauthenticated, so **Playwright can drive it with no auth fixture,
no storage state and no session setup** — a real browser, real layout, real CSS cascade. Use it.

Every row below is a geometric or ordering assertion, not a class check.

| # | Assertion | Viewport | Surface |
|---|---|---|---|
| E-1 | Disclaimer block bottom ≤ submit button top: `d.y + d.height <= s.y` | 375 **and** 1280 | `/apply` |
| E-2 | Every `input` on the form has `getBoundingClientRect().height === 48` | 375 | `/apply` |
| E-3 | Every `textarea` has `height >= 96` | 375 | `/apply` |
| E-4 | Every form field container width `=== 309` (see the geometry table — 343 card border box − 2 border − 32 padding) | 375 | `/apply` |
| E-5 | Card width `=== 672` (the `max-w-2xl` cap) | 1280 | `/apply` |
| E-6 | Honeypot: `not.toBeInViewport()` **and** `getBoundingClientRect().right < 0` | 375 | `/apply` |
| E-7 | Honeypot: Tab from the attestation checkbox lands on the submit button, never on `#apply-company-website` | 375 | `/apply` |
| E-8 | No element on the page matches `input[name*="ssn" i], input[name*="social" i], input[type="file"], input[name*="dob" i], input[name*="birth" i], input[name*="bank" i], input[name*="account" i], input[name*="routing" i], input[name*="card" i], input[name*="license" i], input[name*="passport" i], input[name*="govid" i], input[name*="government" i]` | any | `/apply` |
| E-9 | `<meta name="robots" content="noindex, nofollow">` present in the **rendered** head | any | `/apply` |
| E-10 | `/apply/<garbage>` returns **HTTP 200** and renders the unavailable card; its text is byte-identical to the expired-token render | any | `/apply` |
| E-11 | Income: the required total field's `<label>` precedes every employer-field label in DOM order, and there is exactly **one** `(optional)` group heading between the total and the end of the section | any | `/apply` |
| E-12 | Fair-housing note is present and inside Section 3's `<section>` | any | `/apply` |
| E-13 | Sections stack single-column: at 375px every `Field` container has the same `x` | 375 | `/apply` |
| E-14 | Paired name fields sit side by side: at 1280px `first.x < last.x` and `first.y === last.y` | 1280 | `/apply` |
| E-15 | After a successful submit, no input on the page holds the submitted email | 375 | `/apply` |
| E-16 | On a 429, the email input still holds its value and the submit button is enabled | 375 | `/apply` |
| E-17 | Queue row height `>= 64` and rows do not overlap (`row[n].y >= row[n-1].y + row[n-1].height`) | 375 | `/applications` |
| E-18 | Queue row `<a>` computed `text-decoration-line === "none"` and computed `color` equals the `--color-foreground` resolved value | 1280 | `/applications` |
| E-19 | The link-panel URL `<input>` is visible with a non-empty `value` on **second** page load (proves re-copyability, D-03a) | 1280 | `/applications` |
| E-20 | The queue `<ul>` has computed `padding-left === "0px"`, `margin-top === "0px"` **and `margin-bottom === "0px"`** (`margin: 1rem 0` is a shorthand — cancelling only the top leaves 16px that adds to the `TabsContent` gap), and its first `<li>` `margin-bottom === "0px"` | 1280 | `/applications` |
| E-21 | The conversion link's `href` matches `^/tenants/new\?application=[0-9a-f-]{36}$` and contains no other query parameter | any | `/applications/[id]` |

E-1, E-6, E-7, E-8, E-9 and E-10 are **requirement-level** assertions (APPLY-06, APPLY-02,
APPLY-01) and are non-optional. The rest are contract assertions.

**Unit tests still own:** the disclaimer constant snapshot, the zod schema's rejection of an `ssn`
key, the optionality of the employer fields, the `queryOptions()` factory shapes, and the
`AddTenantForm` `initialValues` prefill **at both call sites** (`/tenants/new/page.tsx` **and**
`@modal/(.)tenants/new/page.tsx` — research Pitfall 6; a single-call-site test passes while the
modal path silently drops the prefill).

---

# F. Out of scope / deferred

Recorded so nobody adds them mid-phase, and so the reasoning survives.

| Idea | Why not now |
|---|---|
| Unread-count badge on the `Applications` nav entry | Needs a per-status count query nothing else on the page needs. Cheap to add later once the queue's own counts exist. |
| Status counts on the queue tabs | Same. |
| Applicant-facing status page or tracking link | **Permanently out** — D-10. Any status surface is adverse-action-shaped. |
| Approve/reject emails to the applicant | **Permanently out** — D-10, on FCRA grounds. |
| Cross-owner applicant search / "applied to 3 other properties" | **Permanently out.** Assembling information on consumers for furnishing to third parties would make TenantFlow a consumer reporting agency under 15 U.S.C. § 1681a(f). This is a standing invariant, and the violating feature will look like a good idea. |
| Apply-once-send-to-many | Same statute, same answer. |
| Document / pay-stub upload | D-06. Pulls in Storage, signed URLs, quota metering and a materially heavier PII obligation. |
| Application fee collection | Pulls in a per-state fee regime (research Pitfall 8) and cuts against no-payment-facilitation. |
| Pre-purge "these will be anonymized in 30 days" notice | Worth doing; a `create_notification` call plus a second cron predicate. Converts a silent data-loss event into an informed one. Not this phase. |
| Printable / downloadable copy of the submitted application (applicant side) | Re-displays PII on a possibly-shared device and needs a print stylesheet nothing else needs. |
| Fixing the unlayered `@media (max-width: 768px)` block in `globals.css` | Real systemic defect (§D-1). Changes every form, button and input in the app at ≤768px. Needs its own phase and its own regression sweep. |

---

## Provenance

- Authored 2026-08-06 by `gsd-ui-researcher` under `--auto`; the owner delegated all design
  decisions ("you decide") in `66-CONTEXT.md`.
- Upstream inputs: `66-CONTEXT.md` (D-01…D-17), `66-RESEARCH.md` (F-1…F-6, FCRA section,
  Convert-to-Tenant, Validation Architecture, Project Constraints), `REQUIREMENTS.md`
  (APPLY-01…06 + positioning invariants), `ROADMAP.md` Phase 66, `CLAUDE.md`.
- Format and rigor modelled on `65-UI-SPEC.md`.
- Codebase state verified this session by direct read: `components.json`, `src/app/globals.css`
  (brace-depth scan of the `@media (max-width:768px)` block), `src/app/sign/[token]/page.tsx`,
  `src/components/ui/{input,button,card,badge,alert,empty,field,item,checkbox,textarea,select,confirm-dialog,label}.tsx`,
  `src/lib/forms/{form-hook.tsx,fields/*,form-components/submit-button.tsx}`,
  `src/components/shell/{main-nav.tsx,app-shell.tsx}`, `src/lib/breadcrumbs.ts`,
  `src/app/(owner)/documents/{page.tsx,recent-documents-panel.tsx}`,
  `src/components/tenants/add-tenant-form.tsx`, `src/lib/templates/lease-template.ts`,
  and `lucide-react`'s exported icon set.
- One research correction recorded: `66-RESEARCH.md`'s honeypot `toBeHidden()` assertion is wrong
  and is replaced in §A-6 / E-6.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
