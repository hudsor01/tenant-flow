'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors
} from '@dnd-kit/core'
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Input } from '#components/ui/input'
import { Skeleton } from '#components/ui/skeleton'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '#components/ui/tooltip'
import { useDocumentCategories } from '#hooks/api/use-document-categories'
import {
	documentCategoryMutations,
	documentCategoryQueries,
	type DocumentCategoryRow
} from '#hooks/api/query-keys/document-category-keys'

const SLUG_INPUT_HINT =
	'lowercase letters, numbers, and underscores only (1-50 chars)'
const LABEL_MAX = 80

function asciiSlugify(label: string): string {
	return label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 50)
}

interface SortableRowProps {
	category: DocumentCategoryRow
	onEdit: (c: DocumentCategoryRow) => void
	onDelete: (c: DocumentCategoryRow) => void
}

function SortableRow({ category, onEdit, onDelete }: SortableRowProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id: category.id })
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1
	}
	return (
		<li
			ref={setNodeRef}
			style={style}
			className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
		>
			<button
				type="button"
				className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
				aria-label={`Drag to reorder ${category.label}`}
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-4" aria-hidden="true" />
			</button>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="font-medium truncate">{category.label}</span>
					{category.is_default && (
						<span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
							Default
						</span>
					)}
				</div>
				<code className="text-xs text-muted-foreground">{category.slug}</code>
			</div>
			<Button
				variant="ghost"
				size="sm"
				className="size-9 p-0"
				onClick={() => onEdit(category)}
				aria-label={`Rename ${category.label}`}
			>
				<Pencil className="size-4" aria-hidden="true" />
			</Button>
			{category.is_default ? (
				<TooltipProvider delayDuration={150}>
					<Tooltip>
						<TooltipTrigger asChild>
							<span tabIndex={0}>
								<Button
									variant="ghost"
									size="sm"
									className="size-9 p-0 text-muted-foreground"
									disabled
									aria-label="Default categories can't be deleted"
								>
									<Trash2 className="size-4" aria-hidden="true" />
								</Button>
							</span>
						</TooltipTrigger>
						<TooltipContent>
							Default categories can&rsquo;t be deleted.
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			) : (
				<Button
					variant="ghost"
					size="sm"
					className="size-9 p-0"
					onClick={() => onDelete(category)}
					aria-label={`Delete ${category.label}`}
				>
					<Trash2 className="size-4" aria-hidden="true" />
				</Button>
			)}
		</li>
	)
}

export function CategoriesSettings() {
	const { categories, isLoading } = useDocumentCategories()
	const queryClient = useQueryClient()

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	)

	const [createOpen, setCreateOpen] = useState(false)
	const [createLabel, setCreateLabel] = useState('')
	const [createSlug, setCreateSlug] = useState('')
	const [slugTouched, setSlugTouched] = useState(false)

	const [renaming, setRenaming] = useState<DocumentCategoryRow | null>(null)
	const [renameLabel, setRenameLabel] = useState('')

	const [deleting, setDeleting] = useState<DocumentCategoryRow | null>(null)
	const [reassignTo, setReassignTo] = useState<string>('')

	const invalidateAll = () => {
		void queryClient.invalidateQueries({
			queryKey: documentCategoryQueries.all()
		})
		// Reassign also rewrites documents.document_type, so the documents
		// list view is stale too.
		void queryClient.invalidateQueries({ queryKey: ['documents'] })
		void queryClient.invalidateQueries({ queryKey: ['documentSearch'] })
	}

	const createMutation = useMutation({
		...documentCategoryMutations.create(),
		onSuccess: () => {
			invalidateAll()
			setCreateOpen(false)
			setCreateLabel('')
			setCreateSlug('')
			setSlugTouched(false)
			toast.success('Category created.')
		},
		onError: err => {
			toast.error(err instanceof Error ? err.message : 'Create failed.')
		}
	})

	const updateMutation = useMutation({
		...documentCategoryMutations.update(),
		onSuccess: () => {
			invalidateAll()
			setRenaming(null)
			toast.success('Category renamed.')
		},
		onError: err => {
			toast.error(err instanceof Error ? err.message : 'Rename failed.')
		}
	})

	const deleteMutation = useMutation({
		...documentCategoryMutations.deleteWithReassign(),
		onSuccess: () => {
			invalidateAll()
			setDeleting(null)
			setReassignTo('')
			toast.success('Category deleted; documents reassigned.')
		},
		onError: err => {
			toast.error(err instanceof Error ? err.message : 'Delete failed.')
		}
	})

	const reorderMutation = useMutation({
		...documentCategoryMutations.reorder(),
		onSuccess: () => invalidateAll(),
		onError: err => {
			toast.error(err instanceof Error ? err.message : 'Reorder failed.')
			// Roll back the optimistic UI by re-fetching authoritative order.
			void queryClient.invalidateQueries({
				queryKey: documentCategoryQueries.list().queryKey
			})
		}
	})

	const reassignTargets = useMemo(
		() => categories.filter(c => c.id !== deleting?.id),
		[categories, deleting]
	)

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event
		if (!over || active.id === over.id) return
		const oldIndex = categories.findIndex(c => c.id === active.id)
		const newIndex = categories.findIndex(c => c.id === over.id)
		if (oldIndex < 0 || newIndex < 0) return
		const reordered = arrayMove(categories, oldIndex, newIndex)
		const orders = reordered.map((c, idx) => ({
			id: c.id,
			sort_order: (idx + 1) * 10
		}))
		// Optimistic UI: update the cached list immediately so the
		// dragged row stays where the user dropped it. Server confirms
		// via invalidateAll on success; the rollback path on error
		// re-fetches the authoritative order.
		queryClient.setQueryData<DocumentCategoryRow[]>(
			documentCategoryQueries.list().queryKey,
			() =>
				reordered.map((c, idx) => ({
					...c,
					sort_order: (idx + 1) * 10
				}))
		)
		reorderMutation.mutate({ orders })
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Document categories</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					{[0, 1, 2, 3].map(i => (
						<Skeleton key={i} className="h-12 w-full" />
					))}
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
				<div className="space-y-1">
					<CardTitle>Document categories</CardTitle>
					<CardDescription>
						Customize the taxonomy used when uploading and filtering
						documents. Default categories can be reordered or renamed but
						not deleted.
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
						items={categories.map(c => c.id)}
						strategy={verticalListSortingStrategy}
					>
						<ul className="space-y-2" aria-label="Document categories">
							{categories.map(c => (
								<SortableRow
									key={c.id}
									category={c}
									onEdit={cat => {
										setRenaming(cat)
										setRenameLabel(cat.label)
									}}
									onDelete={cat => {
										setDeleting(cat)
										// Default to the canonical fallback when present.
										const fallback =
											categories.find(
												x => x.slug === 'other' && x.id !== cat.id
											) ?? categories.find(x => x.id !== cat.id)
										setReassignTo(fallback?.id ?? '')
									}}
								/>
							))}
						</ul>
					</SortableContext>
				</DndContext>
			</CardContent>

			<Dialog
				open={createOpen}
				onOpenChange={open => {
					setCreateOpen(open)
					if (!open) {
						setCreateLabel('')
						setCreateSlug('')
						setSlugTouched(false)
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>New category</DialogTitle>
						<DialogDescription>
							Categories are private to your account. Slugs cannot be
							changed after creation.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-1">
							<label
								htmlFor="new-cat-label"
								className="text-sm font-medium"
							>
								Label
							</label>
							<Input
								id="new-cat-label"
								value={createLabel}
								maxLength={LABEL_MAX}
								onChange={e => {
									setCreateLabel(e.target.value)
									if (!slugTouched) {
										setCreateSlug(asciiSlugify(e.target.value))
									}
								}}
								placeholder="Warranty"
								autoFocus
							/>
						</div>
						<div className="space-y-1">
							<label htmlFor="new-cat-slug" className="text-sm font-medium">
								Slug
							</label>
							<Input
								id="new-cat-slug"
								value={createSlug}
								onChange={e => {
									setSlugTouched(true)
									setCreateSlug(e.target.value)
								}}
								placeholder="warranty"
								aria-describedby="new-cat-slug-hint"
							/>
							<p
								id="new-cat-slug-hint"
								className="text-xs text-muted-foreground"
							>
								{SLUG_INPUT_HINT}
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setCreateOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={() =>
								createMutation.mutate({
									slug: createSlug,
									label: createLabel,
									sort_order: (categories.length + 1) * 10
								})
							}
							disabled={
								createMutation.isPending ||
								createLabel.trim().length === 0 ||
								createSlug.length === 0
							}
						>
							{createMutation.isPending && (
								<Loader2
									className="size-4 mr-2 animate-spin"
									aria-hidden="true"
								/>
							)}
							Create
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={renaming !== null}
				onOpenChange={open => {
					if (!open) {
						setRenaming(null)
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename category</DialogTitle>
						<DialogDescription>
							Slug stays as <code>{renaming?.slug}</code>. Labels can be
							edited freely.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-1">
						<label htmlFor="rename-label" className="text-sm font-medium">
							Label
						</label>
						<Input
							id="rename-label"
							value={renameLabel}
							maxLength={LABEL_MAX}
							onChange={e => setRenameLabel(e.target.value)}
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setRenaming(null)}>
							Cancel
						</Button>
						<Button
							onClick={() => {
								if (!renaming) return
								updateMutation.mutate({
									id: renaming.id,
									label: renameLabel
								})
							}}
							disabled={
								updateMutation.isPending ||
								renameLabel.trim().length === 0 ||
								renameLabel.trim() === renaming?.label
							}
						>
							{updateMutation.isPending && (
								<Loader2
									className="size-4 mr-2 animate-spin"
									aria-hidden="true"
								/>
							)}
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={deleting !== null}
				onOpenChange={open => {
					if (!open) {
						setDeleting(null)
						setReassignTo('')
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete &ldquo;{deleting?.label}&rdquo;</DialogTitle>
						<DialogDescription>
							Documents currently tagged with this category will be
							reassigned to the category you pick below. This change is
							atomic — every affected document is updated in a single
							transaction.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-1">
						<label htmlFor="reassign-target" className="text-sm font-medium">
							Reassign documents to
						</label>
						<Select value={reassignTo} onValueChange={setReassignTo}>
							<SelectTrigger
								id="reassign-target"
								aria-label="Reassignment target category"
							>
								<SelectValue placeholder="Choose a category" />
							</SelectTrigger>
							<SelectContent>
								{reassignTargets.map(c => (
									<SelectItem key={c.id} value={c.id}>
										{c.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => {
								setDeleting(null)
								setReassignTo('')
							}}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (!deleting || !reassignTo) return
								deleteMutation.mutate({
									from_id: deleting.id,
									to_id: reassignTo
								})
							}}
							disabled={
								deleteMutation.isPending ||
								!reassignTo ||
								reassignTo === deleting?.id
							}
						>
							{deleteMutation.isPending && (
								<Loader2
									className="size-4 mr-2 animate-spin"
									aria-hidden="true"
								/>
							)}
							Delete &amp; reassign
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	)
}
