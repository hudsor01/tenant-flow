// Resend Inbound Webhook Edge Function (Svix-signed)
// Processes Resend deliverability events (delivered, bounced, opened, complained,
// delivery_delayed) and upserts them into public.email_deliverability with
// idempotency via UNIQUE (message_id, event_type).
// Server-to-server only — Svix HMAC-SHA256 signature verification required.
// On signature failure / malformed body: 400. On DB error: 500 (Resend retries).
//
// Algorithm reference: docs.svix.com/receiving/verifying-payloads/how-manual
// Template reference: supabase/functions/docuseal-webhook/index.ts (canonical
// HMAC webhook skeleton — Resend differs in header names, HMAC input shape,
// secret encoding, and uses defensive tag parsing per 44-RESEARCH.md Pitfall 1).

import { errorResponse } from '../_shared/errors.ts'
import { validateEnv } from '../_shared/env.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'

// Must match the CHECK constraint on public.email_deliverability.event_type.
// Events outside this list are intentionally ignored (200 response) so Resend does not retry them.
const ALLOWED_EVENT_TYPES = [
  'email.delivered',
  'email.bounced',
  'email.opened',
  'email.complained',
  'email.delivery_delayed',
] as const

type ResendEventType = typeof ALLOWED_EVENT_TYPES[number]

interface ResendWebhookPayload {
  type: string
  created_at: string
  data: {
    email_id: string
    to?: string[]
    tags?: unknown
  }
}

function isResendEventType(x: string): x is ResendEventType {
  return (ALLOWED_EVENT_TYPES as readonly string[]).includes(x)
}

function isResendWebhookPayload(x: unknown): x is ResendWebhookPayload {
  if (typeof x !== 'object' || x === null) return false
  const obj = x as Record<string, unknown>
  if (typeof obj['type'] !== 'string') return false
  if (typeof obj['created_at'] !== 'string') return false
  const data = obj['data']
  if (typeof data !== 'object' || data === null) return false
  const dataObj = data as Record<string, unknown>
  if (typeof dataObj['email_id'] !== 'string') return false
  // `to` is optional but must be an array of strings when present
  if (dataObj['to'] !== undefined) {
    if (!Array.isArray(dataObj['to'])) return false
    for (const addr of dataObj['to']) {
      if (typeof addr !== 'string') return false
    }
  }
  // `tags` can be any unknown shape — extractTemplateTag handles both array
  // and object layouts defensively. No check here beyond the type.
  return true
}

// Resend tags may arrive as either an array of `{name, value}` pairs or a flat object.
// Prefer `category` (groups auth events) over `type` (legacy); returns null if neither present.
function extractTemplateTag(tags: unknown): string | null {
  if (!tags) return null

  if (Array.isArray(tags)) {
    const categoryTag = tags.find(
      (t): t is { name: string; value: string } =>
        typeof t === 'object' &&
        t !== null &&
        (t as { name?: unknown }).name === 'category' &&
        typeof (t as { value?: unknown }).value === 'string',
    )
    if (categoryTag) return categoryTag.value

    const typeTag = tags.find(
      (t): t is { name: string; value: string } =>
        typeof t === 'object' &&
        t !== null &&
        (t as { name?: unknown }).name === 'type' &&
        typeof (t as { value?: unknown }).value === 'string',
    )
    return typeTag ? typeTag.value : null
  }

  if (typeof tags === 'object') {
    const obj = tags as Record<string, unknown>
    const cat = obj['category']
    if (typeof cat === 'string') return cat
    const typ = obj['type']
    if (typeof typ === 'string') return typ
  }

  return null
}

// Svix HMAC verification per docs.svix.com/receiving/verifying-payloads/how-manual.
// Enforces 5-minute timestamp freshness, constant-time compare, and accepts rotated signatures.
async function verifySvixSignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  svixSignatureHeader: string,
  rawBody: string,
): Promise<boolean> {
  // 5-minute freshness window in either direction to defeat replay.
  const nowSec = Math.floor(Date.now() / 1000)
  const tsSec = parseInt(svixTimestamp, 10)
  if (!Number.isFinite(tsSec) || Math.abs(nowSec - tsSec) > 300) {
    return false
  }

  const secretBase64 = secret.replace(/^whsec_/, '')
  let secretBytes: Uint8Array
  try {
    secretBytes = Uint8Array.from(atob(secretBase64), (c) => c.charCodeAt(0))
  } catch {
    return false
  }

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedContent),
  )
  const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(sig)))

  // Header can carry multiple `v1,<base64>` entries during Svix key rotation.
  const signatures = svixSignatureHeader.split(' ').map((part) => {
    const [, value] = part.split(',', 2)
    return value ?? ''
  })

  // Constant-time compare; XOR fallback keeps behavior identical across runtimes.
  return signatures.some((candidate) => {
    if (candidate.length !== expectedBase64.length) return false
    const a = new TextEncoder().encode(candidate)
    const b = new TextEncoder().encode(expectedBase64)
    try {
      const subtleWithTSE = crypto.subtle as unknown as {
        timingSafeEqual?: (x: Uint8Array, y: Uint8Array) => boolean
      }
      if (typeof subtleWithTSE.timingSafeEqual === 'function') {
        return subtleWithTSE.timingSafeEqual(a, b)
      }
    } catch {
      // fall through to XOR
    }
    // Fallback constant-time XOR compare
    let d = 0
    for (let i = 0; i < a.length; i++) {
      const av = a[i] ?? 0
      const bv = b[i] ?? 0
      d |= av ^ bv
    }
    return d === 0
  })
}

Deno.serve(async (req: Request) => {
  try {
    // validateEnv runs INSIDE the handler (not at module level) so missing
    // env vars surface as a 500 on the first request rather than breaking
    // cold-start (CLAUDE.md Edge Functions convention).
    const env = validateEnv({
      required: ['RESEND_WEBHOOK_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    })

    // Svix signature headers
    const svixId = req.headers.get('svix-id')
    const svixTimestamp = req.headers.get('svix-timestamp')
    const svixSignature = req.headers.get('svix-signature')
    if (!svixId || !svixTimestamp || !svixSignature) {
      return errorResponse(req, 400, new Error('Missing Svix headers'), {
        action: 'resend_webhook',
        stage: 'header_check',
      })
    }

    // Read raw body ONCE before any parsing or verification.
    // The body stream is consumed on first read — re-reading throws (Pitfall 8).
    let rawBody: string
    try {
      rawBody = await req.text()
    } catch (err) {
      return errorResponse(req, 400, err, {
        action: 'resend_webhook',
        stage: 'body_read',
      })
    }

    // Verify Svix signature BEFORE any DB access (T-44-01 spoofing mitigation).
    const verified = await verifySvixSignature(
      env['RESEND_WEBHOOK_SECRET'] ?? '',
      svixId,
      svixTimestamp,
      svixSignature,
      rawBody,
    )
    if (!verified) {
      return errorResponse(req, 400, new Error('Invalid Svix signature'), {
        action: 'resend_webhook',
        stage: 'signature_verify',
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawBody)
    } catch (err) {
      return errorResponse(req, 400, err, {
        action: 'resend_webhook',
        stage: 'json_parse',
      })
    }

    if (!isResendWebhookPayload(parsed)) {
      return errorResponse(req, 400, new Error('Malformed Resend payload'), {
        action: 'resend_webhook',
        stage: 'payload_shape',
      })
    }

    // Event types outside our tracked set (e.g. email.sent, email.clicked) are
    // intentionally ignored — return 200 so Resend does not retry. Events we
    // track are the five listed in the CHECK constraint.
    if (!isResendEventType(parsed.type)) {
      return new Response(
        JSON.stringify({ ok: true, ignored: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Extract recipient email (normalize for aggregation).
    const recipientRaw = parsed.data.to?.[0]
    if (!recipientRaw || typeof recipientRaw !== 'string') {
      return errorResponse(req, 400, new Error('Missing recipient email'), {
        action: 'resend_webhook',
        stage: 'recipient_extract',
      })
    }
    const recipientEmail = recipientRaw.toLowerCase()

    // Extract template tag via defensive parser (Pitfall 1 + D7).
    const templateTag = extractTemplateTag(parsed.data.tags)

    // Service-role client for DB write (bypasses RLS for the Edge Function
    // which holds only service_role, not an authenticated JWT).
    const supabase = createAdminClient(
      env['SUPABASE_URL'] ?? '',
      env['SUPABASE_SERVICE_ROLE_KEY'] ?? '',
    )

    // Idempotent upsert — Svix delivers at-least-once, so duplicates WILL
    // arrive. UNIQUE (message_id, event_type) + onConflict makes re-delivery
    // a no-op (Pitfall 2 mitigation).
    const { error: upsertError } = await supabase
      .from('email_deliverability')
      .upsert(
        {
          message_id: parsed.data.email_id,
          event_type: parsed.type,
          recipient_email: recipientEmail,
          template_tag: templateTag,
          event_at: parsed.created_at,
          raw_payload: parsed.data,
        },
        { onConflict: 'message_id,event_type' },
      )

    if (upsertError) {
      return errorResponse(req, 500, upsertError, {
        action: 'resend_webhook',
        stage: 'db_upsert',
        event_type: parsed.type,
      })
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    // 500 so Resend retries the webhook delivery.
    return errorResponse(req, 500, err, { action: 'resend_webhook' })
  }
})
