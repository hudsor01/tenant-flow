# Phase 11 Summary — Generation Pipeline (BLOG-04, BLOG-05)

**Status:** Engine built + validated up to the authenticated POST; the e2e in-review draft is a one-command owner run (needs `N8N_WEBHOOK_SECRET` in `.env.local`).
**Branch:** gsd/v5.0-milestone-setup (PR #792)

## Outcome
The full generation pipeline exists as a tested script; producing the first real `in-review` draft is the owner's run (the HMAC + RPC creds are scrubbed from the agent's shell).

### Engine — `scripts/generate-blog-draft.ts` (tracked, typecheck + biome clean)
`topic → embed (qwen3) → match_blog_rag_chunks top-6 → Mistral structured draft (json_schema) → deterministic validate/repair against all 9 ingest gates (bounded 3 retries, with specific fix hints) → HMAC-SHA256 sign → POST n8n-blog-ingest → status='in-review'`.
- Reads `.env.local` deterministically (`SUPABASE_SECRET_KEY` for the RPC, `N8N_WEBHOOK_SECRET` for the HMAC, publishable key for the gateway).
- Mirrors the EF's 9 gates verbatim (word_count 1200-3000, h2 4-10, landlord mention, slug regex, meta 50-160, excerpt 80-200, category enum, banlist, DocuSeal ≤1).

### Prototype-driven prompt (BLOG-04 de-risked)
A live one-shot generation hit **7/9 gates first try**; the two misses drove the prompt + repair design:
- **word_count undershoot** → prompt targets 1800-2400 (above the 1200 floor) + the repair step force-expands short drafts.
- **banlist "pay rent"** → the system prompt forbids the literal banlist phrases and instructs rephrasing ("pay rent on time" → "stay current on their lease"); the repair step rephrases any hit.
- `response_format: json_schema` (strict) is mandatory (LM Studio rejects `json_object`) and guarantees the IngestPayload shape.

### n8n wrapper — `n8n/data/import/wf-blog-generate.json` (gitignored)
Thin orchestration shell (Manual Trigger → Topic → Execute Command → the engine). Phase 14 replaces the static Topic node with a queue pull + dedupe + schedule, and activates it. Not the tested path for Phase 11 (the script is).

## OWNER STEP to close BLOG-04/05 (~2-3 min)
With LM Studio running (Mistral + qwen3-embedding) and `N8N_WEBHOOK_SECRET` in `.env.local` matching the EF's secret:
```
bun scripts/generate-blog-draft.ts "tenant screening best practices for first-time landlords" tenant-screening
```
Expected: gate progress per attempt → `HTTP 201` → `status='in-review'`. A **401** means `N8N_WEBHOOK_SECRET` ≠ the EF's secret (align them). Then verify: a row in `public.blogs` with `status='in-review'` (the agent confirms via MCP). No Vercel deploy fires on a draft (publish-only).

## Notes
- Tracked (perfect-PR scope): `scripts/generate-blog-draft.ts` only. The n8n workflow is gitignored.
- The deterministic validate/repair is in the tested script (cleaner than n8n Code nodes); n8n orchestrates in Phase 14.
- Deferred: brand/E-E-A-T self-critique + human-approval surface (Phase 12); SEO ghost-slug reclaim (Phase 13); cadence/dedupe/monitoring (Phase 14).
