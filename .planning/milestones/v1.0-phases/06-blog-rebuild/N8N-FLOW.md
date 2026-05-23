# N8N-FLOW: blog-ingest content factory

**Phase:** 6 / Plan 06-03 / BLOG-03
**Source-of-truth document for the n8n cloud workflow that feeds `n8n-blog-ingest`.**

This runbook documents the redesigned n8n content factory that generates the
locked 12 initial posts (06-CONTEXT.md § "Initial 12-Post Slate") and any future
post via manual webhook trigger. It pairs with:

- `supabase/functions/n8n-blog-ingest/index.ts` — the HMAC-gated webhook
  receiver (Plan 06-03 Task 1).
- `supabase/functions/tests/n8n-blog-ingest.test.ts` — the 11-case Deno suite
  (Plan 06-03 Task 2).
- `.planning/phases/06-blog-rebuild/n8n-blog-ingest.workflow.json` — importable
  n8n cloud workflow (Plan 06-03 Task 3).
- `scripts/compute-hmac-vector.ts` — reproducible HMAC test vector generator
  (Plan 06-03 Task 3).

---

## 1. Purpose

Full LLM content factory feeding `n8n-blog-ingest`. n8n cloud is the only
orchestrator; the Edge Function is the only DB writer. The user is the only
editor (`status='in-review'` → `status='published'` flip in Supabase Studio).

Tier: Option A (locked in 06-CONTEXT.md § "Tier"). Cost: ~22K words across
12 posts ≈ <$1 in Sonnet 4.5 API spend.

## 2. Trigger

**Webhook node (manual).** Each invocation passes a single brief from the
12-post slate. Triggered by curl from the developer machine:

```bash
curl -X POST 'https://<n8n-cloud-host>/webhook/blog-ingest-trigger' \
  -H 'Content-Type: application/json' \
  -d '{
        "topic": "What’s Required in a Lease Agreement",
        "slug": "whats-required-in-a-lease-agreement",
        "category": "lease-law",
        "funnel": "top"
      }'
```

No cron. No automatic retrigger. Each of the 12 posts is invoked exactly once
during the initial slate (staggered over 3-4 weeks per Specialist 2 cadence).

## 3. Pipeline (node sequence)

| # | Node | Type | Purpose |
|---|------|------|---------|
| 1 | Webhook (manual brief) | `n8n-nodes-base.webhook` | Receives `{topic, slug, category, funnel, canonical_url?}` |
| 2 | Claude: outline | `n8n-nodes-langchain.anthropic` (Sonnet 4.5) | Generates H1 + 4-7 H2 outline + FAQ + What-Comes-Next |
| 3 | Claude: draft | `n8n-nodes-langchain.anthropic` (Sonnet 4.5) | Generates 1,500-2,200-word markdown body + meta + excerpt |
| 4 | Preflight gates (JS) | `n8n-nodes-base.function` | Re-runs the 9 gates client-side; returns `{ok, payload, gate_failures}` |
| 5 | IF (ok?) | `n8n-nodes-base.if` | Branch on Preflight result — failure → Slack/log + halt |
| 6 | POST to n8n-blog-ingest | `n8n-nodes-base.httpRequest` | HMAC-signed POST to the Edge Function |
| 7 | IF (status === 201?) | `n8n-nodes-base.if` | Success → Slack notify; 4xx/5xx → Slack alert with gate_failures |

### Node 2 system prompt (Claude: outline)

```
You are a content strategist for TenantFlow blog (landlords with 1-15 rentals).
Generate an outline for a post about {{ $json.topic }}.

Required structure:
- H1 title (matches the topic verbatim or near-verbatim)
- Intro: 100-150 words mentioning "landlords" naturally
- 4-7 H2 sections with one-line summaries each (every H2 must mention landlords)
- FAQ section header (3-5 Q/A pairs about the topic)
- "What Comes Next" section header (TenantFlow product positioning, 1 mention max of "DocuSeal")

Constraints:
- Use ONLY these categories: lease-law, tax-prep, tenant-screening, maintenance, software-vault
- The persona is "landlords" (NEVER "property owners")
- The slug regex is ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ — must start with a letter
- If the brief includes canonical_url, pass it through unmodified
```

### Node 3 system prompt (Claude: draft)

```
Write the full blog post following the outline. Output JSON ONLY (no preamble):
{
  "title": "<H1>",
  "slug": "<from brief>",
  "excerpt": "<80-200 chars; landlord-aware>",
  "content": "<markdown; 1,500-2,200 words; H2s match outline>",
  "category": "<from brief, one of: lease-law, tax-prep, tenant-screening, maintenance, software-vault>",
  "meta_description": "<50-160 chars>",
  "canonical_url": "<optional; only if brief.canonical_url present; pass through verbatim>"
}

Hard constraints:
- 1,500-2,200 words total
- Every H2 section mentions "landlords"
- Max 1 mention of "DocuSeal" anywhere in content
- Do NOT use any of these banned phrases (case-insensitive, full list — adding
  any of these is an automatic rejection by both the n8n preflight node and the
  DB validate_blog_post trigger):
    rent collection, online rent, autopay, auto-pay, tenant portal,
    automated rent, collect rent, rent processing, pay rent online,
    online payments, online rent payment, rent collection software,
    tenants can pay, pay rent through, automated workflow, rent tracking,
    mobile app access, record rent, paid rent, pay rent
- Slug MUST start with a lowercase letter (regex ^[a-z][a-z0-9]*(-[a-z0-9]+)*$)
- If brief.canonical_url is present, output it verbatim (Blocker-#1 wiring for
  brief #10 → /compare/buildium)
```

### Node 4 preflight gates (JS Function node)

Re-runs the same 9 gates that the Edge Function and DB trigger enforce. Fails
fast in n8n cloud to avoid burning a network round-trip when Claude's output is
obviously broken. Defense-in-depth: DB trigger is the source of truth.

Gates (lockstep with `supabase/functions/n8n-blog-ingest/index.ts`):

| Gate | Rule |
|------|------|
| word_count | `1,200 ≤ count(words(content)) ≤ 3,000` |
| h2_count | `4 ≤ count(^## ) ≤ 10` |
| persona_phrase | `/landlord/i.test(content)` |
| slug_pattern | `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` AND `length BETWEEN 3 AND 120` |
| meta_length | `50 ≤ length(meta_description) ≤ 160` |
| excerpt_length | `80 ≤ length(excerpt) ≤ 200` |
| category | `category IN ('lease-law', 'tax-prep', 'tenant-screening', 'maintenance', 'software-vault')` |
| banlist | content does NOT contain any phrase from Phase 4 BANNED_PHRASES |
| docuseal_mention | `count(/DocuSeal/gi) ≤ 1` |
| canonical_url_format | when present: `startsWith('/') OR startsWith('https://')` (rejects `javascript:`, `data:`, `http://`) |

The Function node source is embedded in `n8n-blog-ingest.workflow.json`.

### Node 6 HTTP Request — POST to n8n-blog-ingest

```
URL:    {{ $env.SUPABASE_FUNCTIONS_URL }}/n8n-blog-ingest
Method: POST
Headers:
  Content-Type:   application/json
  apikey:         {{ $env.SUPABASE_PUBLISHABLE_KEY }}
  Authorization:  Bearer {{ $env.SUPABASE_PUBLISHABLE_KEY }}
  x-n8n-signature: {{ $crypto.createHmac('sha256', $env.N8N_WEBHOOK_SECRET).update(JSON.stringify($json.payload)).digest('hex') }}
Body:   {{ JSON.stringify($json.payload) }}
```

The `x-n8n-signature` header MUST be computed over the EXACT JSON.stringify
output of the payload object — same bytes that go into the Body field. Any
divergence (extra whitespace, key reordering) will cause the Edge Function's
verifyHmac to return false and the request to 401.

## 4. Secrets management

| Secret | Where stored | Where consumed |
|--------|--------------|----------------|
| `N8N_WEBHOOK_SECRET` | n8n cloud credentials (string); Supabase Vault | n8n HTTP node header signing; Edge Function `validateEnv` |
| `ANTHROPIC_API_KEY` | n8n cloud credentials | Claude outline + draft nodes |
| `SUPABASE_PUBLISHABLE_KEY` | n8n cloud env var | n8n HTTP node `apikey` + `Authorization` headers |
| `SUPABASE_FUNCTIONS_URL` | n8n cloud env var (`https://bshjmbshupiibfiewpxb.functions.supabase.co`) | n8n HTTP node URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Vault (NOT in n8n) | Edge Function only — creates the service-role client that bypasses RLS for the INSERT |
| `FRONTEND_URL` | Supabase Vault | Edge Function `blog_url` response composition + CORS |

**Pre-deploy checklist** (before importing the workflow JSON):

```bash
# 1. Set Vault secrets for the Edge Function:
supabase secrets set N8N_WEBHOOK_SECRET=<long-random-secret> \
  --project-ref bshjmbshupiibfiewpxb
supabase secrets set FRONTEND_URL=https://tenantflow.app \
  --project-ref bshjmbshupiibfiewpxb

# 2. Deploy the Edge Function (no CI auto-deploy per the bulk-zip memory):
supabase functions deploy n8n-blog-ingest \
  --project-ref bshjmbshupiibfiewpxb

# 3. In n8n cloud: add the same N8N_WEBHOOK_SECRET as a credential
#    (must match Vault byte-for-byte or HMAC verification will fail).
# 4. In n8n cloud: set env vars SUPABASE_FUNCTIONS_URL, SUPABASE_PUBLISHABLE_KEY,
#    ANTHROPIC_API_KEY.
```

## 5. HMAC Test Vector (LOCKED + REPRODUCIBLE)

This vector lets anyone verify the n8n signing logic and the Edge Function
verification logic agree byte-for-byte.

**Secret:** `tenantflow-phase-6-test`

**Body bytes (length=304; single-line JSON; do NOT reformat):**

```
{"title":"test","slug":"test-slug","excerpt":"test excerpt about landlords with 1-15 rentals to make this 80 chars or more please ok","content":"# H1\n\n## H2\nlandlord","category":"lease-law","meta_description":"test meta description about landlord lease law content with sufficient length here please"}
```

**Expected sha256 (hex):** `f09858270b504410c6de08a909adca3da619026beb880bbd841d4af3c8a767ab`

**Reproduce:**

```bash
deno run scripts/compute-hmac-vector.ts
```

Expected stdout (last line must match exactly):

```
Expected sha256 (hex): f09858270b504410c6de08a909adca3da619026beb880bbd841d4af3c8a767ab
```

Drift = n8n and Edge Function are out of sync. If the script's output diverges
from this document:

1. Run `git log -p scripts/compute-hmac-vector.ts` to find the byte-level change.
2. Run `git log -p .planning/phases/06-blog-rebuild/N8N-FLOW.md` to see if the
   embedded hex was updated without re-running the script.
3. If the body literal changed intentionally, re-run the script and update this
   document. If not, revert the unintentional change.

## 6. Running the flow for the 12 initial posts

The 12 briefs locked in 06-CONTEXT.md § "Initial 12-Post Slate" (reproduced
verbatim below). User invokes the webhook once per brief, then reviews each
`in-review` row in Supabase Studio and flips `status='published'` over the
3-4 week staggered cadence.

| # | Cluster | Title | Slug | Funnel | canonical_url |
|---|---------|-------|------|--------|---------------|
| 1 | Lease Law | What's Required in a Lease Agreement (Every State Covers This) | `whats-required-in-a-lease-agreement` | top | — |
| 2 | Lease Law | How to Send a Rent Increase Notice (Per-State Notice Period Cheat Sheet) | `rent-increase-notice-per-state` | middle | — |
| 3 | Lease Law | Late Fee Rules for Landlords by State (2026) | `late-fee-rules-by-state-2026` | middle | — |
| 4 | Tax Prep | What Landlords Can Deduct (2026 Tax Guide for 1–15 Rentals) | `landlord-tax-deductions-2026` | top | — |
| 5 | Tax Prep | Tax-Time Document Vault: Every Receipt Your CPA Will Ask For | `tax-document-vault-checklist` | bottom | — |
| 6 | Tenant Screening | Free Tenant Screening Checklist for DIY Landlords | `tenant-screening-checklist` | top | — |
| 7 | Tenant Screening | Tenant Screening Software Compared (2026) | `tenant-screening-software-compared-2026` | middle | — |
| 8 | Maintenance | Annual Maintenance Schedule for 1–15 Rentals | `annual-maintenance-schedule` | middle | — |
| 9 | Maintenance | How to Track Maintenance Requests Without a Ticketing System | `track-maintenance-no-ticketing-system` | middle | — |
| 10 | Software & Vault | TenantFlow vs Buildium: Honest Comparison for 1–15 Rental Landlords | `tenantflow-vs-buildium` | bottom | `/compare/buildium` |
| 11 | Software & Vault | How to Organize Lease Documents: One System, Search-Ready, Tax-Ready | `lease-document-organization-system-landlords` | bottom | — |
| 12 | Software & Vault | From Spreadsheet to Document Vault: Migration Guide for Small Landlords | `spreadsheet-to-document-vault-migration` | bottom | — |

For each brief, invoke:

```bash
curl -X POST 'https://<n8n-cloud-host>/webhook/blog-ingest-trigger' \
  -H 'Content-Type: application/json' \
  -d '{
        "topic": "<title verbatim>",
        "slug": "<slug from table>",
        "category": "<cluster slug>",
        "funnel": "<top|middle|bottom>"
        ${BRIEF_HAS_CANONICAL ? "," : ""}
        ${BRIEF_HAS_CANONICAL ? "\"canonical_url\": \"<canonical_url from table>\"" : ""}
      }'
```

For brief #10 specifically, the payload MUST include
`"canonical_url": "/compare/buildium"` — this threads through Node 4's preflight
to the Edge Function's INSERT and lands in `blogs.canonical_url`. Plan 06-02's
`generateMetadata` reads that column and emits
`<link rel="canonical" href="/compare/buildium">` in `<head>`, directing SEO
authority away from the post toward the compare page (Blocker-#1 chain).

Verify each row landed correctly via Supabase MCP:

```sql
-- Should return 12 rows with status='in-review' after the flow runs.
SELECT id, slug, status, category, canonical_url, created_at
FROM public.blogs
WHERE created_at > now() - interval '7 days'
  AND status = 'in-review'
ORDER BY created_at DESC;

-- Brief #10 sanity check:
SELECT slug, canonical_url FROM public.blogs
WHERE slug = 'tenantflow-vs-buildium';
-- Expect: canonical_url = '/compare/buildium'
```

## 7. Cost

| Item | Quantity | Unit cost | Subtotal |
|------|----------|-----------|----------|
| Sonnet 4.5 outline input | 12 × ~500 tokens | $3/Mtok | $0.018 |
| Sonnet 4.5 outline output | 12 × ~600 tokens | $15/Mtok | $0.108 |
| Sonnet 4.5 draft input | 12 × ~1,500 tokens | $3/Mtok | $0.054 |
| Sonnet 4.5 draft output | 12 × ~3,000 tokens | $15/Mtok | $0.540 |
| **Total for 12 posts** |  |  | **≈ $0.72** |

Well under the Specialist 2 < $1 estimate. No image generation cost — OG images
are dynamic via `@vercel/og` in Plan 06-02 (zero per-post API spend).

## 8. Editorial flip workflow

User is the sole editorial gatekeeper (locked 2026-05-10 — 06-CONTEXT.md
§ "Editorial Gatekeeper"). For each `in-review` row:

1. Open Supabase Studio → `public.blogs` table → filter `status = 'in-review'`.
2. Review the row's columns: `title`, `slug`, `excerpt`, `content`,
   `meta_description`, `category`, `canonical_url` (for brief #10).
3. Edit any column inline if needed. The DB trigger `validate_blog_post` will
   re-run the 9 gates on UPDATE when transitioning into a published-trail status
   — so a malformed edit will be rejected with `ERRCODE 23514`.
4. Flip `status` to `'published'` and set `published_at = now()`.
5. The Next.js `revalidate=300` window (5 min) will surface the post on `/blog`.
6. Sitemap and feed.xml auto-update on the next ISR cycle (Plan 06-02's
   `lastmod` reflects `updated_at` per PR #674).

## 9. Manual SQL fallback

If the Edge Function is unavailable (e.g., Supabase functions runtime down,
n8n cloud unable to reach Vercel), the user can also INSERT rows directly via
Studio SQL Editor. The DB validate_blog_post trigger runs identically against
direct INSERT — same 9 gates, same rejection on violation.

```sql
INSERT INTO public.blogs (
  title,
  slug,
  excerpt,
  content,
  category,
  meta_description,
  status,
  canonical_url   -- optional; omit if no canonical override
)
VALUES (
  'What''s Required in a Lease Agreement (Every State Covers This)',
  'whats-required-in-a-lease-agreement',
  -- excerpt 80-200 chars, must mention landlords (gate 6)
  '<excerpt body>',
  -- content 1,200-3,000 words markdown, 4-10 H2s, every section mentions landlords (gates 1-3)
  '<full markdown body>',
  'lease-law',
  -- meta 50-160 chars (gate 5)
  '<meta description>',
  'in-review',
  -- canonical_url: NULL by default; '/compare/buildium' for brief #10 only
  NULL
);
```

The CHECK constraint on `slug` enforces format (`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`).
The `validate_blog_post()` trigger enforces the other 8 gates. On rejection,
the INSERT returns Postgres ERRCODE `23514` with a human-readable message
describing which gate failed.

---

## Cross-references

- `supabase/migrations/20260510214935_phase_6_validation_triggers.sql` — DB
  validate_blog_post trigger (source of truth for the 9 gates)
- `supabase/migrations/20260510214914_phase_6_slug_format_check.sql` — slug CHECK
- `supabase/migrations/20260510214900_phase_6_extend_status_check_in_review.sql` — status enum
- `supabase/migrations/20260510214950_phase_6_blogs_canonical_url.sql` — canonical_url column
- `supabase/functions/n8n-blog-ingest/index.ts` — Edge Function (Plan 06-03 Task 1)
- `supabase/functions/tests/n8n-blog-ingest.test.ts` — Deno test suite (Task 2)
- `scripts/compute-hmac-vector.ts` — HMAC vector reproducer (Task 3)
- `.planning/phases/06-blog-rebuild/n8n-blog-ingest.workflow.json` — n8n cloud workflow JSON (Task 3)
- `.planning/phases/06-blog-rebuild/06-CONTEXT.md § "Initial 12-Post Slate"` — locked brief list
- `src/components/__tests__/marketing-copy-landlord-only.test.ts` — banlist source (Phase 4)
