/**
 * Derives the @supabase/ssr auth-cookie name from the project URL.
 *
 * @supabase/ssr uses cookie names of the form `sb-<project-ref>-auth-token`,
 * where `<project-ref>` is the subdomain prefix of the Supabase URL. The
 * cookie name only changes if the project itself is swapped — so deriving
 * it from `NEXT_PUBLIC_SUPABASE_URL` keeps the name in lockstep automatically.
 *
 * Useful for synchronous DOM probes that need to look up the cookie
 * without invoking Supabase's full client (e.g., the marketing navbar's
 * fast-path for the signed-out CTA render).
 */
import { env } from "#env";

function deriveProjectRef(url: string): string {
	try {
		const hostname = new URL(url).hostname;
		const ref = hostname.split(".")[0];
		if (!ref) throw new Error("empty hostname");
		return ref;
	} catch {
		throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${url}`);
	}
}

export const SUPABASE_AUTH_COOKIE_NAME =
	`sb-${deriveProjectRef(env.NEXT_PUBLIC_SUPABASE_URL)}-auth-token` as const;
