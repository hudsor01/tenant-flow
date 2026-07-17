"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import MarkdownContent from "#app/blog/[slug]/markdown-content";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#components/ui/alert-dialog";
import { Button } from "#components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#components/ui/empty";
import {
	type BlogReviewItem,
	blogQueries,
} from "#hooks/api/query-keys/blog-keys";
import {
	useApproveBlogMutation,
	useRejectBlogMutation,
} from "#hooks/api/use-blog-admin-mutations";

interface BlogReviewClientProps {
	initialDrafts: BlogReviewItem[];
}

export function BlogReviewClient({ initialDrafts }: BlogReviewClientProps) {
	// Seed from the server fetch, then keep fresh client-side — approve/reject
	// invalidate blogQueries.all(), refetching this queue so the acted-on row
	// disappears (the RSC props list could not refresh on its own).
	const { data: drafts } = useQuery({
		...blogQueries.reviewQueue(),
		initialData: initialDrafts,
	});

	if (drafts.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyTitle>No drafts to review</EmptyTitle>
					<EmptyDescription>
						There are no in-review drafts right now. New drafts appear here once
						the generator submits them.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

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
	const [confirmReject, setConfirmReject] = useState(false);
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
						onClick={() => setConfirmReject(true)}
						disabled={isPending}
					>
						{reject.isPending ? "Rejecting…" : "Reject"}
					</Button>
				</div>
			</div>

			<AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reject this draft?</AlertDialogTitle>
						<AlertDialogDescription>
							Rejecting archives this post. It cannot be undone from this
							screen.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => reject.mutate({ id: draft.id })}
						>
							Reject
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

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
