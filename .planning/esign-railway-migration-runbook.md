# Lease E-Signature — Railway Migration Runbook

**Goal:** restore lease e-signature end-to-end after the homelab outage, by re-hosting the two
self-hosted dependencies (DocuSeal + Stirling PDF) on Railway and wiring them up.

**Status of the code:** the app-side fixes are done in **PR #851** (`fix/esign-pending-signature-and-dead-tenant-path`). The integration was broken against *current* DocuSeal (the code targeted an old self-hosted build); #851 fixes the send endpoint, raw-base64 PDF, webhook HMAC scheme, the `data`-nested webhook payload, the cancel endpoint, an email guard, and `pending_signature` on send. **Once you complete the steps below and redeploy the functions, the flow works start-to-finish.**

---

## The flow (what must work)

```
Owner clicks "Send for Signature"
  → generate-pdf  → POST ${STIRLING_PDF_URL}/api/v1/misc/html-to-pdf   ← homelab dep #1
  → docuseal fn   → POST ${DOCUSEAL_URL}/api/submissions/pdf            ← homelab dep #2
  → DocuSeal emails owner + tenant signing links
  → each signs → DocuSeal POSTs docuseal-webhook (HMAC) → records signatures
  → both signed → lease_status='active' + signed-PDF URL persisted + owner notified
```

Both `STIRLING_PDF_URL` and `DOCUSEAL_URL` point at the dead homelab today. **Both** must be re-hosted.

---

## Step 1 — Deploy DocuSeal on Railway

1. Use the official one-click template: **https://railway.com/deploy/docuseal** (DocuSeal app + Postgres + Redis).
2. Give it a stable public domain (Railway provides `*.up.railway.app`, or attach a custom one).
3. **(Recommended)** Point DocuSeal file storage at your existing **Supabase Storage** (S3-compatible) so signed PDFs live on infra you already run and survive any future host outage. In DocuSeal env: set the S3 vars to your Supabase project's S3 endpoint/keys. (Otherwise it uses a Railway volume / local disk.)
4. Open the DocuSeal admin UI, create the first admin account.

## Step 2 — Deploy Stirling PDF on Railway

`generate-pdf` converts the lease HTML to a PDF via Stirling PDF *before* DocuSeal is ever called.

1. Deploy the `stirlingtools/stirling-pdf` (a.k.a. `frooodle/s-pdf`) Docker image as a Railway service.
2. Give it a stable public HTTPS domain.
3. No DB needed. Confirm `POST /api/v1/misc/html-to-pdf` responds (that's the exact endpoint the function calls).

## Step 3 — Configure DocuSeal (admin UI)

1. **API key:** Settings → API → copy the token (this becomes `DOCUSEAL_API_KEY`, sent as `X-Auth-Token`).
2. **Webhook:** Settings → Webhooks → add:
   - **URL:** `https://bshjmbshupiibfiewpxb.supabase.co/functions/v1/docuseal-webhook`
   - **Events:** enable **`form.completed`** and **`submission.completed`** (the only two handled).
   - **HMAC / Security:** enable signing; reveal + copy the **`whsec_…`** value (this becomes `DOCUSEAL_WEBHOOK_SECRET`).
   - No Supabase auth header is needed — the function is `verify_jwt:false` and gates on the HMAC.

> The webhook function accepts **both** the current `<timestamp>.<hex>` signature scheme **and** the legacy plain-hex scheme, so it works whether Railway gives you a current or pinned DocuSeal image.

## Step 4 — Set the Supabase Edge Function secrets

Project-level (shared by all functions). `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are auto-injected — do **not** set them.

| Secret | Value |
|---|---|
| `DOCUSEAL_URL` | Bare DocuSeal origin — **no trailing slash, no `/api`** (e.g. `https://docuseal-production.up.railway.app`). The code appends `/api/...`. |
| `DOCUSEAL_API_KEY` | DocuSeal API token (Step 3.1) |
| `DOCUSEAL_WEBHOOK_SECRET` | The `whsec_…` value (Step 3.2) |
| `STIRLING_PDF_URL` | Bare Stirling PDF origin — no trailing slash (the code appends `/api/v1/misc/html-to-pdf`) |

```bash
supabase secrets set \
  DOCUSEAL_URL=https://<your-docuseal-host> \
  DOCUSEAL_API_KEY=<token> \
  DOCUSEAL_WEBHOOK_SECRET=whsec_<...> \
  STIRLING_PDF_URL=https://<your-stirling-host> \
  --project-ref bshjmbshupiibfiewpxb
```

## Step 5 — Redeploy the edge functions

Required so they pick up the new env **and** the PR #851 code (after #851 merges):

```bash
supabase functions deploy docuseal docuseal-webhook generate-pdf --project-ref bshjmbshupiibfiewpxb
# or, per the deploy-401 memory: bun scripts/deploy-edge-functions.ts
```

## Step 6 — Smoke test (the start-to-finish check)

1. Create a **draft** lease for a unit, with a tenant that has a **real email**.
2. Click **Send for Signature** (fill the landlord notice address).
   - ✅ no 502; the lease moves to **Pending Signature**; owner + tenant receive DocuSeal emails.
3. Open the **tenant** email → sign. Then the **owner** email (or in-app "Sign as Owner") → sign.
   - ✅ after the second signature, the webhook flips the lease to **Active** and the owner gets a "Lease fully signed" notification.
4. ✅ the signed PDF is downloadable from the active lease.
5. If the webhook seems to not fire: check the `docuseal-webhook` logs for `401 Unauthorized` (→ `DOCUSEAL_WEBHOOK_SECRET` mismatch) or "Lease not found" (→ submission/metadata lookup).

---

## Known follow-ups (not blockers; tracked for later)

- **M4 — signed-doc URL freshness:** DocuSeal blob URLs can expire. The webhook persists `docuseal_document_url` for immediate access, but the canonical reference is `docuseal_submission_id`. A later improvement: fetch a fresh URL via `GET /api/submissions/{id}` when the owner opens an old lease (a new `docuseal` action + a tweak to the download button).
- **FE polish:** show the signature-status card on `active` leases (who-signed summary); add Realtime/poll on the lease detail while `pending_signature` so webhook-driven activation surfaces without a manual refresh.
- **Long-term option (no vendor):** token-based in-app tenant signing (emailed magic link → public Edge Function → the existing `sign_lease_and_check_activation` RPC) removes the DocuSeal + Stirling + Railway dependencies entirely. See the migration research for the design.

---

_Generated as part of the DocuSeal migration investigation. The code half is PR #851; the deploy half is this runbook (owner-run — Railway + Supabase secrets + function deploy need your credentials)._
