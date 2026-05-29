"use server";

import * as Sentry from "@sentry/nextjs";
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "#env";
import type { Database } from "#types/supabase";

/**
 * Server Action: Sign out user
 *
 * This action:
 * 1. Creates a Supabase server client
 * 2. Signs out the user (clears session)
 * 3. Redirects to login page
 *
 * Usage:
 * - Can be called from Client Components via form action or transition
 * - Handles session cleanup server-side
 */
export async function signOut() {
	const cookieStore = await cookies();

	const supabase = createServerClient<Database>(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(
					cookiesToSet: {
						name: string;
						value: string;
						options: CookieOptions;
					}[],
				) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options),
						);
					} catch {
						// Ignore errors (server component context)
					}
				},
			},
		},
	);

	try {
		const { error } = await supabase.auth.signOut();
		if (error) {
			Sentry.captureException(error, {
				tags: { action: "signOut" },
			});
		}
	} catch (err) {
		// Log unexpected errors but still redirect so the user isn't stuck.
		// `redirect()` below throws NEXT_REDIRECT which is the intended
		// control flow — we don't catch THAT one because it's outside this try.
		Sentry.captureException(err, { tags: { action: "signOut" } });
	}
	redirect("/login");
}
