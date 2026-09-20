/**
 * Sentry Server Configuration
 *
 * Configures Sentry for server-side error tracking in Next.js.
 * Runs in Node.js runtime for API routes and SSR.
 */
import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	environment: process.env.NODE_ENV || "development",

	// Performance Monitoring
	tracesSampleRate: isProduction ? 0.2 : 1.0,

	// Filter noisy errors
	ignoreErrors: [
		"NEXT_NOT_FOUND",
		"NEXT_REDIRECT",
		// FRAMEWORK-EXPECTED, AND UNACTIONABLE BY CONSTRUCTION -- but read the
		// reasoning before extending this list, because filtering an error you
		// have not mitigated is how a real outage stays invisible.
		//
		// Next.js documents this as expected when a client posts a Server Action
		// from a build the server no longer runs. Every frame is framework
		// internals (node_modules/next chunks, __next_launcher.cjs) with no app
		// code to act on, and the client that sent it is already gone.
		//
		// Measured before filtering: 6 events, ZERO users affected, one burst,
		// POSTed to /index -- a path that is not a route in this app, so that
		// traffic was a scanner replaying a captured action id rather than a user
		// losing a submission.
		//
		// The REAL-user variant is mitigated separately and on purpose:
		// next.config.ts now sets deploymentId, which is the precondition for
		// Vercel Skew Protection to route a stale request to the build that
		// served it. If that setting is never enabled, genuine skew stops being
		// reported here while still being unhandled -- so enabling it is a
		// prerequisite for this filter being honest, not an optional follow-up.
		"Failed to find Server Action",
	],

	// Don't send events in development
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
});
