/**
 * Blog API Hooks
 *
 * Thin hook wrapper consuming the blogQueries factory from blog-keys.ts.
 * Blogs are public content -- no auth dependency.
 */

import { useQuery } from "@tanstack/react-query";
import { blogQueries } from "./query-keys/blog-keys";

// `useBlogBySlug` was removed when the blog post page was refactored to
// receive `post` as a server-rendered prop (closes a soft-404 risk where
// the body shipped only after hydration).

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
