import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "#env";
import type { Database } from "#types/supabase";

export const VALID_OTP_TYPES = [
	"signup",
	"email",
	"recovery",
	"magiclink",
	"invite",
	"email_change",
] as const;
type ValidOtpType = (typeof VALID_OTP_TYPES)[number];

export function isValidOtpType(type: string | null): type is ValidOtpType {
	return (
		type !== null &&
		type !== "" &&
		(VALID_OTP_TYPES as readonly string[]).includes(type)
	);
}

/**
 * AUTH-01/02/09: exhaustive per-type success redirect. The `switch` returns on
 * every `ValidOtpType`, so `noImplicitReturns` makes a future omission a
 * compile error — the old fall-through-to-error defect can't recur.
 *   - signup/email → dashboard (email confirmed, session set)
 *   - recovery/invite → update-password (set/reset the password)
 *   - magiclink → the already-sanitized `next` (producer steers the landing)
 *   - email_change → settings with a confirmation flag (AUTH-01)
 */
export function successRedirectPath(type: ValidOtpType, next: string): string {
	switch (type) {
		case "signup":
		case "email":
			return "/dashboard";
		case "recovery":
			return "/auth/update-password";
		case "invite":
			return "/auth/update-password";
		case "magiclink":
			return next;
		case "email_change":
			return "/settings?email_change=confirmed";
	}
}

/**
 * AUTH-02/09: exhaustive per-type failure redirect. Each destination is a real,
 * user-facing page whose error is surfaced (no self-redirect to /auth/callback,
 * which has no page).
 *   - signup/email → confirm-email with an invalid-token banner
 *   - recovery → update-password error hash (its ExpiredLinkContent renders it)
 *   - magiclink/invite → login with the link_expired code (AUTH-04 surfaces it)
 *   - email_change → settings with a failed flag (AUTH-01)
 */
export function failureRedirectPath(type: ValidOtpType): string {
	switch (type) {
		case "signup":
		case "email":
			return "/auth/confirm-email?error=invalid_token";
		case "recovery":
			return "/auth/update-password#error=access_denied&error_description=This+link+has+expired+or+is+invalid";
		case "magiclink":
		case "invite":
			return "/login?error=link_expired";
		case "email_change":
			return "/settings?email_change=failed";
	}
}

// AUTH-13: x-forwarded-host is intentionally ignored to prevent host header injection attacks.
function buildRedirectUrl(
	_request: NextRequest,
	origin: string,
	path: string,
): string {
	const siteUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
	return `${siteUrl}${path}`;
}

export async function GET(request: NextRequest) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");
	const tokenHash = searchParams.get("token_hash");
	const type = searchParams.get("type");
	const nextParam = searchParams.get("next");
	// Must start with "/" but not "//" (protocol-relative URL) — open-redirect guard.
	const next =
		nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
			? nextParam
			: "/dashboard";

	const cookieStore = await cookies();

	const supabase = createServerClient<Database>(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options),
						);
					} catch {
						// setAll called from Server Component — middleware refreshes the session.
					}
				},
			},
		},
	);

	if (tokenHash && type) {
		// AUTH-15: validate OTP type against allowlist before calling Supabase.
		// AUTH-09: an invalid type redirects straight to a user-facing page with
		// an accurate code — never back to /auth/callback (which has no page).
		if (!isValidOtpType(type)) {
			return NextResponse.redirect(
				buildRedirectUrl(request, origin, "/login?error=invalid_link"),
			);
		}

		const { data, error } = await supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type,
		});

		// AUTH-01: "Secure email change" (Supabase dashboard default) double-
		// confirms — the FIRST click returns `session: null` with no error. Gating
		// email_change success on a session would misroute that correct click to
		// the failure path, so treat `!error` alone as success for email_change.
		const succeeded =
			type === "email_change" ? !error : !error && Boolean(data?.session);

		const path = succeeded
			? successRedirectPath(type, next)
			: failureRedirectPath(type);

		return NextResponse.redirect(buildRedirectUrl(request, origin, path));
	}

	if (code) {
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error && data?.session) {
			// AUTH-08: OAuth provider (Google) is trusted for email verification.
			return NextResponse.redirect(buildRedirectUrl(request, origin, next));
		}
	}

	return NextResponse.redirect(
		buildRedirectUrl(request, origin, "/login?error=oauth_failed"),
	);
}
