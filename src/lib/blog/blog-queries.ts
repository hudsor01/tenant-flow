import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { env } from "#env";

/**
 * Cookie-less anon client for PUBLIC blog reads. `status = 'published'` is the
 * anon RLS gate, so no session/cookies are needed — exactly the pattern
 * `/blog/[slug]/page.tsx` uses. Using the cookie-aware `#lib/supabase/server`
 * client here adds per-request cookie work to the (heavily prefetched/crawled)
 * dynamic blog list routes, which contributed to the F2 intermittent 503s.
 */
export function blogAnonClient() {
	return createSupabaseClient(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	);
}

export interface BlogCategoryRow {
	name: string;
	slug: string;
	post_count: number;
}

/**
 * `get_blog_categories` returns the same data for every blog request and is
 * called on the hub AND every category page (+ their metadata). Cache it across
 * requests (revalidate 300) so a prefetch/crawler burst shares one cached
 * result instead of each request spawning its own Supabase round-trip — a
 * primary driver of the F2 503 saturation. Returns [] on error (fail-soft: the
 * category nav just hides, the page still renders).
 */
export const getBlogCategories = unstable_cache(
	async (): Promise<BlogCategoryRow[]> => {
		const { data } = await blogAnonClient().rpc("get_blog_categories");
		return (data ?? []) as BlogCategoryRow[];
	},
	["blog-categories"],
	{ revalidate: 300 },
);
