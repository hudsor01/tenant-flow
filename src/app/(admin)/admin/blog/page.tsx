import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import {
	BLOG_REVIEW_COLUMNS,
	BLOG_REVIEW_QUEUE_LIMIT,
	type BlogReviewItem,
	mapBlogReviewRow,
} from "#hooks/api/query-keys/blog-keys";
import { createClient } from "#lib/supabase/server";
import { BlogReviewClient } from "./blog-review-client";

export const metadata: Metadata = {
	title: "Blog Review | TenantFlow",
};

// (admin) layout already auth-walls is_admin — do NOT re-wall here. Admins can
// SELECT in-review rows via the blogs_select_admin RLS policy.
export default async function AdminBlogReviewPage() {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("blogs")
		.select(BLOG_REVIEW_COLUMNS)
		.eq("status", "in-review")
		.order("created_at", { ascending: false })
		.limit(BLOG_REVIEW_QUEUE_LIMIT);

	if (error) {
		Sentry.captureException(error, { tags: { page: "admin-blog-review" } });
	}

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
			<BlogReviewClient initialDrafts={drafts} />
		</div>
	);
}
