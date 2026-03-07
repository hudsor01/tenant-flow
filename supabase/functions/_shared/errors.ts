// Shared error response utility for Supabase Edge Functions.
// Logs full error details to Sentry + console.error, returns generic message to client.

import * as Sentry from '@sentry/deno'
import { getCorsHeaders } from './cors.ts'

/**
 * Create a JSON error response with generic message.
 * Logs full error details to Sentry (if SENTRY_DSN is set) and console.error.
 * Never exposes internal error details to the client.
 */
export function errorResponse(
  req: Request,
  status: number,
  error: unknown,
  context?: Record<string, unknown>,
): Response {
  const message = error instanceof Error ? error.message : String(error)

  // Structured console logging for observability
  console.error(JSON.stringify({
    level: 'error',
    status,
    message,
    url: req.url,
    method: req.method,
    ...context,
  }))

  // Sentry logging (handles missing DSN gracefully)
  Sentry.captureException(error, {
    extra: {
      url: req.url,
      method: req.method,
      status,
      ...context,
    },
  })

  return new Response(
    JSON.stringify({ error: 'An error occurred' }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(req),
      },
    },
  )
}
