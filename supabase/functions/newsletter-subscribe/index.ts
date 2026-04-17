// Newsletter Subscribe Edge Function
// NEWS-01: Creates contact in Resend via Contacts API with segment association.
// NEWS-02: Rate limited at 5 req/min per IP. Email validated server-side.
// Unauthenticated by design -- newsletter signup is public.
// Duplicates return success silently (locked decision).
//
// POST { email: string }
// -> 200 { success: true }
// -> 400 { error: 'Valid email is required' }
// -> 429 { error: 'Too many requests' }
// -> 500 { error: 'An error occurred' }

import { getCorsHeaders, getJsonHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse, captureWebhookWarning } from '../_shared/errors.ts'
import { rateLimit } from '../_shared/rate-limit.ts'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SEGMENT_NAME = 'Newsletter'
const RESEND_BASE = 'https://api.resend.com'

/** Isolate-cached segment ID (persists across requests in a warm Deno isolate) */
let cachedSegmentId: string | null = null

/**
 * Get or create the "Newsletter" segment in Resend.
 * Lists segments first; creates if not found.
 * Handles race condition by re-listing on creation failure.
 */
async function getOrCreateSegmentId(apiKey: string): Promise<string> {
  if (cachedSegmentId) return cachedSegmentId

  const authHeaders = { 'Authorization': `Bearer ${apiKey}` }

  // List segments to find existing "Newsletter" segment
  const listRes = await fetch(`${RESEND_BASE}/segments`, {
    headers: authHeaders,
  })

  if (listRes.ok) {
    const list = (await listRes.json()) as {
      data: Array<{ id: string; name: string }>
    }
    const existing = list.data.find((s) => s.name === SEGMENT_NAME)
    if (existing) {
      cachedSegmentId = existing.id
      return existing.id
    }
  }

  // Segment not found -- create it
  const createRes = await fetch(`${RESEND_BASE}/segments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ name: SEGMENT_NAME }),
  })

  if (createRes.ok) {
    const created = (await createRes.json()) as { id: string }
    cachedSegmentId = created.id
    return created.id
  }

  // Race condition: another request may have created the segment. Re-list.
  const retryRes = await fetch(`${RESEND_BASE}/segments`, {
    headers: authHeaders,
  })

  if (retryRes.ok) {
    const retryList = (await retryRes.json()) as {
      data: Array<{ id: string; name: string }>
    }
    const found = retryList.data.find((s) => s.name === SEGMENT_NAME)
    if (found) {
      cachedSegmentId = found.id
      return found.id
    }
  }

  throw new Error('Failed to create or find Newsletter segment')
}

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: getCorsHeaders(req),
    })
  }

  // NEWS-02: Rate limit 5 req/min per IP
  const rateLimited = await rateLimit(req, {
    maxRequests: 5,
    windowMs: 60_000,
    prefix: 'newsletter',
  })
  if (rateLimited) return rateLimited

  try {
    const env = validateEnv({
      required: ['RESEND_API_KEY'],
      optional: [
        'FRONTEND_URL',
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN',
      ],
    })

    const body = (await req.json()) as Record<string, unknown>
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    // NEWS-02: Email validation
    if (!email || !EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        {
          status: 400,
          headers: getJsonHeaders(req),
        },
      )
    }

    const apiKey = env['RESEND_API_KEY']
    const segmentId = await getOrCreateSegmentId(apiKey)

    // NEWS-01: Create contact via Resend Contacts API with segment association
    const contactRes = await fetch(`${RESEND_BASE}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email,
        segments: [segmentId],
      }),
    })

    // Locked decision: always return success regardless of Resend response
    if (!contactRes.ok) {
      const status = contactRes.status
      const errBody = await contactRes.text().catch(() => '')
      captureWebhookWarning('resend_contact_create_non_ok', {
        status,
        body: errBody,
        email_domain: email.split('@')[1],
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: getJsonHeaders(req),
    })
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'newsletter_subscribe' })
  }
})
