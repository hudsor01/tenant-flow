"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { Skeleton } from "#components/ui/skeleton";
import {
	type DocumentCategoryRow,
	documentCategoryMutations,
	documentCategoryQueries,
} from "#hooks/api/query-keys/document-category-keys";
import { documentQueries } from "#hooks/api/query-keys/document-keys";
import { useDocumentCategories } from "#hooks/api/use-document-categories";
import { CategoryCreateDialog } from "./category-create-dialog";
import { CategoryDeleteDialog } from "./category-delete-dialog";
import { CategoryRenameDialog } from "./category-rename-dialog";
import { CategoryRow } from "./category-row";

export function CategoriesSettings() {
	const { categories, isLoading, isError } = useDocumentCategories();
	const queryClient = useQueryClient();

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const [createOpen, setCreateOpen] = useState(false);
	const [renaming, setRenaming] = useState<DocumentCategoryRow | null>(null);
	const [deleting, setDeleting] = useState<DocumentCategoryRow | null>(null);

	const invalidateAll = () => {
		void queryClient.invalidateQueries({
			queryKey: documentCategoryQueries.all(),
		});
		// Reassign rewrites documents.document_type, so EVERY cached
		// document-related query is now stale — the per-entity list
		// AND the global vault search (whose key prefix is `['documents',
		// 'search', ...]`). `documentQueries.all()` returns
		// `['documents']`, which TanStack Query expands into a
		// prefix-match against every key starting with that tuple,
		// covering both surfaces in one call.
		void queryClient.invalidateQueries({ queryKey: documentQueries.all() });
	};

	const createMutation = useMutation({
		...documentCategoryMutations.create(),
		onSuccess: () => {
			invalidateAll();
			setCreateOpen(false);
			toast.success("Category created.");
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : "Create failed.");
		},
	});

	const updateMutation = useMutation({
		...documentCategoryMutations.update(),
		onSuccess: () => {
			invalidateAll();
			setRenaming(null);
			toast.success("Category renamed.");
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : "Rename failed.");
		},
	});

	const deleteMutation = useMutation({
		...documentCategoryMutations.deleteWithReassign(),
		onSuccess: () => {
			invalidateAll();
			setDeleting(null);
			toast.success("Category deleted; documents reassigned.");
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : "Delete failed.");
		},
	});

	// Reorder mutation uses TanStack Query's onMutate/onError snapshot
	// pattern (cycle-1 M-6) so a failed RPC restores the EXACT cached
	// order the user saw before drag — no full refetch flash.
	const listKey = documentCategoryQueries.list().queryKey;
	const reorderMutation = useMutation({
		...documentCategoryMutations.reorder(),
		// Cycle-3 M-2: write the optimistic order INSIDE onMutate
		// (after cancelQueries + snapshot), not before mutate(). Doing
		// the write outside leaves a tiny window where an in-flight
		// refetch could overwrite the optimistic state, then the
		// snapshot would capture that already-overwritten state. The
		// caller passes the pre-computed `next` array via the input.
		onMutate: async (input) => {
			await queryClient.cancelQueries({ queryKey: listKey });
			const previous = queryClient.getQueryData<DocumentCategoryRow[]>(listKey);
			if (input.next) {
				queryClient.setQueryData<DocumentCategoryRow[]>(
					listKey,
					() => input.next,
				);
			}
			return { previous };
		},
		onSuccess: () => invalidateAll(),
		onError: (err, _vars, ctx) => {
			if (ctx?.previous) {
				queryClient.setQueryData(listKey, ctx.previous);
			}
			toast.error(err instanceof Error ? err.message : "Reorder failed.");
		},
	});

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = categories.findIndex((c) => c.id === active.id);
		const newIndex = categories.findIndex((c) => c.id === over.id);
		if (oldIndex < 0 || newIndex < 0) return;
		const reordered = arrayMove(categories, oldIndex, newIndex);
		const orders = reordered.map((c, idx) => ({
			id: c.id,
			sort_order: (idx + 1) * 10,
		}));
		const nextRows = reordered.map((c, idx) => ({
			...c,
			sort_order: (idx + 1) * 10,
		}));
		// Pass the pre-computed reordered rows to the mutation so
		// onMutate can serialize cancelQueries → snapshot → setQueryData
		// atomically.
		reorderMutation.mutate({ orders, next: nextRows });
	}

	// Cycle-1 M-1: append-at-end semantics. Picking max+10 stays
	// behind the highest sort_order even after a reorder produced gaps.
	const nextSortOrder =
		(categories.length === 0
			? 0
			: Math.max(...categories.map((c) => c.sort_order))) + 10;

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Document categories</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-12 w-full" />
					))}
				</CardContent>
			</Card>
		);
	}

	// Session 11 P2 #8: surface a real error state. Previously a failed
	// list query rendered an empty `<ul>` with no chrome — users could
	// not tell the difference between "you have zero categories" (which
	// is impossible since seven defaults are seeded on signup) and "the
	// taxonomy fetch failed." Show an explicit error card with a retry.
	if (isError) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Document categories</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
					<div className="flex items-center gap-2 text-destructive">
						<AlertCircle className="size-4" aria-hidden="true" />
						<span>We couldn&apos;t load your document categories.</span>
					</div>
					<Button
						size="sm"
						variant="outline"
						onClick={() =>
							void queryClient.invalidateQueries({
								queryKey: documentCategoryQueries.all(),
							})
						}
					>
						Retry
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
				<div className="space-y-1">
					<CardTitle>Document categories</CardTitle>
					<CardDescription>
						Customize the taxonomy used when uploading and filtering documents.
						Default categories can be reordered or renamed but not deleted.
					</CardDescription>
				</div>
				<Button
					size="sm"
					onClick={() => setCreateOpen(true)}
					className="shrink-0"
				>
					<Plus className="size-4 mr-1" aria-hidden="true" />
					Add category
				</Button>
			</CardHeader>
			<CardContent>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={categories.map((c) => c.id)}
						strategy={verticalListSortingStrategy}
					>
						<ul className="space-y-2" aria-label="Document categories">
							{categories.map((c) => (
								<CategoryRow
									key={c.id}
									category={c}
									onEdit={(cat) => setRenaming(cat)}
									onDelete={(cat) => setDeleting(cat)}
								/>
							))}
						</ul>
					</SortableContext>
				</DndContext>
			</CardContent>

			<CategoryCreateDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				onSubmit={(input) => createMutation.mutate(input)}
				isPending={createMutation.isPending}
				defaultSortOrder={nextSortOrder}
				existingSlugs={categories.map((c) => c.slug)}
			/>

			<CategoryRenameDialog
				target={renaming}
				onOpenChange={(open) => {
					if (!open) setRenaming(null);
				}}
				onSubmit={(input) => updateMutation.mutate(input)}
				isPending={updateMutation.isPending}
			/>

			<CategoryDeleteDialog
				target={deleting}
				candidates={categories}
				onOpenChange={(open) => {
					if (!open) setDeleting(null);
				}}
				onSubmit={(input) => deleteMutation.mutate(input)}
				isPending={deleteMutation.isPending}
			/>
		</Card>
	);
}
