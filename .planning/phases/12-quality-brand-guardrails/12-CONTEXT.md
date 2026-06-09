# Phase 12: Quality & Brand Guardrails - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning
**Source:** Grounded the publish/approval surface, admin gating, E-E-A-T schema, and self-critique options.

<domain>
## Phase Boundary
Make drafts on-brand + factually grounded + gated against thin/AI-spam BEFORE they reach review, and give the owner a real approve/reject surface (nothing publishes without them). Builds on the Phase 11 generator + the `in-review` ingest. No SEO-slug reclaim (Phase 13), no scheduling (Phase 14).
</domain>

<decisions>
## Implementation Decisions (LOCKED — grounded)

### BLOG-06 — brand voice + E-E-A-T + RAG-grounding ENFORCED
- The generator (`scripts/generate-blog-draft.ts`) already enforces a landlord-only brand-voice system prompt + no-fabrication + the banlist + a banlist sanitizer. Phase 12 strengthens it with explicit E-E-A-T conventions (first-hand/experience framing, specific actionable depth, authoritative-not-hypey) and tightens "ground every TenantFlow specific in the retrieved facts only."
- **E-E-A-T author byline already exists:** `src/lib/seo/article-schema.ts` supports `authorType: 'Person' | 'Organization'` (Organization for the "TenantFlow Team" brand byline) and `blog-post-page.tsx` renders it. Ensure generated posts (which insert with `author_user_id = null`) render the **Organization "TenantFlow Team"** byline — verify/adjust `blog-post-page.tsx` so a null author → "TenantFlow Team" / Organization Article schema.

### BLOG-07a — self-critique gate (reject off-brand/thin BEFORE in-review)
- Add an **LLM-as-judge** pass in the generator AFTER the 9 gates pass, BEFORE the HMAC POST: send the draft back to Mistral with a critique rubric (score 1-5 each: brand-alignment/landlord-only, genuine helpfulness/depth, factual grounding in the retrieved chunks i.e. no hallucinated TenantFlow specifics, not thin/AI-spam) + return structured `{scores, issues[], verdict}`. If verdict=reject or any score < threshold → regenerate with the critique as feedback (bounded, reuse the repair-loop pattern). Only POST drafts that pass critique. (qwen3-reranker is loaded but rerank isn't apt for quality judgment — use Mistral LLM-as-judge; reranker stays for RAG.)

### BLOG-07b — human approve/reject surface
- **Today there is NO review UI** — the migration comment says publishing is a "manual flip 'in-review' → 'published' via Supabase Studio." Build a minimal admin page.
- New page in the existing **`(admin)`** group (its `layout.tsx` already auth-walls: `getUser()` → `users.is_admin` → redirect non-admins), e.g. `src/app/(admin)/admin/blog/page.tsx`: list `status='in-review'` drafts (title, slug, words, created_at) + a preview of the markdown body, with **Approve** (status→`'published'`, `published_at=now()`) and **Reject** (status→`'archived'`) actions.
- Mutations use the **authenticated admin client** against the existing `blogs_update_admin` RLS policy (is_admin-gated) — TanStack Query mutation, invalidate `blogKeys` (+ `ownerDashboardKeys.all` if relevant). On publish, **`revalidatePath('/blog')` + `revalidatePath('/blog/<slug>')`** (a server action / route) so the public ISR pages surface the new post. Statuses live in the CHECK: `draft | in-review | published | archived`.
- Nothing publishes without the owner clicking Approve — satisfies "nothing publishes without the owner."

### Verification
- Self-critique: a deliberately thin/off-brand draft is rejected by the judge; a good draft passes. Generated drafts still reach `in-review`.
- Approve/reject UI: an admin sees the Phase-11 in-review draft, previews it, Approve → it becomes `published` + appears at `/blog`; Reject → `archived`, not public. Non-admins are redirected (existing wall). E2E/unit coverage for the gating + the mutations.
</decisions>

<constraints>
- TRACKED frontend + script work → perfect-PR gate; keep CI green (typecheck/lint/build/E2E). React 19 Server Components by default, `'use client'` only for the mutation/interactivity; ≤300 lines/component, ≤50/function; shadcn components; `text-muted-foreground`/`bg-background`; query keys via `queryOptions()` factories (`blog-keys.ts`); mutations invalidate related keys.
- Auth: the `(admin)` layout already gates is_admin; don't re-wall. Mutations go through RLS (`blogs_update_admin`), never service role on the frontend.
- The self-critique adds latency/cost (another Mistral pass) — bound the attempts; `AbortSignal.timeout` already on the chat call.
- Drafts stay `in-review` until a human acts; never auto-publish; the generator never sets `published`.
</constraints>

<canonical_refs>
- `scripts/generate-blog-draft.ts` (generator — add the critique pass), 09/10/11-SUMMARY (LLM/RAG/ingest config).
- `src/app/(admin)/layout.tsx` (is_admin auth wall to inherit), `src/app/(admin)/admin/analytics/page.tsx` (admin page pattern).
- `src/lib/seo/article-schema.ts` + `src/app/blog/[slug]/blog-post-page.tsx` (E-E-A-T author byline).
- `src/hooks/api/query-keys/blog-keys.ts` (blog query-key factory + select columns), blogs RLS migrations (`blogs_update_admin`).
- `src/app/blog/page.tsx` (public list filters `status='published'`).
</canonical_refs>

<deferred>
- SEO ghost-slug reclaim (generate-at-slug + drop redirect) → Phase 13.
- Cadence/schedule, dedupe, monitoring → Phase 14.
- Richer editorial (inline edit before publish, image generation) → out of scope unless trivial.
</deferred>

---
*Phase: 12-quality-brand-guardrails — E-E-A-T/brand enforcement + LLM-as-judge self-critique gate in the generator + a minimal admin approve/reject surface in (admin), replacing the manual Supabase-Studio status flip.*
