'use client'

import { createPortal } from 'react-dom'
import { Pencil, Trash2, X } from 'lucide-react'
import { Button } from '#components/ui/button'

export interface PropertyActionBarProps {
	selectedCount: number
	totalCount: number
	onClear: () => void
	onBulkEdit?: () => void
	onBulkDelete?: () => void
}

/**
 * PropertyActionBar - Floating action bar for bulk property operations
 *
 * Renders at the bottom of the viewport using a portal.
 * Shows when one or more properties are selected.
 *
 * Features:
 * - Selection count display
 * - Bulk edit button
 * - Bulk delete button (destructive)
 * - Clear selection button
 * - Animated entry/exit
 */
export function PropertyActionBar({
	selectedCount,
	totalCount,
	onClear,
	onBulkEdit,
	onBulkDelete
}: PropertyActionBarProps) {
	if (selectedCount === 0) return null

	const portalRoot = typeof document !== 'undefined' ? document.body : null
	if (!portalRoot) return null

	return createPortal(
		<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
			<div className="flex items-center gap-3 px-4 py-3 bg-background/95 backdrop-blur-sm border border-border rounded-full shadow-lg">
				<span className="text-sm font-medium text-foreground tabular-nums">
					{selectedCount} of {totalCount} selected
				</span>
				<div className="w-px h-4 bg-border" />
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={onBulkEdit}
						className="gap-2 min-h-9"
						aria-label="Edit selected properties"
					>
						<Pencil className="w-4 h-4" />
						Edit
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={onBulkDelete}
						className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 min-h-9"
						aria-label="Delete selected properties"
					>
						<Trash2 className="w-4 h-4" />
						Delete
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={onClear}
						className="size-8 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
						aria-label="Clear selection"
					>
						<X className="w-4 h-4" />
					</Button>
				</div>
			</div>
		</div>,
		portalRoot
	)
}
