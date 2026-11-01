/**
 * Sentry Edge Configuration
 *
 * Configures Sentry for Edge runtime (middleware, edge API routes).
 */
import * as Sentry from "@sentry/nextjs";

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

	// Don't send events in development, scrub sensitive data
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
});
