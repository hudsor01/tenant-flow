import * as Sentry from "@sentry/nextjs";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "#env";
import { requiresMfaStepUp } from "#lib/supabase/mfa-assurance";
import { updateSession } from "#lib/supabase/middleware";
import type { Database } from "#types/supabase";

/** Stripe subscription statuses that grant dashboard access. */
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

/**
 * Private route prefixes that require an authenticated user. Anything NOT
 * in this list is treated as public — including unknown URLs, which then
 * fall through to Next.js so the built-in `not-found.tsx` renders a real
 * 404 page instead of a hostile "redirect to login" loop.
 *
 * Add a prefix here when you ship a new route group that gates on auth.
 * Owner-dashboard prefixes mirror the directories under `src/app/(owner)/`;
 * `/admin/*` is the (admin) route group; `/billing/*` is gated EXCEPT for
 * the checkout + plans subpaths (those are handled inside the subscription
 * gate below).
 */
const PRIVATE_ROUTE_PREFIXES = [
	"/admin",
	"/analytics",
	"/billing",
	"/dashboard",
	"/documents",
	"/financials",
	"/inspections",
	"/leases",
	"/maintenance",
	"/profile",
	"/properties",
	"/reports",
	"/settings",
	"/tenants",
	"/units",
];

/** Combined row read once per request and used by both gates. */
type UserGateRow = {
	is_admin: boolean | null;
	subscription_status: string | null;
};

function isPrivateRoute(pathname: string): boolean {
	return PRIVATE_ROUTE_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
	);
}

// Public-but-credential-sensitive routes: the login form and the auth
// token-handling pages (password update, email confirm). These are NOT
// auth-gated (a logged-out user must reach /login), but they DO get the
// hardened nonce CSP — an inline-script XSS on a credential-entry page is
// the highest-value target, and these pages are not SEO-ranking surfaces,
// so the dynamic-render cost of a per-request nonce is acceptable here
// (unlike marketing/blog, which stay static). See needsNonceCsp.
const AUTH_ROUTE_PREFIXES = ["/login", "/auth"];

function isAuthRoute(pathname: string): boolean {
	return AUTH_ROUTE_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
	);
}

/**
 * Routes that receive the per-request nonce CSP: authenticated app routes
 * PLUS the credential-entry auth routes. Kept separate from `isPrivateRoute`
 * (the auth gate) so /login can be nonce-hardened without being auth-gated
 * into a redirect loop.
 */
function needsNonceCsp(pathname: string): boolean {
	return isPrivateRoute(pathname) || isAuthRoute(pathname);
}

/**
 * CISEC-02 — Builds the per-request nonce CSP applied to private
 * (authenticated) routes AND credential-entry auth routes (/login,
 * /auth/*). Marketing/blog/static pages keep the static `vercel.json`
 * CSP so they stay statically rendered (a nonce forces dynamic
 * rendering); auth pages aren't SEO surfaces so the cost is acceptable.
 *
 * The load-bearing directive is `script-src 'self' 'nonce-<nonce>'
 * 'strict-dynamic'`. Next 16.2.6 parses this string off the forwarded
 * REQUEST `content-security-policy` header (getScriptNonceFromHeader,
 * app-render.js:167-168) to auto-nonce its hydration scripts — it never
 * reads `x-nonce`. `'strict-dynamic'` is mandatory in the App Router
 * (no `_document.tsx` to manually nonce hydration scripts) and it makes
 * the browser ignore host allowlists in `script-src`, so the
 * `*.supabase.co *.sentry.io *.stripe.com` allowlist stays in
 * `connect-src`, NOT `script-src`. `'unsafe-eval'` is gated to dev only.
 *
 * `style-src` keeps `'unsafe-inline'` (locked CISEC-02 decision —
 * script-src-scoped only; runtime-injected inline styles are a
 * documented MEDIUM-risk follow-up, not part of this plan). The
 * directive set otherwise mirrors `vercel.json` so private routes lose
 * nothing except `script-src 'unsafe-inline'`.
 */
/**
 * next-themes injects a deterministic inline no-flash <script> (it sets the
 * theme class on <html> before paint) that it does NOT nonce. On nonce-CSP
 * routes 'strict-dynamic' makes the browser ignore 'unsafe-inline', so that
 * script is blocked — a console CSP error plus a one-paint theme flash. The
 * script body is stable (derived from the fixed ThemeProvider props in
 * providers.tsx), so we allow exactly it by hash. 'strict-dynamic' still
 * honors hashes for top-level scripts, and this script loads nothing else, so
 * there's no trust-propagation risk. If the next-themes version or the
 * ThemeProvider config (providers.tsx) changes, the script body changes and
 * this hash must be updated. The drift signal is explicit: the exact CSP
 * console error on /login + /auth/* names the new required hash
 * ("a hash ('sha256-...') ... is required"), so recompute it from there.
 * (A render-based unit guard is unreliable — renderToStaticMarkup does not
 * reproduce Next's SSR-serialized next-themes script byte-for-byte.)
 */
const THEME_NO_FLASH_SCRIPT_HASH =
	"'sha256-AvM/QMxsEDhcwNLYb1jYS2mLUCd0snlFdk5VDvtk7II='";

function buildNonceCsp(nonce: string): string {
	const isDev = process.env.NODE_ENV === "development";
	const scriptSrc = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${THEME_NO_FLASH_SCRIPT_HASH}${
		isDev ? " 'unsafe-eval'" : ""
	}`;
	return [
		"default-src 'self'",
		scriptSrc,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob: https://*.supabase.co",
		"media-src 'self' data: blob: https://*.supabase.co",
		"connect-src 'self' *.supabase.co *.sentry.io *.stripe.com",
		"font-src 'self'",
		"object-src 'none'",
		"frame-src 'self' blob: https://*.supabase.co",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
	].join("; ");
}

function redirectWithCookies(
	url: URL,
	supabaseResponse: NextResponse,
): NextResponse {
	const redirectResponse = NextResponse.redirect(url);
	supabaseResponse.cookies.getAll().forEach((cookie) => {
		redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
	});
	return redirectResponse;
}

// Next.js 16: proxy.ts replaces deprecated middleware.ts
export async function proxy(request: NextRequest): Promise<NextResponse> {
	const { pathname } = request.nextUrl;
	const privateRoute = isPrivateRoute(pathname);

	// CISEC-02 — On private (authenticated) routes AND credential-entry auth
	// routes (/login, /auth/*), generate a per-request nonce and forward the
	// nonce CSP on the REQUEST `Content-Security-Policy` header so Next 16
	// auto-nonces its hydration scripts at render time (see buildNonceCsp).
	// `x-nonce` is a non-load-bearing convenience for app code that reads
	// `headers()`. Marketing/blog/static routes are NOT touched here — they
	// stay on the static `vercel.json` CSP so they remain statically
	// rendered (a nonce forces dynamic rendering; auth pages aren't SEO
	// surfaces so the cost is acceptable there, marketing pages are).
	let nonceCsp: string | undefined;
	let requestHeaders: Headers | undefined;
	if (needsNonceCsp(pathname)) {
		const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
		nonceCsp = buildNonceCsp(nonce);
		requestHeaders = new Headers(request.headers);
		// THE load-bearing header: Next parses the nonce off the forwarded
		// request's `content-security-policy` (app-render.js:167-168).
		requestHeaders.set("Content-Security-Policy", nonceCsp);
		// Convenience only — NOT how Next sources the hydration nonce.
		requestHeaders.set("x-nonce", nonce);
	}

	// F2: /blog and /blog/* are public and never read the session, so the
	// per-request Supabase session-refresh in updateSession is pure waste here.
	// Running it on every (heavily prefetched + crawler-hit) request is what
	// saturated Supabase and produced the intermittent 503s on the dynamic blog
	// list routes. Skip it; the pages use the cookie-less anon client, the
	// browser Supabase client refreshes the token client-side, and every private
	// route below still runs updateSession + the auth gates. /blog is never
	// private- or auth-gated, so nothing here depends on the refreshed session.
	if (pathname === "/blog" || pathname.startsWith("/blog/")) {
		return NextResponse.next();
	}

	const { user, assuranceLevel, supabaseResponse } = await updateSession(
		request,
		requestHeaders,
	);

	// Sets the per-request nonce CSP on a private-route response so the
	// browser enforces it. Applied to BOTH the pass-through and every
	// redirect return below. No-op on public routes (nonceCsp undefined).
	const withCsp = <T extends NextResponse>(response: T): T => {
		if (nonceCsp) {
			response.headers.set("Content-Security-Policy", nonceCsp);
		}
		return response;
	};

	// Everything that isn't a known private route — public pages, unknown
	// URLs, blog slugs, comparison pages, etc. — passes through so Next.js
	// can render the matched page or its `not-found.tsx`. Auth-gating
	// arbitrary typo URLs was making `/featres` redirect to `/login` instead
	// of showing a 404, which is hostile UX. `withCsp` applies the nonce CSP
	// for credential-entry auth routes (/login, /auth/*) and is a no-op for
	// true-public routes (marketing keeps the static `vercel.json` CSP).
	if (!privateRoute) {
		return withCsp(supabaseResponse);
	}

	if (!user) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		url.searchParams.set("redirect", pathname);
		return withCsp(redirectWithCookies(url, supabaseResponse));
	}

	// SEC-01: an aal1 session belonging to an MFA-enrolled user must complete
	// step-up (aal2) before any private route — server-enforced here so it
	// can't be bypassed by typing a URL. Keys on `nextLevel` (not the raw JWT
	// aal claim) so a no-MFA aal1 user is NOT locked out. /login is public
	// (not in PRIVATE_ROUTE_PREFIXES), so redirecting there is loop-free; the
	// login page auto-opens the OTP challenge on mount.
	if (requiresMfaStepUp(assuranceLevel)) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		url.searchParams.set("redirect", pathname);
		return withCsp(redirectWithCookies(url, supabaseResponse));
	}

	// Allowlist check BEFORE the DB query (cycle-2 P2-2 perf fix). These
	// paths intentionally bypass the subscription gate — querying for
	// state we'd then ignore is wasted work on the highest-latency-
	// sensitive surfaces (Stripe redirect-back round-trip lands on
	// /billing/checkout). Admin routes still need the gate, so check
	// /admin separately below.
	const isSubscriptionAllowlisted =
		pathname.startsWith("/pricing") ||
		pathname.startsWith("/billing/checkout") ||
		pathname.startsWith("/billing/plans") ||
		pathname.startsWith("/auth/");
	const isAdminRoute = pathname.startsWith("/admin");
	if (!isAdminRoute && isSubscriptionAllowlisted) {
		return withCsp(supabaseResponse);
	}

	// Single combined fetch for both gates. One DB round-trip instead of
	// two, AND consistent failure handling — pre-fix, an admin's
	// /admin/x request that errored out in the admin gate would fall
	// through to the subscription gate on the NEXT request and risk
	// redirecting the admin to /pricing despite their role. Co-locating
	// admin + subscription state in one row read eliminates that drift.
	//
	// Failure modes (battle-test Session 8 P0):
	//   - `await` throws (connection pool exhaustion under burst): catch
	//     captures to Sentry at `error` level (page-worthy outage).
	//   - in-band `result.error` (PostgREST 4xx/RLS/parse): captured at
	//     `warning` level (per-request, typically recoverable).
	//   - missing row (data: null, error: null): row genuinely absent —
	//     captured as `warning` with `path: "missing_row"` so a /login
	//     loop (re-auth doesn't restore an absent row) is observable
	//     (cycle-2 P2-1).
	// Any of these leave `gateRow` as null. The downstream "gate unknown"
	// branch then redirects to /login?redirect=<original> — a fail-secure
	// re-auth that doesn't pin admins at /pricing.
	const subClient = createServerClient<Database>(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll: () => request.cookies.getAll(),
				setAll: () => {},
			},
		},
	);
	let gateRow: UserGateRow | null = null;
	try {
		const result = await subClient
			.from("users")
			.select("is_admin, subscription_status")
			.eq("id", user.id)
			.maybeSingle();
		if (result.error) {
			Sentry.captureException(result.error, {
				tags: { component: "proxy", check: "user_gate", path: "in_band" },
				extra: { userId: user.id, pathname },
				level: "warning",
			});
		} else if (result.data === null) {
			// Authenticated user with no `public.users` row. This is a data-
			// integrity bug — the `handle_new_user` trigger should create
			// the row on signup. If we silently re-auth, the user can land
			// in a /login → /dashboard loop (re-auth won't restore an
			// absent row). Capture as `warning` so the bug is observable
			// even without a thrown exception (cycle-2 P2-1).
			Sentry.captureMessage("Authenticated user has no public.users row", {
				tags: {
					component: "proxy",
					check: "user_gate",
					path: "missing_row",
				},
				extra: { userId: user.id, pathname },
				level: "warning",
			});
		} else {
			gateRow = result.data;
		}
	} catch (caught) {
		Sentry.captureException(caught, {
			tags: { component: "proxy", check: "user_gate", path: "throw" },
			extra: { userId: user.id, pathname },
			level: "error",
		});
	}

	// Gate failure → fail-secure re-auth. Sends the user back through the
	// login flow; on success the next request re-queries the DB and the
	// real role/subscription state takes effect. Avoids the bug where an
	// admin during a DB blip would otherwise be redirected to /pricing.
	if (gateRow === null) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		url.searchParams.set("redirect", pathname);
		return withCsp(redirectWithCookies(url, supabaseResponse));
	}

	// /admin/* is admin-only. The (admin) route group's layout.tsx performs a
	// second server-side is_admin check against public.users.
	if (isAdminRoute && !gateRow.is_admin) {
		return withCsp(
			redirectWithCookies(new URL("/dashboard", request.url), supabaseResponse),
		);
	}

	// Subscription gate: authenticated non-admin users need an active or
	// trialing Stripe subscription to reach private routes. Admins bypass.
	// The /pricing, /billing/checkout, /billing/plans, /auth/ allowlist
	// was already short-circuited above; we only reach here for routes
	// that genuinely require an active subscription.
	if (!gateRow.is_admin && !isAdminRoute) {
		const status = gateRow.subscription_status;
		if (!status || !ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
			return withCsp(
				redirectWithCookies(new URL("/pricing", request.url), supabaseResponse),
			);
		}
	}

	return withCsp(supabaseResponse);
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|monitoring|api/).*)",
	],
};
