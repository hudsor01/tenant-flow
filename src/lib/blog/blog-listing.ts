/**
 * Server reads for the static blog listings and a post's related posts
 * (2026-11-24 SEO audit BL1, CT-1, PT-1, PT-2). Every read uses the
 * cookie-less anon client, so the pages that call these stay static.
 */

import type { BlogListItem } from "#hooks/api/query-keys/blog-keys";
import { DiagnosticError } from "#lib/diagnostic-error";
import { blogAnonClient, blogReadsUnavailable } from "./blog-queries";

/** Posts per listing page. */
const BLOG_PAGE_SIZE = 9;

const BLOG_LIST_COLUMNS =
	"id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags";

export interface BlogListing {
	posts: BlogListItem[];
	total: number;
	totalPages: number;
}

/**
 * One page of published posts, newest first, optionally in one category.
 * `null` when the page is past the last one, for the caller to 404: PostgREST
 * answers 416 (PGRST103) for an offset beyond the rows, but an empty 200 for
 * an offset equal to the row count, so the page is also checked against the
 * total. Page 1 of an empty listing is a page (its empty state). Any other error throws: a static page
 * that throws while revalidating keeps serving its last good render, where
 * an empty listing would replace it.
 */
export async function loadBlogListing({
	page,
	category,
}: {
	page: number;
	category?: string;
}): Promise<BlogListing | null> {
	if (blogReadsUnavailable()) return { posts: [], total: 0, totalPages: 1 };

	const offset = (page - 1) * BLOG_PAGE_SIZE;
	let query = blogAnonClient()
		.from("blogs")
		.select(BLOG_LIST_COLUMNS, { count: "exact" })
		.eq("status", "published");
	if (category) query = query.eq("category", category);
	const { data, error, count } = await query
		.order("published_at", { ascending: false })
		.range(offset, offset + BLOG_PAGE_SIZE - 1);

	if (error) {
		if (
			error.code === "PGRST103" ||
			/range not satisfiable/i.test(error.message)
		)
			return null;
		throw new DiagnosticError(`blog listing: ${error.message}`);
	}

	const total = count ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
	if (page > totalPages) return null;
	return { posts: (data ?? []) as BlogListItem[], total, totalPages };
}

/** The newest published comparison posts, for the hub's carousel. */
export async function loadComparisonPosts(): Promise<BlogListItem[]> {
	if (blogReadsUnavailable()) return [];
	const { data, error } = await blogAnonClient()
		.from("blogs")
		.select(BLOG_LIST_COLUMNS)
		.eq("status", "published")
		.contains("tags", ["comparison"])
		.order("published_at", { ascending: false })
		.limit(6);
	if (error) throw new DiagnosticError(`blog comparisons: ${error.message}`);
	return (data ?? []) as BlogListItem[];
}

/**
 * Up to `limit` posts to link from a post: its category's newest first, then
 * the newest from any category when the category has too few, so a post in a
 * one-post category still links onward (PT-2). Never the post itself. A read
 * error leaves the section out rather than failing the post.
 */
export async function loadRelatedPosts(
	slug: string,
	category: string | null,
	limit = 3,
): Promise<BlogListItem[]> {
	if (blogReadsUnavailable()) return [];
	const supabase = blogAnonClient();

	const related: BlogListItem[] = [];
	if (category) {
		const { data, error } = await supabase
			.from("blogs")
			.select(BLOG_LIST_COLUMNS)
			.eq("status", "published")
			.eq("category", category)
			.neq("slug", slug)
			.order("published_at", { ascending: false })
			.limit(limit);
		if (error) return [];
		related.push(...((data ?? []) as BlogListItem[]));
	}
	if (related.length >= limit) return related;

	const { data, error } = await supabase
		.from("blogs")
		.select(BLOG_LIST_COLUMNS)
		.eq("status", "published")
		.neq("slug", slug)
		.order("published_at", { ascending: false })
		.limit(limit + related.length);
	if (error) return related;
	const seen = new Set(related.map((post) => post.slug));
	for (const post of (data ?? []) as BlogListItem[]) {
		if (related.length >= limit) break;
		if (!seen.has(post.slug)) related.push(post);
	}
	return related;
}
