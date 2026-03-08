# Technology Stack: Blog Redesign + Newsletter + CI Optimization

**Project:** TenantFlow v1.1 Milestone
**Researched:** 2026-03-06
**Overall confidence:** HIGH

---

## Executive Summary

This milestone requires **zero new npm dependencies**. Every library needed is already installed at a current version. The work is purely additive: new components, one new Edge Function, one SQL migration, and CI workflow restructuring. The only external API integration is the Resend Contacts API (already authenticated via existing `RESEND_API_KEY`).

The one noteworthy finding: Resend has deprecated the Audiences API (November 2025) in favor of a global Contacts + Segments model. The implementation plan references `POST /audiences/{id}/contacts` -- this must be updated to `POST /contacts` with optional `segments` array. The old endpoint still works but will be removed.

---

## Recommended Stack

### Core Framework (No Changes)

| Technology | Installed Version | Purpose | Status |
|------------|-------------------|---------|--------|
| Next.js | 16.1.6 | App framework | No change |
| React | 19.2.4 | UI library | No change |
| TailwindCSS | 4.2.1 | Styling | No change |
| TanStack Query | 5.90.21 | Server state | No change |
| nuqs | 2.8.8 | URL state (pagination) | No change -- already used for data tables |
| Supabase JS | 2.97.0 | DB queries + auth | No change |

### Libraries Already Installed and Used by This Milestone

| Library | Version | Purpose in This Milestone | Why No Change |
|---------|---------|---------------------------|---------------|
| `nuqs` | 2.8.8 | Blog pagination URL state (`?page=1`) | Already used in `use-data-table.ts` with identical `parseAsInteger.withDefault(1)` pattern. Proven in production. |
| `@tanstack/react-query` | 5.90.21 | `useQuery` for paginated blog lists, `useMutation` for newsletter subscribe | Already powers all data fetching. Blog hooks extend existing patterns. |
| `react-markdown` | 10.1.0 | Blog detail page content rendering | Already dynamically imported in blog detail page. No version change needed. |
| `rehype-raw` + `rehype-sanitize` + `remark-gfm` | 7.0.0 / 6.0.0 / 4.0.1 | Markdown processing pipeline | Already installed for existing blog detail page. |
| `lucide-react` | 0.575.0 | Icons (Clock, Mail, ChevronLeft, ChevronRight, ArrowRight, etc.) | Already the sole icon library. All icons needed exist in this version. |
| `sonner` | 2.0.7 | Toast feedback for newsletter errors | Already used across the app. |
| `next/image` | (bundled with Next.js 16) | Blog card featured images | Already configured with Unsplash and Supabase remote patterns. |
| `next/dynamic` | (bundled with Next.js 16) | Dynamic import for MarkdownContent | Already used for blog detail page. |
| `@sentry/deno` | 9.x | Error tracking in newsletter Edge Function | Already in `deno.json` import map. |
| `@upstash/ratelimit` + `@upstash/redis` | (latest via npm) | Rate limiting for newsletter Edge Function | Already in `deno.json` import map and `_shared/rate-limit.ts`. |

### Existing Design System Components Used

| Component | Location | Purpose |
|-----------|----------|---------|
| `BlurFade` | `src/components/ui/blur-fade.tsx` | CSS-only fade-in animations (no `motion` library, uses IntersectionObserver) |
| `Button` | `src/components/ui/button.tsx` | Pagination buttons, CTAs |
| `LazySection` | `src/components/ui/lazy-section.tsx` | Intersection-based lazy loading for below-fold sections |
| `SectionSkeleton` | `src/components/ui/section-skeleton.tsx` | Loading placeholder for lazy sections |
| `PageLayout` | `src/components/layout/page-layout.tsx` | Page wrapper with nav/footer |
| `EmptyState` | `src/components/shared/empty-state.tsx` | Empty category page state |

### Database (SQL Migration Only)

| Technology | What | Purpose | Notes |
|------------|------|---------|-------|
| PostgreSQL RPC | `get_blog_categories()` | Distinct categories with counts | SECURITY INVOKER, SQL language, STABLE. No new extensions. |
| Supabase PostgREST | `.range()` + `{ count: 'exact' }` | Paginated blog queries | Pattern already used in all data tables. |

### Edge Function (New)

| Function | Runtime | Dependencies | Pattern |
|----------|---------|--------------|---------|
| `newsletter-subscribe` | Deno (Supabase Edge) | `@sentry/deno`, `@upstash/ratelimit`, `@upstash/redis` (all already in import map) | Identical to `tenant-invitation-accept`: unauthenticated, rate-limited, CORS-enabled, `errorResponse()` |

### CI (Workflow YAML Only)

| Change | Technology | What |
|--------|-----------|------|
| Workflow restructure | GitHub Actions | Split `checks` trigger: lint/typecheck/build on PR only, e2e-smoke on push to main independently |

---

## External API: Resend Contacts (Updated from Audiences)

**Confidence:** HIGH (verified via official Resend docs, November 2025 announcement)

### What Changed

Resend deprecated the Audiences API in November 2025. Key changes:

| Before (Deprecated) | After (Current) |
|---------------------|-----------------|
| `POST /audiences/{id}/contacts` | `POST /contacts` |
| Contacts scoped to one audience | Contacts are global entities |
| `audience_id` required | `audience_id` not needed |
| Audiences for grouping | Segments for grouping (renamed) |

### Correct API for Newsletter Subscribe

```
POST https://api.resend.com/contacts
Authorization: Bearer {RESEND_API_KEY}
Content-Type: application/json

{
  "email": "user@example.com",
  "segments": ["{RESEND_NEWSLETTER_SEGMENT_ID}"]   // optional
}

Response: { "object": "contact", "id": "uuid" }
```

### Implementation Impact

The plan's Edge Function references `POST /audiences/${env.RESEND_AUDIENCE_ID}/contacts`. This must be updated to:

```typescript
// CORRECT (current API)
const res = await fetch('https://api.resend.com/contacts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
  },
  body: JSON.stringify({
    email,
    segments: env.RESEND_NEWSLETTER_SEGMENT_ID
      ? [env.RESEND_NEWSLETTER_SEGMENT_ID]
      : undefined,
  }),
})
```

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | Yes | Already set in Edge Function secrets (used by auth-email-send) |
| `RESEND_NEWSLETTER_SEGMENT_ID` | No (optional) | Segment ID to group newsletter subscribers. Create in Resend dashboard. If omitted, contact is created globally. |

The `RESEND_AUDIENCE_ID` variable from the plan should be renamed to `RESEND_NEWSLETTER_SEGMENT_ID` to match current Resend terminology.

---

## What NOT to Add

| Temptation | Why Not |
|------------|---------|
| `resend` npm package in Edge Function | Raw `fetch` to `api.resend.com/contacts` is a single POST. No SDK needed for one endpoint. Existing Edge Functions (auth-email-send) already use the SDK pattern but that ships the full email template API. Newsletter subscribe only needs one HTTP call. |
| `@tailwindcss/typography` plugin import | Already installed as devDependency. The blog detail page uses inline `prose` overrides via Tailwind arbitrary selectors (`[&>h1]:text-4xl`). The `@plugin` directive is NOT imported in `globals.css`. Two options: (a) add `@plugin "@tailwindcss/typography"` to globals.css for proper prose support, or (b) keep the inline overrides. Recommend (a) since the plugin is already installed. |
| Animation libraries (framer-motion, GSAP) | `BlurFade` component already handles all needed animations with CSS transitions + IntersectionObserver. No JS animation library needed. The project already has `motion` (12.34.0) installed but `BlurFade` deliberately avoids it for lighter bundle. |
| Pagination library | `nuqs` + manual page math is sufficient. No need for a pagination library. |
| `tailwind-scrollbar-hide` package | The plan uses `scrollbar-hide` class for the comparisons carousel. This is not a built-in Tailwind utility. Add a `@utility scrollbar-hide` in `globals.css` instead of installing a package. 3 lines of CSS. |
| Email template library for newsletter | No confirmation email is sent. The Edge Function only adds a contact to Resend. Resend handles any welcome/confirmation emails via their Broadcasts feature in the dashboard. |
| RSS feed library | Not in scope for this milestone. |
| MDX tooling | Blog content is stored in DB as markdown, rendered by `react-markdown`. No MDX compilation needed. |

---

## CSS Utilities Needed (Not Library Installs)

Two utilities referenced in the plan do not exist in `globals.css`:

### 1. `scrollbar-hide` (used in comparisons carousel)

```css
@utility scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

### 2. `text-responsive-display-xl` (referenced in hub hero)

This class does not exist. Existing responsive display utilities are:
- `text-responsive-display-lg` (maps to `--text-display-lg`)
- `text-responsive-display` (maps to `--text-display`)

The plan should use `text-responsive-display-lg` or the existing `typography-hero` utility instead. No new utility needed.

### 3. `page-content` (referenced in detail/category pages)

This class does not exist. The detail page should use standard padding (`pt-24` or similar) to clear the fixed nav. This may already work via `PageLayout`.

### 4. `@plugin "@tailwindcss/typography"` (prose classes)

The blog detail page uses `prose prose-lg prose-slate dark:prose-invert`. The `@tailwindcss/typography` package is installed (`0.5.19`) but the `@plugin` directive is missing from `globals.css`. Add it:

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@plugin "@tailwindcss/typography";
```

Without this, the `prose` classes render as no-ops in Tailwind 4.

---

## CI Workflow Changes (No New Actions)

### Current State

| Workflow | File | Trigger | Jobs |
|----------|------|---------|------|
| CI | `ci-cd.yml` | push to main + PR to main | `checks` (lint/typecheck/build), `e2e-smoke` (push to main only, depends on checks) |
| RLS Security | `rls-security-tests.yml` | PR to main + weekly cron | `rls-security` |
| Claude Code | `claude.yml` | Issue/PR comments with @claude | `claude` |
| Dependabot | `dependabot-auto-merge.yml` | Dependabot PRs | auto-merge |

### Problem

The `ci-cd.yml` workflow triggers on both `push` and `pull_request`. When a PR is merged:
1. The PR `pull_request` event fires (checks run)
2. The `push` to main event fires (checks run AGAIN, then e2e-smoke)

This means `checks` runs twice on every merge. The `e2e-smoke` job already correctly gates to push-only with `if: github.event_name == 'push'`, but it depends on `checks`, forcing the duplicate.

### Fix (Workflow YAML Only)

Split into two independent triggers or use conditional job execution:
- `checks` job: PR only (`if: github.event_name == 'pull_request'`)
- `e2e-smoke` job: push to main only, runs its own install (no `needs: [checks]` dependency)

This uses only existing GitHub Actions (`actions/checkout@v6`, `pnpm/action-setup@v4`, `actions/setup-node@v6`). No new actions.

---

## Supabase Edge Function Secrets Needed

| Secret | Exists | Notes |
|--------|--------|-------|
| `RESEND_API_KEY` | Yes | Already set for `auth-email-send` function |
| `SENTRY_DSN` | Yes | Already set for all Edge Functions |
| `FRONTEND_URL` | Yes | Already set for CORS |
| `UPSTASH_REDIS_REST_URL` | Yes | Already set for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Already set for rate limiting |
| `RESEND_NEWSLETTER_SEGMENT_ID` | **No -- new** | Optional. Create a "Newsletter" segment in Resend dashboard, copy the ID |

---

## Version Verification

All versions verified against `package.json` (read directly from codebase):

| Package | In package.json | Latest Known | Action |
|---------|----------------|--------------|--------|
| `nuqs` | 2.8.8 | 2.x stable | No update needed |
| `@tanstack/react-query` | 5.90.21 | 5.90.x | No update needed |
| `react-markdown` | 10.1.0 | 10.x | No update needed |
| `next` | 16.1.6 | 16.x | No update needed |
| `@tailwindcss/typography` | 0.5.19 (devDep) | 0.5.x | No update, just add `@plugin` import |
| `@sentry/deno` | 9.x (import map) | 9.x | No update needed |
| `tailwindcss` | 4.2.1 | 4.x | No update needed |

---

## Installation

```bash
# No new packages to install.
# Zero npm installs required for this milestone.
```

---

## Integration Points

### Data Flow: Newsletter Subscribe

```
User (blog page)
  -> NewsletterSignup component (client)
  -> fetch() to Edge Function URL
  -> newsletter-subscribe Edge Function (Deno)
  -> Rate limit check (Upstash Redis)
  -> POST https://api.resend.com/contacts
  -> Response to client
  -> Toast or success state
```

### Data Flow: Paginated Blog Queries

```
User navigates/clicks pagination
  -> nuqs updates ?page=N in URL
  -> useBlogs(page) re-fires with new queryKey
  -> Supabase PostgREST .range(from, to) + { count: 'exact' }
  -> Response with posts[] + total count
  -> BlogPagination renders based on total
```

### Data Flow: Blog Categories

```
Blog hub loads
  -> useCategories() fires
  -> Supabase RPC get_blog_categories()
  -> Returns [{category, count}]
  -> Rendered as pills linking to /blog/category/{slug}
```

---

## Sources

- [Resend: Migrating from Audiences to Segments](https://resend.com/docs/dashboard/segments/migrating-from-audiences-to-segments) -- HIGH confidence
- [Resend: New Contacts Experience (Nov 2025)](https://resend.com/blog/new-contacts-experience) -- HIGH confidence
- [Resend: Create Contact API](https://resend.com/docs/api-reference/contacts/create-contact) -- HIGH confidence
- [Tailwind CSS Typography in v4](https://github.com/tailwindlabs/tailwindcss-typography) -- HIGH confidence (requires `@plugin` directive)
- [nuqs documentation](https://nuqs.dev/) -- HIGH confidence (verified against existing codebase usage)
- Codebase verification: `package.json`, `deno.json`, `globals.css`, `use-blogs.ts`, `ci-cd.yml` -- all read directly
