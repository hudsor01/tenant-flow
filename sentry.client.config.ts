/**
 * Sentry Client Configuration
 *
 * Configures Sentry for browser-side error tracking and performance monitoring.
 * Includes: Web Vitals, Session Replay, Network Requests, Assets
 */
import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	environment: process.env.NODE_ENV || "development",

	// Performance Monitoring
	tracesSampleRate: isProduction ? 0.2 : 1.0,

	// Session Replay disabled. The replay integration registers a
	// MutationObserver that walks every DOM change, snapshots canvases,
	// and buffers events in IndexedDB. With maskAllText/Inputs the
	// per-mutation cost climbs further. Long browser sessions (~2h+) on
	// pages with continuous animation (gradients, marketing hero) trip
	// Chrome 148's PartitionAlloc `av_size` CHECK and crash the
	// renderer (live user crash logs, 2026-05-18). Replay was sampled
	// at 10% prod, so most users never noticed — but the ones who did
	// got a hard tab kill. We keep traces + INP + browser-API
	// instrumentation (no MutationObserver footprint) and error
	// capture; we lose nothing critical by dropping replay since
	// marketing pages aren't where actionable session debugging
	// happens, and authenticated pages had everything masked anyway.
	replaysSessionSampleRate: 0,
	replaysOnErrorSampleRate: 0,

	integrations: [
		// Browser Tracing for Web Vitals
		Sentry.browserTracingIntegration({
			enableInp: true, // Interaction to Next Paint
		}),
		// HTTP client instrumentation
		Sentry.browserApiErrorsIntegration(),
		// User Feedback widget - lets users report UX issues directly
		Sentry.feedbackIntegration({
			colorScheme: "system",
			isNameRequired: false,
			isEmailRequired: false,
			showBranding: false,
			buttonLabel: "Report a Bug",
			submitButtonLabel: "Send Report",
			formTitle: "Report a Problem",
			messagePlaceholder:
				"Describe what happened and what you expected to happen...",
			successMessageText: "Thank you for your report!",
		}),
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
