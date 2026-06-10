"use server";

import * as Sentry from "@sentry/nextjs";
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { env } from "#env";
import type { Database } from "#types/supabase";

/**
 * Admin-gated blog publish/reject server actions (BLOG-07b).
 *
 * Defense-in-depth: the (admin) layout already auth-walls is_admin, but these
 * actions re-check is_admin (layer 3) and write through the authenticated
 * cookie-aware client so the blogs_update_admin RLS policy (layer 4) gates the
 * UPDATE at the DB. The service role is NEVER imported here — every write
 * crosses RLS as the signed-in admin.
 *
 * Nothing publishes without an explicit admin Approve click: status='published'
 * is set in exactly one place (publishBlogPost).
 */

export type BlogActionResult = { ok: true } | { ok: false; error: string };

/** Create the cookie-aware authenticated server client (same pattern as auth.ts). */
async function createActionClient() {
	const cookieStore = await cookies();

	return createServerClient<Database>(
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
						// Called from a Server Component context — safe to ignore;
						// the proxy refreshes sessions.
					}
				},
			},
		},
	);
}

type AuthedAdminClient = Awaited<ReturnType<typeof createActionClient>>;

/**
 * Re-check is_admin (layer 3). Returns the authenticated client on success so
 * callers reuse the same session for the RLS-gated write.
 */
async function requireAdminClient(): Promise<
	{ ok: true; supabase: AuthedAdminClient } | { ok: false; error: string }
> {
	const supabase = await createActionClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { ok: false, error: "Not authorized" };
	}

	const { data: row, error } = await supabase
		.from("users")
		.select("is_admin")
		.eq("id", user.id)
		.maybeSingle();

	if (error) {
		Sentry.captureException(error, { tags: { action: "blog-publish:admin" } });
		return { ok: false, error: "Authorization check failed" };
	}

	if (!row?.is_admin) {
		return { ok: false, error: "Not authorized" };
	}

	return { ok: true, supabase };
}

/**
 * Approve a draft: flip status to 'published', stamp published_at, then
 * revalidate the public blog list. Only runs after the is_admin re-check and a
 * successful RLS-gated update.
 *
 * Note: /blog/[slug] is statically generated with dynamicParams=false (its
 * generateStaticParams enumerates only published slugs at build time), so the
 * approved post's OWN page builds on the next deploy — approve stages it; the
 * deploy (or the blog-publish webhook) surfaces it. The /blog list revalidation
 * is effective immediately; the per-slug revalidate becomes effective once that
 * page exists post-deploy.
 */
export async function publishBlogPost(
	id: string,
	slug: string,
): Promise<BlogActionResult> {
	const gate = await requireAdminClient();
	if (!gate.ok) {
		return gate;
	}

	const { error } = await gate.supabase
		.from("blogs")
		.update({ status: "published", published_at: new Date().toISOString() })
		.eq("id", id);

	if (error) {
		Sentry.captureException(error, {
			tags: { action: "blog-publish:publish" },
		});
		return { ok: false, error: "Failed to publish post" };
	}

	revalidatePath("/blog");
	revalidatePath(`/blog/${slug}`);

	return { ok: true };
}

/**
 * Reject a draft: flip status to 'archived' so it is not public. No revalidation
 * is needed — an in-review draft was never on the public ISR pages.
 */
export async function rejectBlogPost(id: string): Promise<BlogActionResult> {
	const gate = await requireAdminClient();
	if (!gate.ok) {
		return gate;
	}

	const { error } = await gate.supabase
		.from("blogs")
		.update({ status: "archived" })
		.eq("id", id);

	if (error) {
		Sentry.captureException(error, { tags: { action: "blog-publish:reject" } });
		return { ok: false, error: "Failed to reject post" };
	}

	return { ok: true };
}
