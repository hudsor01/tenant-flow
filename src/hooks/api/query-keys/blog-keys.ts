// Blogs are public content with anon + authenticated RLS, so no getCachedUser() is needed.

import { queryOptions } from "@tanstack/react-query";
import { QUERY_CACHE_TIMES } from "#lib/constants/query-config";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { createClient } from "#lib/supabase/client";
import type { PaginatedResponse } from "#types/api-contracts";
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

export type BlogDetail = Pick<
	Blog,
	| "id"
	| "title"
	| "slug"
	| "excerpt"
	| "content"
	| "published_at"
	| "category"
	| "reading_time"
	| "featured_image"
	| "author_user_id"
	| "status"
	| "meta_description"
	| "tags"
	| "created_at"
	| "updated_at"
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

export type BlogCategory =
	Database["public"]["Functions"]["get_blog_categories"]["Returns"][number];

export interface BlogFilters {
	category?: string;
	tag?: string;
	limit?: number;
	offset?: number;
}

export interface RelatedPostsParams {
	category: string;
	excludeSlug: string;
	limit?: number;
}

export interface ComparisonParams {
	tag?: string;
	limit?: number;
}

const BLOG_LIST_COLUMNS =
	"id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags";

const BLOG_DETAIL_COLUMNS =
	"id, title, slug, excerpt, content, published_at, category, reading_time, featured_image, author_user_id, status, meta_description, tags, created_at, updated_at";

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

	lists: () => [...blogQueries.all(), "list"] as const,

	list: (filters?: BlogFilters) =>
		queryOptions({
			queryKey: [...blogQueries.lists(), filters ?? {}],
			queryFn: async (): Promise<PaginatedResponse<BlogListItem>> => {
				const supabase = createClient();
				const limit = filters?.limit ?? 9;
				const offset = filters?.offset ?? 0;

				let q = supabase
					.from("blogs")
					.select(BLOG_LIST_COLUMNS, { count: "exact" })
					.eq("status", "published")
					.order("published_at", { ascending: false });

				if (filters?.category) {
					q = q.eq("category", filters.category);
				}
				if (filters?.tag) {
					q = q.contains("tags", [filters.tag]);
				}

				q = q.range(offset, offset + limit - 1);

				const { data, error, count } = await q;

				if (error) handlePostgrestError(error, "blogs");

				const total = count ?? 0;
				const totalPages = Math.ceil(total / limit);

				return {
					data: (data ?? []) as BlogListItem[],
					total,
					pagination: {
						page: Math.floor(offset / limit) + 1,
						limit,
						total,
						totalPages,
					},
				};
			},
			...QUERY_CACHE_TIMES.BLOG,
		}),

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

	details: () => [...blogQueries.all(), "detail"] as const,

	// Returns null on PGRST116 (not found) — expected, not an error.
	detail: (slug: string) =>
		queryOptions({
			queryKey: [...blogQueries.details(), slug],
			queryFn: async (): Promise<BlogDetail | null> => {
				const supabase = createClient();

				const { data, error } = await supabase
					.from("blogs")
					.select(BLOG_DETAIL_COLUMNS)
					.eq("slug", slug)
					.eq("status", "published")
					.single();

				if (error) {
					if (error.code === "PGRST116") {
						return null;
					}
					handlePostgrestError(error, "blogs");
				}

				return data as BlogDetail;
			},
			...QUERY_CACHE_TIMES.BLOG,
			enabled: !!slug,
		}),

	categories: () =>
		queryOptions({
			queryKey: [...blogQueries.all(), "categories"],
			queryFn: async (): Promise<BlogCategory[]> => {
				const supabase = createClient();

				const { data, error } = await supabase.rpc("get_blog_categories");

				if (error) handlePostgrestError(error, "blog categories");

				return data ?? [];
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

	comparisons: (params: ComparisonParams) =>
		queryOptions({
			queryKey: [...blogQueries.all(), "comparisons", params],
			queryFn: async (): Promise<BlogListItem[]> => {
				const supabase = createClient();

				const { data, error } = await supabase
					.from("blogs")
					.select(BLOG_LIST_COLUMNS)
					.eq("status", "published")
					.contains("tags", [params.tag ?? "comparison"])
					.order("published_at", { ascending: false })
					.limit(params.limit ?? 6);

				if (error) handlePostgrestError(error, "blogs");

				return (data ?? []) as BlogListItem[];
			},
			...QUERY_CACHE_TIMES.BLOG,
		}),
};
