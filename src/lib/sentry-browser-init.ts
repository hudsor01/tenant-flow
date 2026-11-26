/**
 * Sentry's browser SDK, initialised. Importing this module runs `Sentry.init`;
 * it exports nothing.
 *
 * It is loaded on demand (2026-11-24 SEO audit S1; owner decision 2026-11-25):
 * `src/instrumentation-client.ts` imports it at once on account pages and
 * when the browser goes idle on marketing pages, and `./sentry-lazy` imports
 * it before the first capture, report or breadcrumb, whichever comes first.
 * A marketing page therefore ships no Sentry SDK in its initial JavaScript;
 * what it gives up is errors thrown before idle that nothing captures, and the
 * page-load trace.
 *
 * Configures Sentry for browser-side error tracking and performance monitoring.
 * Includes: Web Vitals (INP), Network Requests. User Feedback is registered
 * by the owner shell (src/components/shell/feedback-integration.ts).
 * Session Replay is intentionally disabled — see comment below.
 */
import * as Sentry from "@sentry/nextjs";
import {
	scrubBreadcrumb,
	scrubSpan,
	scrubUrlsIntegration,
} from "./sentry-scrub";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	environment: process.env.NODE_ENV || "development",

	// Performance Monitoring
	tracesSampleRate: isProduction ? 0.2 : 1.0,

	// SDK v11 replaced `sendDefaultPii` with `dataCollection` and flipped the
	// default: left unset, it collects cookies, every HTTP request/response
	// body, user IPs and database query text. Request bodies here carry tenant,
	// lease and payment details, so this pins the v10 `sendDefaultPii: false`
	// baseline (the migration guide's equivalent) instead of inheriting v11's.
	dataCollection: {
		userInfo: false,
		cookies: false,
		httpHeaders: {
			request: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
			response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
		},
		httpBodies: [],
		urlQueryParams: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
		genAI: { inputs: false, outputs: false },
		databaseQueryData: false,
		queues: false,
		graphQL: { document: false, variables: false },
	},

	// v11 defaults this to true, which attaches a synthetic stack to every
	// captureMessage call: new issue groups on the first v11 release (read by
	// the post-deploy Sentry gate as a regression) and errored sessions. Kept
	// at the v10 default.
	attachStacktrace: false,

	// Session Replay disabled. The replay integration registers a
	// MutationObserver that walks every DOM change, snapshots canvases,
	// and buffers events in IndexedDB. With maskAllText/Inputs the
	// per-mutation cost climbs further. Long browser sessions (~2h+) on
	// pages with continuous animation (gradients, marketing hero) trip
	// Chrome 148's PartitionAlloc `va_size` CHECK and crash the
	// renderer (live user crash logs, 2026-05-18). Replay was sampled
	// at 10% prod, so most users never noticed — but the ones who did
	// got a hard tab kill. We keep traces + INP + browser-API
	// instrumentation (no MutationObserver footprint) and error
	// capture; we lose nothing critical by dropping replay since
	// marketing pages aren't where actionable session debugging
	// happens, and authenticated pages had everything masked anyway.
	replaysSessionSampleRate: 0,
	replaysOnErrorSampleRate: 0,

	// URLs carry secrets (sign/apply tokens, auth codes, search terms): every
	// URL Sentry sees is scrubbed (src/lib/sentry-scrub.ts). The integration
	// covers every event type; these two cover breadcrumbs and streamed spans.
	beforeBreadcrumb: scrubBreadcrumb,
	beforeSendSpan: scrubSpan,

	integrations: [
		scrubUrlsIntegration(),
		// Browser Tracing for Web Vitals
		Sentry.browserTracingIntegration({
			enableInp: true, // Interaction to Next Paint
		}),
		// HTTP client instrumentation
		Sentry.browserApiErrorsIntegration(),
		// No feedbackIntegration here: its UI code would ship to every page,
		// marketing ones included, for a button only the owner shell shows.
		// FeedbackWidget registers it on demand (feedback-integration.ts).
	],

	// Filter noisy errors
	ignoreErrors: [
		// Browser extensions
		/chrome-extension/,
		/moz-extension/,
		// Network errors that are usually transient
		"Failed to fetch",
		"Load failed",
		"NetworkError",
		// User cancellation
		"AbortError",
		// Third-party scripts
		/Script error/i,
	],

	// Don't send events in development unless explicitly enabled
	// Also scrub sensitive data from all events
	beforeSend(event) {
		if (process.env.NODE_ENV === "development" && !process.env.SENTRY_DEBUG) {
			return null;
		}

		// Scrub sensitive headers from request
		if (event.request?.headers) {
			const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
			for (const header of sensitiveHeaders) {
				if (event.request.headers[header]) {
					event.request.headers[header] = "[REDACTED]";
				}
			}
		}

		// Scrub sensitive data patterns from breadcrumbs
		if (event.breadcrumbs) {
			event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
				if (breadcrumb.data) {
					const scrubbed = { ...breadcrumb.data };
					for (const [key, value] of Object.entries(scrubbed)) {
						if (typeof value === "string") {
							// Card number pattern: 4 groups of 4 digits
							if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(value)) {
								scrubbed[key] = "[CARD_REDACTED]";
							}
						}
					}
					return { ...breadcrumb, data: scrubbed };
				}
				return breadcrumb;
			});
		}

		return event;
	},

	// Trace propagation for distributed tracing
	tracePropagationTargets: [
		"localhost",
		/^https:\/\/tenantflow\.app/,
		/^https:\/\/api\.tenantflow\.app/,
	],
});
