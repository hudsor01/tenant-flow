"use client";

import { useState } from "react";
import MarkdownContent from "#app/blog/[slug]/markdown-content";
import { Button } from "#components/ui/button";
import type { BlogReviewItem } from "#hooks/api/query-keys/blog-keys";
import {
	useApproveBlogMutation,
	useRejectBlogMutation,
} from "#hooks/api/use-blog-admin-mutations";

interface BlogReviewClientProps {
	drafts: BlogReviewItem[];
}

export function BlogReviewClient({ drafts }: BlogReviewClientProps) {
	return (
		<div className="space-y-6">
			{drafts.map((draft) => (
				<BlogReviewRow key={draft.id} draft={draft} />
			))}
		</div>
	);
}

function formatCreatedAt(value: string | null): string {
	if (!value) return "Unknown date";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Unknown date";
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function BlogReviewRow({ draft }: { draft: BlogReviewItem }) {
	const [showPreview, setShowPreview] = useState(false);
	const approve = useApproveBlogMutation();
	const reject = useRejectBlogMutation();

	const isPending = approve.isPending || reject.isPending;
	const wordCount = draft.word_count ?? 0;

	return (
		<article className="rounded-lg border border-border bg-background p-6 space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0 space-y-1">
					<h3 className="text-lg font-semibold text-foreground">
						{draft.title}
					</h3>
					<p className="text-sm text-muted-foreground">
						<span className="font-mono">{draft.slug}</span>
						{" · "}
						{wordCount} words
						{" · "}
						{formatCreatedAt(draft.created_at)}
						{draft.category ? ` · ${draft.category}` : ""}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Button
						type="button"
						onClick={() => approve.mutate({ id: draft.id, slug: draft.slug })}
						disabled={isPending}
					>
						{approve.isPending ? "Approving…" : "Approve"}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => reject.mutate({ id: draft.id })}
						disabled={isPending}
					>
						{reject.isPending ? "Rejecting…" : "Reject"}
					</Button>
				</div>
			</div>

			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => setShowPreview((prev) => !prev)}
				aria-expanded={showPreview}
			>
				{showPreview ? "Hide preview" : "Show preview"}
			</Button>

			{showPreview ? (
				<div className="prose prose-sm max-w-none border-t border-border pt-4 text-foreground">
					<MarkdownContent content={draft.content} />
				</div>
			) : null}
		</article>
	);
}
