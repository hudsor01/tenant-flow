// Shared Resend email helper for Supabase Edge Functions
// Sends emails via Resend REST API using fetch().
// NEVER throws -- all errors returned as { success: false, error: string }.
// Logs errors with [RESEND_ERROR] prefix for Supabase log capture / monitoring.

export interface SendEmailParams {
  to: string[]
  subject: string
  html: string
  tags?: Array<{ name: string; value: string }>
}

export type SendEmailResult =
  | { success: true; id: string }
  | { success: false; error: string }

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_ADDRESS = 'TenantFlow <noreply@tenantflow.com>'

/**
 * Sends an email via the Resend REST API.
 * Returns a result object -- never throws.
 * Resend automatically checks its suppression list on every send;
 * suppressed recipients get a suppressed status, not an error.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const apiKey = Deno.env.get('RESEND_API_KEY')

    if (!apiKey) {
      console.error('[RESEND_ERROR] RESEND_API_KEY not configured')
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    const body: Record<string, unknown> = {
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }

    if (params.tags && params.tags.length > 0) {
      body.tags = params.tags
    }

    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => res.statusText)
      console.error(`[RESEND_ERROR] API returned ${res.status}: ${errBody}`)
      return { success: false, error: `Resend API error ${res.status}: ${errBody}` }
    }

    const data = await res.json() as { id: string }
    return { success: true, id: data.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[RESEND_ERROR] Unexpected error: ${message}`)
    return { success: false, error: message }
  }
}
