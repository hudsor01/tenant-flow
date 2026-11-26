/**
 * Next's client instrumentation hook: Next loads `src/instrumentation-client.ts`
 * before the app becomes interactive, under Turbopack and webpack alike. It
 * used to live at the repo root as `sentry.client.config.ts`, a name only the
 * Sentry webpack plugin injects; Turbopack never loaded it, so the browser SDK
 * was never initialized and every client-side `captureException` went nowhere.
 *
 * It starts Sentry (`src/lib/sentry-browser-init.ts`, which holds the whole
 * config) without importing the SDK itself (2026-11-24 SEO audit S1; owner
 * decision 2026-11-25):
 * - on account pages (the owner app, admin, login, `/auth/*`) at once, so
 *   they keep every early error and their page-load trace;
 * - on marketing pages once the browser is idle, so the SDK is not in their
 *   initial JavaScript. A capture before then (`src/lib/sentry-lazy.ts`)
 *   loads it sooner; an error nothing captures before then is not reported.
 */
import {
	matchesAnyRoutePrefix,
	PRIVATE_ROUTE_PREFIXES,
} from "./lib/routes/private-routes";
import { loadSentry } from "./lib/sentry-lazy";

/** The pages people work in, where Sentry starts at once. */
const ACCOUNT_PREFIXES = [...PRIVATE_ROUTE_PREFIXES, "/login", "/auth"];

function startSentry(): void {
	loadSentry().catch(() => undefined);
}

if (matchesAnyRoutePrefix(window.location.pathname, ACCOUNT_PREFIXES)) {
	startSentry();
} else if ("requestIdleCallback" in window) {
	window.requestIdleCallback(startSentry, { timeout: 5000 });
} else {
	setTimeout(startSentry, 2000);
}

// Starts a navigation span for each App Router transition, so client-side
// navigations are traced, not only the initial page load. The SDK loads
// first if it hasn't yet.
export function onRouterTransitionStart(
	href: string,
	navigationType: string,
): void {
	loadSentry()
		.then((sentry) => sentry.captureRouterTransitionStart(href, navigationType))
		.catch(() => undefined);
}
