// Shared CORS helper for Supabase Edge Functions
// Browser-facing functions use getCorsHeaders(req) for origin-restricted CORS.
// Webhook-only functions (stripe-webhooks, docuseal-webhook) should NOT import this.

/**
 * Returns CORS headers if the request origin matches the configured FRONTEND_URL.
 * If FRONTEND_URL is not set, logs a warning and returns empty headers (fail-open).
 * If origin does not match, returns empty headers (no CORS).
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const frontendUrl = Deno.env.get('FRONTEND_URL')

  if (!frontendUrl) {
    console.warn('FRONTEND_URL is not set -- CORS headers will not be returned')
    return {}
  }

  const origin = req.headers.get('origin')

  if (!origin || origin !== frontendUrl) {
    return {}
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  }
}

/**
 * Handles CORS preflight (OPTIONS) requests.
 * Returns a Response for OPTIONS requests, or null for other methods.
 */
export function handleCorsOptions(req: Request): Response | null {
  if (req.method !== 'OPTIONS') {
    return null
  }

  const headers = getCorsHeaders(req)

  if (Object.keys(headers).length > 0) {
    return new Response('ok', { headers })
  }

  return new Response(null, { status: 204 })
}
