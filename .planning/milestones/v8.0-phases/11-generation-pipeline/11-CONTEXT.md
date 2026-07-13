# Phase 11: Generation Pipeline - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning
**Source:** Read the deployed `n8n-blog-ingest` EF (full contract) + confirmed all upstream deps live.

<domain>
## Phase Boundary
Build the n8n workflow that turns a topic into a RAG-grounded, contract-conforming blog draft landing in `public.blogs` as `status='in-review'`. End state: run the workflow on a real topic → a valid draft appears in review (nothing published). No quality/brand self-critique gate yet (Phase 12), no cadence/scheduling (Phase 14), no SEO-slug reclaim (Phase 13).
</domain>

<decisions>
## Implementation Decisions (LOCKED — grounded against the live EF)

### The ingest endpoint (DEPLOYED + ACTIVE, v8)
- URL: `https://bshjmbshupiibfiewpxb.supabase.co/functions/v1/n8n-blog-ingest` (POST).
- Auth: **HMAC-SHA256 over the EXACT raw request-body bytes**, hex-encoded, in header `x-n8n-signature`. Secret = the EF's `N8N_WEBHOOK_SECRET` (a write-only Supabase EF secret). The n8n workflow MUST sign with the SAME secret value. **Owner-coordination item:** confirm/align the n8n signing secret == the EF's `N8N_WEBHOOK_SECRET` (it may already equal the shared notify secret; verify with a test POST — a 401 means mismatch). `scripts/compute-hmac-vector.ts` is the existing HMAC reference.
- On success → `201 { id, slug, status:'in-review', canonical_url, blog_url }`. Other: `400 validation_failed {gate_failures:[{gate,message}]}`, `401 unauthorized` (HMAC mismatch), `409 slug_collision {slug}`, `405`, `500`.
- The EF INSERTs service-role (bypasses RLS); HMAC is the auth boundary. The DB trigger `validate_blog_post` (migration 20260510214935) is the source of truth; the EF's 9 gates mirror it (errcode 23514).

### Payload (IngestPayload) — exact shape
`{ title, slug, excerpt, content, category, meta_description, og_image_url?, canonical_url? }` (all strings). `og_image_url` → `featured_image` column. The LLM must emit EXACTLY these fields.

### The 9 gates (LOCKED — generation MUST satisfy all)
1. **word_count**: `content` 1200–3000 words.
2. **h2_count**: 4–10 `## ` headings in `content` (markdown).
3. **persona_phrase**: `content` must contain "landlord" (case-insensitive).
4. **slug_pattern**: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, length 3–120 (also UNIQUE in DB → handle 409).
5. **meta_length**: `meta_description` 50–160 chars.
6. **excerpt_length**: `excerpt` 80–200 chars.
7. **category**: one of `lease-law | tax-prep | tenant-screening | maintenance | software-vault` (NOT the document-vault categories — blog-specific enum).
8. **banlist** (case-insensitive, any hit fails): rent collection, online rent, autopay, auto-pay, tenant portal, automated rent, collect rent, rent processing, pay rent online, online payments, online rent payment, rent collection software, tenants can pay, pay rent through, automated workflow, rent tracking, mobile app access, record rent, paid rent, pay rent. (Landlord-only positioning — no rent-facilitation/tenant-portal language.)
9. **docuseal_mention**: "DocuSeal" appears ≤ 1 time in `content`.
   Plus: `canonical_url` (if present) must start with `/` or `https://`.

### Workflow graph (n8n, native runtime)
Trigger (manual/topic input for Phase 11 testing) → embed topic via LM Studio `/v1/embeddings` (qwen3-embedding) → call `match_blog_rag_chunks` (Supabase REST RPC, top-6) for grounding context → build the Mistral prompt (system: landlord-only brand voice + the 9 gates as hard constraints + the retrieved facts; user: topic + chosen category) → generate via LM Studio `/v1/chat/completions` (`mistral-small-3.2-24b-instruct-2506-mlx`), emitting structured JSON matching IngestPayload → **deterministic validate/repair Code node** (re-check all 9 gates locally; on failure, either a bounded repair prompt or regenerate, max ~2-3 attempts) → HMAC-sign the exact JSON body → POST to the ingest EF with `x-n8n-signature` → branch on response (201 done; 400 → repair/retry; 409 → regenerate slug).

### n8n config/credentials
- LM Studio: `http://localhost:1234/v1` (native n8n, localhost).
- Supabase RPC: n8n needs the Supabase URL + a key authorized for `match_blog_rag_chunks` (granted authenticated/service_role) — use `SUPABASE_SECRET_KEY` (new API key model; service-role-equiv) as an n8n credential, OR an authenticated session. Prefer the secret key (server-side).
- HMAC secret: `N8N_WEBHOOK_SECRET` (must match the EF's).

### Verification
Run the workflow on a real topic (e.g. "tenant screening best practices") → a draft row appears in `public.blogs` with `status='in-review'` + valid slug/category + content passing all 9 gates. Verify via MCP (`select id, slug, category, status, length(content) from blogs where status='in-review' order by created_at desc limit 1`). A 201 from the EF is the success signal. **Vercel deploy hook fires only on PUBLISH, not on draft** — creating an in-review draft must NOT trigger a deploy.
</decisions>

<constraints>
- The n8n workflow lives in the **gitignored `n8n/`** tree (local laptop bridge). For reproducibility, EXPORT the workflow JSON to `n8n/data/import/wf-blog-generate.json` (gitignored) + document it in `n8n/README.md`. Tracked repo changes this phase are likely minimal (docs only) — flag if any tracked code is introduced (perfect-PR scope).
- Native n8n + LM Studio must be running (localhost:1234 + localhost:5678). LLM config from 09-SUMMARY; RAG from 10-SUMMARY.
- The generation prompt must be engineered so Mistral reliably hits the gates (word count + H2 structure are the most failure-prone — instruct explicit section count + length; the validate/repair loop is the safety net).
- No fabricated TenantFlow specifics — ground claims in the retrieved RAG chunks; landlord-only positioning (banlist enforces this).
- Drafts only (`in-review`); human approval is the publish gate (Phase 12 surfaces it). Never auto-publish.
</constraints>

<canonical_refs>
- `supabase/functions/n8n-blog-ingest/index.ts` (the full contract — gates, HMAC, payload, responses).
- `scripts/compute-hmac-vector.ts` (HMAC reference).
- 09-SUMMARY.md (LLM base URL/model), 10-SUMMARY.md (RAG RPC + corpus).
- The 3 existing n8n notify workflows in `n8n/data/import/` (webhook→code→httpRequest pattern + the HMAC/Code-node style to mirror).
- `public/llms-full.txt` (brand facts/voice reference).
</canonical_refs>

<deferred>
- Quality/brand self-critique + reranker gate + human-approval UI surface → Phase 12.
- SEO ghost-slug reclaim (generate-at-exact-slug) → Phase 13.
- Scheduling, dedupe, monitoring → Phase 14.
</deferred>

<prototype_findings>
## Prototype findings (2026-06-08 — one live Mistral generation, gates checked)
Ran a real generation (topic "tenant screening best practices", category tenant-screening) against `mistral-small-3.2-24b-instruct-2506-mlx` with `response_format: json_schema` (strict). Result: **7/9 gates passed first try.** Confirms BLOG-04 is achievable AND precisely scopes the validate/repair loop:
- **`response_format` MUST be `json_schema`** (LM Studio rejects `json_object`). Strict json_schema with the IngestPayload shape (category as `enum`) guarantees valid structured output — use it. PASS: slug (clean kebab), excerpt (125), meta (129), h2_count (10), category, docuseal (1), landlord mention.
- **FAIL word_count: 871 (needed ≥1200).** Mistral undershoots long targets even when asked for 1500-2300. The validate/repair loop MUST detect short content → repair-prompt "expand each section, target ≥1600 words" or regenerate. Set the prompt target ABOVE the floor (e.g. ask for 1800-2400) and lean on repair.
- **FAIL banlist: "pay rent".** Natural landlord prose ("tenants who pay rent on time") trips the banlist's bare "pay rent" entry. Do NOT weaken the EF gate — instead the generation system prompt MUST explicitly forbid the literal banlist phrases and instruct rephrasing ("pay rent on time" → "stay current on their lease" / "make timely payments" / "meet their rent obligations"). The validate/repair node detects a banlist hit → repair-prompt to rephrase that phrase.
- Minor: the model emitted a leading `# H1` despite "no H1" (doesn't fail gates — h2 counts `## ` only — but strip/forbid it so the body doesn't double the page title). Phase 12 polish.
Net: the deterministic validate/repair node (plan 11-02) is REQUIRED (not optional) and its two main cases are word-count-short + banlist-rephrase. The HMAC POST + RPC auth still need owner-configured n8n credentials (the 11-01 [BLOCKING] checkpoint).
</prototype_findings>

---
*Phase: 11-generation-pipeline — n8n topic→retrieve(match_blog_rag_chunks)→Mistral structured draft→validate/repair(9 gates)→HMAC→POST n8n-blog-ingest→in-review draft. All upstream deps live.*
