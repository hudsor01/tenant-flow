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
import type { CreateDocumentCategoryInput } from '#hooks/api/query-keys/document-category-keys'

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

interface CategoryCreateDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSubmit: (input: CreateDocumentCategoryInput) => void
	isPending: boolean
	/** Used to compute the new row's sort_order — defaults to max+10 to
	 * append at the end of the list. */
	defaultSortOrder: number
}

export function CategoryCreateDialog({
	open,
	onOpenChange,
	onSubmit,
	isPending,
	defaultSortOrder
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
	const canSubmit =
		!isPending && trimmedLabel.length > 0 && slug.length > 0

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
