'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Input } from '#components/ui/input'
import { cn } from '#lib/utils'
import type { CreateDocumentCategoryInput } from '#hooks/api/query-keys/document-category-keys'

const SLUG_INPUT_HINT =
	'lowercase letters, numbers, and underscores only (1-50 chars)'
const SLUG_FORMAT_RE = /^[a-z0-9_]+$/
const LABEL_MAX = 80
const SLUG_MAX = 50

function asciiSlugify(label: string): string {
	return label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, SLUG_MAX)
}

interface CategoryCreateDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSubmit: (input: CreateDocumentCategoryInput) => void
	isPending: boolean
	/** Used to compute the new row's sort_order — defaults to max+10 to
	 * append at the end of the list. */
	defaultSortOrder: number
	/** Existing slugs in the user's taxonomy. Used for client-side
	 * dedup so the user gets a friendly inline error before the RPC
	 * round-trip surfaces a raw 23505 from the unique constraint. */
	existingSlugs: ReadonlyArray<string>
}

export function CategoryCreateDialog({
	open,
	onOpenChange,
	onSubmit,
	isPending,
	defaultSortOrder,
	existingSlugs
}: CategoryCreateDialogProps) {
	const [label, setLabel] = useState('')
	const [slug, setSlug] = useState('')
	const [slugTouched, setSlugTouched] = useState(false)

	// Reset form state whenever the dialog closes — single side effect so
	// the cleanup path lives in one place rather than being duplicated
	// across onOpenChange + Cancel-button handlers.
	useEffect(() => {
		if (!open) {
			setLabel('')
			setSlug('')
			setSlugTouched(false)
		}
	}, [open])

	function handleLabelChange(next: string) {
		setLabel(next)
		// Auto-derive slug from label until the user explicitly edits it.
		// If they then clear the slug field, restore the auto-fill so
		// they're not stuck with stale state (cycle-1 M-10).
		if (!slugTouched) {
			setSlug(asciiSlugify(next))
		}
	}

	function handleSlugChange(next: string) {
		if (next.length === 0) {
			// Reset the touched flag so the auto-fill re-engages on the
			// next label edit.
			setSlugTouched(false)
		} else {
			setSlugTouched(true)
		}
		setSlug(next)
	}

	const trimmedLabel = label.trim()
	// Client-side validation surfaces issues inline BEFORE the RPC round-
	// trip, so users don't see a raw "duplicate key value violates
	// unique constraint" toast for an obvious dupe (cycle-5 M-1) or a
	// post-submit Zod rejection for a malformed slug (cycle-5 M-2).
	const slugFormatValid = slug.length === 0 || SLUG_FORMAT_RE.test(slug)
	const slugTooLong = slug.length > SLUG_MAX
	const slugDuplicate =
		slug.length > 0 && existingSlugs.includes(slug)
	const slugError = !slugFormatValid
		? `Slug must match ${SLUG_INPUT_HINT}.`
		: slugTooLong
			? `Slug must be 1-${SLUG_MAX} characters.`
			: slugDuplicate
				? 'A category with this slug already exists.'
				: null
	const canSubmit =
		!isPending &&
		trimmedLabel.length > 0 &&
		slug.length > 0 &&
		slugFormatValid &&
		!slugTooLong &&
		!slugDuplicate

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
						<label htmlFor="new-cat-label" className="text-sm font-medium">
							Label
						</label>
						<Input
							id="new-cat-label"
							value={label}
							maxLength={LABEL_MAX}
							onChange={e => handleLabelChange(e.target.value)}
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
							value={slug}
							onChange={e => handleSlugChange(e.target.value)}
							placeholder="warranty"
							aria-describedby="new-cat-slug-hint"
							aria-invalid={slugError !== null}
							className={cn(
								slugError !== null &&
									'border-destructive focus-visible:ring-destructive'
							)}
						/>
						<p
							id="new-cat-slug-hint"
							className={cn(
								'text-xs',
								slugError !== null
									? 'text-destructive'
									: 'text-muted-foreground'
							)}
						>
							{slugError ?? SLUG_INPUT_HINT}
						</p>
					</div>
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={() =>
							onSubmit({
								slug,
								label: trimmedLabel,
								sort_order: defaultSortOrder
							})
						}
						disabled={!canSubmit}
					>
						{isPending && (
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
	)
}
