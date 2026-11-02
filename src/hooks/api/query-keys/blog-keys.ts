// Blogs are public content with anon + authenticated RLS, so no getCachedUser() is needed.

import { queryOptions } from "@tanstack/react-query";
import { QUERY_CACHE_TIMES } from "#lib/constants/query-config";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { createClient } from "#lib/supabase/client";
import type { Database } from "#types/supabase";

type Blog = Database["public"]["Tables"]["blogs"]["Row"];

export type BlogListItem = Pick<
	Blog,
	| "id"
	| "title"
	| "slug"
	| "excerpt"
	| "published_at"
	| "category"
	| "reading_time"
	| "featured_image"
	| "author_user_id"
	| "status"
	| "tags"
>;

export type BlogReviewItem = Pick<
	Blog,
	| "id"
	| "title"
	| "slug"
	| "content"
	| "excerpt"
	| "category"
	| "word_count"
	| "reading_time"
	| "created_at"
>;

export interface RelatedPostsParams {
	category: string;
	excludeSlug: string;
	limit?: number;
}

const BLOG_LIST_COLUMNS =
	"id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags";

export const BLOG_REVIEW_COLUMNS =
	"id, title, slug, content, excerpt, category, word_count, reading_time, created_at";

// Bounds the admin review-queue fetch. Shared by reviewQueue() and the
// /admin/blog server-side fetch so both paths render the same window and can
// never silently truncate at PostgREST's max-rows ceiling.
export const BLOG_REVIEW_QUEUE_LIMIT = 50;

/**
 * Typed mapper at the PostgREST boundary for review-queue rows (CLAUDE.md: no
 * raw `as` casts). NOT NULL fields throw; nullable columns normalize to null.
 * Shared by reviewQueue() and the /admin/blog server-side fetch.
 */
export function mapBlogReviewRow(raw: Record<string, unknown>): BlogReviewItem {
	const { id, title, slug, content } = raw;
	if (typeof id !== "string") throw new Error("blog row missing id");
	if (typeof title !== "string") throw new Error("blog row missing title");
	if (typeof slug !== "string") throw new Error("blog row missing slug");
	if (typeof content !== "string") throw new Error("blog row missing content");
	return {
		id,
		title,
		slug,
		content,
		excerpt: typeof raw.excerpt === "string" ? raw.excerpt : null,
		category: typeof raw.category === "string" ? raw.category : null,
		word_count: typeof raw.word_count === "number" ? raw.word_count : null,
		reading_time:
			typeof raw.reading_time === "number" ? raw.reading_time : null,
		created_at: typeof raw.created_at === "string" ? raw.created_at : null,
	};
}

export const blogQueries = {
	all: () => ["blogs"] as const,

	// Admin-only review queue: drafts awaiting human approve/reject.
	// Filters status='in-review' (NOT the public 'published' list). Reads via the
	// authenticated browser client; the `blogs_select_admin` RLS
	// policy (migration 20260609194835) lets is_admin() SELECT non-published rows.
	reviewQueue: () =>
		queryOptions({
			queryKey: [...blogQueries.all(), "review-queue"],
			queryFn: async (): Promise<BlogReviewItem[]> => {
				const supabase = createClient();

				const { data, error } = await supabase
					.from("blogs")
					.select(BLOG_REVIEW_COLUMNS)
					.eq("status", "in-review")
					.order("created_at", { ascending: false })
					.limit(BLOG_REVIEW_QUEUE_LIMIT);

				if (error) handlePostgrestError(error, "blog review queue");

				return ((data ?? []) as Record<string, unknown>[]).map(
					mapBlogReviewRow,
				);
			},
			...QUERY_CACHE_TIMES.BLOG,
		}),

	related: (params: RelatedPostsParams) =>
		queryOptions({
			queryKey: [...blogQueries.all(), "related", params],
			queryFn: async (): Promise<BlogListItem[]> => {
				const supabase = createClient();

				const { data, error } = await supabase
					.from("blogs")
					.select(BLOG_LIST_COLUMNS)
					.eq("category", params.category)
					.neq("slug", params.excludeSlug)
					.eq("status", "published")
					.order("published_at", { ascending: false })
					.limit(params.limit ?? 3);

				if (error) handlePostgrestError(error, "blogs");

				return (data ?? []) as BlogListItem[];
			},
			...QUERY_CACHE_TIMES.BLOG,
			enabled: !!params.category && !!params.excludeSlug,
		}),
};
