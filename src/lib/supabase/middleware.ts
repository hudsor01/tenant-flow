import * as Sentry from "@sentry/nextjs";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Refreshes the Supabase auth session in middleware.
 *
 * Creates a Supabase server client that syncs cookies between the
 * incoming request and the outgoing response. Calls getUser() for
 * server-validated auth (never getSession()).
 *
 * Returns the authenticated user (or null) and the response with
 * updated cookies. **Never throws** — auth failures (malformed JWT,
 * Supabase auth-server outage, network errors) are coerced to `user:
 * null` so the proxy can fall through to the public-route / login-
 * redirect path instead of returning 503. A thrown auth error in
 * middleware causes Vercel to surface a 5xx for what's actually a
 * routine "no valid session" outcome — battle-test Session 7 saw ~25
 * such 503s on RSC prefetches because the agent's hand-crafted
 * workaround cookie occasionally tripped Supabase's JWT validator.
 */
export async function updateSession(
	request: NextRequest,
): Promise<{ user: User | null; supabaseResponse: NextResponse }> {
	let supabaseResponse = NextResponse.next({ request });

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					// Update request cookies for downstream server components
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value),
					);
					// Re-create response with updated request to keep cookies in sync
					// (Pitfall 1: must pass { request } to avoid cookie desync)
					supabaseResponse = NextResponse.next({ request });
					// Set cookies on the response for the browser
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	// IMPORTANT: Use getUser(), never getSession(), for server-validated auth.
	// getUser() validates the JWT with the Supabase auth server.
	let user: User | null = null;
	try {
		const result = await supabase.auth.getUser();
		user = result.data.user;
	} catch (error) {
		// Throw-paths: malformed JWT (cookie decode fail), Supabase auth-server
		// network error, rate limit. None of these should 503 the page — they
		// all mean "no validated user", and the caller will redirect to /login
		// or pass through as public. Capture to Sentry so real outages are
		// still visible, but don't let one bad request poison the response.
		//
		// Level discrimination: 4xx AuthApiError responses (malformed/expired
		// JWT, rate-limit) are routine and stay at `warning` so they don't
		// page on-call. Anything else — network errors with no `status`, or
		// 5xx auth-server outages — escalates to `error` so a real Supabase
		// outage gets the right alert weight.
		const status =
			error && typeof error === "object" && "status" in error
				? (error as { status?: unknown }).status
				: undefined;
		const isClientAuthError =
			typeof status === "number" && status >= 400 && status < 500;
		Sentry.captureException(error, {
			tags: {
				component: "supabase/middleware",
				check: "auth_get_user",
			},
			extra: {
				pathname: request.nextUrl.pathname,
				requestId: request.headers.get("x-vercel-id") ?? undefined,
				userAgent: request.headers.get("user-agent") ?? undefined,
			},
			level: isClientAuthError ? "warning" : "error",
		});
	}

	return { user, supabaseResponse };
}
