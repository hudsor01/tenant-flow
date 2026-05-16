import * as Sentry from "@sentry/nextjs";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "#env";
import { updateSession } from "#lib/supabase/middleware";

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

	const { user, supabaseResponse } = await updateSession(request);

	// Everything that isn't a known private route — public pages, unknown
	// URLs, blog slugs, comparison pages, etc. — passes through so Next.js
	// can render the matched page or its `not-found.tsx`. Auth-gating
	// arbitrary typo URLs was making `/featres` redirect to `/login` instead
	// of showing a 404, which is hostile UX.
	if (!isPrivateRoute(pathname)) {
		return supabaseResponse;
	}

	if (!user) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		url.searchParams.set("redirect", pathname);
		return redirectWithCookies(url, supabaseResponse);
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
	// Either path leaves `gateRow` as null. The downstream "gate unknown"
	// branch then redirects to /login?redirect=<original> — a fail-secure
	// re-auth that doesn't pin admins at /pricing.
	const subClient = createServerClient(
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
			.maybeSingle<UserGateRow>();
		if (result.error) {
			Sentry.captureException(result.error, {
				tags: { component: "proxy", check: "user_gate", path: "in_band" },
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
		return redirectWithCookies(url, supabaseResponse);
	}

	// /admin/* is admin-only. The (admin) route group's layout.tsx performs a
	// second server-side is_admin check against public.users.
	if (pathname.startsWith("/admin") && !gateRow.is_admin) {
		return redirectWithCookies(
			new URL("/dashboard", request.url),
			supabaseResponse,
		);
	}

	// Subscription gate: authenticated non-admin users need an active or trialing
	// Stripe subscription to reach the dashboard. Allowlist /pricing and Stripe
	// checkout paths so users can subscribe. Admins bypass.
	if (
		!gateRow.is_admin &&
		!pathname.startsWith("/admin") &&
		!pathname.startsWith("/pricing") &&
		!pathname.startsWith("/billing/checkout") &&
		!pathname.startsWith("/billing/plans") &&
		!pathname.startsWith("/auth/")
	) {
		const status = gateRow.subscription_status;
		if (!status || !ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
			return redirectWithCookies(
				new URL("/pricing", request.url),
				supabaseResponse,
			);
		}
	}

	return supabaseResponse;
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|monitoring|api/).*)",
	],
};
