/**
 * Blog API Hooks
 *
 * Thin hook wrappers consuming blogQueries factory from blog-keys.ts.
 * keepPreviousData applied here (not in factory) for paginated hooks.
 * Blogs are public content -- no auth dependency.
 */

import { useQuery } from "@tanstack/react-query";
import { blogQueries } from "./query-keys/blog-keys";

export type {
	BlogCategory,
	BlogDetail,
	BlogFilters,
	BlogListItem,
} from "./query-keys/blog-keys";

// `useBlogBySlug` was removed when the blog post page was refactored to
// receive `post` as a server-rendered prop (closes a soft-404 risk where
// the body shipped only after hydration). The `blogQueries.detail()`
// factory it wrapped is still useful for prefetching from the hub list.

/**
 * Fetch blog categories from RPC
 * Returns array of { name, slug, post_count }
 */
export function useBlogCategories() {
	return useQuery({
		...blogQueries.categories(),
	});
}

/**
 * Fetch related posts (same category, excludes current post)
 * Returns up to `limit` BlogListItem posts
 */
export function useRelatedPosts(
	category: string,
	excludeSlug: string,
	limit: number = 3,
) {
	return useQuery({
		...blogQueries.related({ category, excludeSlug, limit }),
	});
}
