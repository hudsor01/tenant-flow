import type { Metadata } from "next";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#components/ui/empty";
import type { BlogReviewItem } from "#hooks/api/query-keys/blog-keys";
import { createClient } from "#lib/supabase/server";
import { BlogReviewClient } from "./blog-review-client";

export const metadata: Metadata = {
	title: "Blog Review | TenantFlow",
};

const BLOG_REVIEW_COLUMNS =
	"id, title, slug, content, excerpt, category, word_count, reading_time, created_at";

/**
 * Map a raw blogs row to the typed review item. NOT NULL fields throw if
 * missing; nullable columns are normalized to their declared null/number shape.
 */
function mapBlogReviewRow(raw: Record<string, unknown>): BlogReviewItem {
	const id = raw.id;
	const title = raw.title;
	const slug = raw.slug;
	const content = raw.content;
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

// (admin) layout already auth-walls is_admin — do NOT re-wall here.
export default async function AdminBlogReviewPage() {
	const supabase = await createClient();

	const { data } = await supabase
		.from("blogs")
		.select(BLOG_REVIEW_COLUMNS)
		.eq("status", "in-review")
		.order("created_at", { ascending: false });

	const drafts: BlogReviewItem[] = Array.isArray(data)
		? data.map((row) => mapBlogReviewRow(row as Record<string, unknown>))
		: [];

	return (
		<div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 space-y-8">
			<div>
				<h2 className="text-2xl font-semibold text-foreground">Blog Review</h2>
				<p className="text-sm text-muted-foreground">
					Drafts awaiting approval. Approve to publish, or reject to archive.
				</p>
			</div>
			{drafts.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyTitle>No drafts to review</EmptyTitle>
						<EmptyDescription>
							There are no in-review drafts right now. New drafts appear here
							once the generator submits them.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<BlogReviewClient drafts={drafts} />
			)}
		</div>
	);
}
