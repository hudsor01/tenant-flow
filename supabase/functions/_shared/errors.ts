// Shared error response utility for Supabase Edge Functions.
// Logs full error details to Sentry + console.error, returns generic message to client.
// Includes CORS headers via getCorsHeaders() — returns empty headers for non-browser
// requests (webhooks), so the dependency is harmless for all callers.

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

/**
 * Log a webhook handler error to Sentry + structured console.error.
 * For use inside webhook handler modules where there is no req object.
 * Does NOT create a Response -- callers handle control flow themselves.
 */
export function captureWebhookError(
  error: unknown,
  extra: Record<string, unknown>,
): void {
  const message = error instanceof Error ? error.message : String(error)

  console.error(JSON.stringify({
    level: 'error',
    message,
    ...extra,
  }))

  Sentry.captureException(error, {
    extra,
  })
}

/**
 * Log a non-error warning event to Sentry + structured console.warn.
 * Use for: missing optional data, fallback paths, recoverable degradation.
 * Lower-volume than info — fires a discrete Sentry event (counts toward quota).
 */
export function captureWebhookWarning(
  message: string,
  extra?: Record<string, unknown>,
): void {
  console.warn(JSON.stringify({ level: 'warning', message, ...(extra ?? {}) }))
  Sentry.captureMessage(message, { level: 'warning', extra })
}

/**
 * Add a Sentry breadcrumb for operational/info events.
 * Breadcrumbs are FREE — they attach to the next captureException event,
 * giving you a trail of context without firing standalone Sentry events.
 * Use for: flow tracking ("Created PaymentIntent X"), idempotency notes,
 * email send confirmations. Replaces most ad-hoc console.log calls.
 */
export function logEvent(
  message: string,
  data?: Record<string, unknown>,
): void {
  console.log(JSON.stringify({ level: 'info', message, ...(data ?? {}) }))
  Sentry.addBreadcrumb({
    category: 'edge-function',
    level: 'info',
    message,
    data,
  })
}
