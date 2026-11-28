/**
 * Sentry, loaded on first use (2026-11-24 SEO audit S1; owner decision
 * 2026-11-25).
 *
 * Client code that marketing pages load reports through these functions
 * instead of importing `@sentry/nextjs`, which would put the ~100 KB SDK in
 * every page's initial JavaScript. In the browser the first call loads and
 * initialises the SDK (`./sentry-browser-init`) and every call runs once it
 * has; on the server the SDK is already initialised (`src/instrumentation.ts`)
 * and is just imported. Each call returns at once and never throws: a report
 * that can't load is dropped, as a failed send was before.
 */

type SentrySdk = typeof import("@sentry/nextjs");

let sdk: Promise<SentrySdk> | null = null;

/** The Sentry SDK, initialised. A failed load is retried on the next call. */
export function loadSentry(): Promise<SentrySdk> {
	sdk ??= (
		typeof window === "undefined"
			? Promise.resolve()
			: import("./sentry-browser-init").then(() => undefined)
	)
		.then(() => import("@sentry/nextjs"))
		.catch((error: unknown) => {
			sdk = null;
			throw error;
		});
	return sdk;
}

function whenLoaded(report: (sentry: SentrySdk) => void): void {
	loadSentry()
		.then(report)
		.catch(() => undefined);
}

export function captureException(
	...args: Parameters<SentrySdk["captureException"]>
): void {
	whenLoaded((sentry) => sentry.captureException(...args));
}

export function captureMessage(
	...args: Parameters<SentrySdk["captureMessage"]>
): void {
	whenLoaded((sentry) => sentry.captureMessage(...args));
}

export function addBreadcrumb(
	...args: Parameters<SentrySdk["addBreadcrumb"]>
): void {
	whenLoaded((sentry) => sentry.addBreadcrumb(...args));
}

/** The Sentry Logs levels the app logger writes. */
export type SentryLogLevel = "info" | "warn" | "error";

/**
 * A Sentry Log (Explore > Logs), searchable by its attributes and linked to
 * the trace it was written in. The SDK sends logs by default in v11; every
 * init passes them through `scrubLog` first.
 */
export function log(
	level: SentryLogLevel,
	message: string,
	attributes?: Record<string, unknown>,
): void {
	whenLoaded((sentry) => sentry.logger[level](message, attributes));
}
