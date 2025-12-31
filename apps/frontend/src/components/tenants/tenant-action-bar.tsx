'use client'

import { createPortal } from 'react-dom'
import { Trash2, Download, X } from 'lucide-react'
import { Button } from '#components/ui/button'

// ============================================================================
// TYPES
// ============================================================================

interface TenantActionBarProps {
	selectedCount: number
	isVisible: boolean
	onDelete: () => void
	onExport: () => void
	onClose: () => void
}

// ============================================================================
// ACTION BAR COMPONENT
// Floating bar at bottom center, appears when items are selected
// Styled to match @diceui/action-bar aesthetic
// ============================================================================

export function TenantActionBar({
	selectedCount,
	isVisible,
	onDelete,
	onExport,
	onClose
}: TenantActionBarProps) {
	if (!isVisible) return null

	// Use portal to render at document body level
	if (typeof window === 'undefined') return null

	return createPortal(
		<div
			role="toolbar"
			aria-orientation="horizontal"
			className="fixed z-50 rounded-lg border bg-card shadow-lg outline-none fade-in-0 zoom-in-95 animate-in duration-250 slide-in-from-bottom-4 flex flex-row items-center gap-2 px-2 py-1.5"
			style={{
				bottom: '24px',
				left: '50%',
				transform: 'translateX(-50%)'
			}}
		>
			{/* Selection Count */}
			<div className="flex items-center gap-1 rounded-sm border px-2 py-1 font-medium text-sm tabular-nums">
				{selectedCount}
				<div className="h-4 w-px bg-border ml-0.5" aria-hidden="true" />
				selected
			</div>

			<div className="h-6 w-px bg-border" aria-hidden="true" />

			{/* Actions */}
			<div role="group" className="flex gap-2 outline-none items-center">
				<Button variant="secondary" size="sm" onClick={onExport}>
					<Download className="h-4 w-4" />
					Export
				</Button>
				<Button
					variant="secondary"
					size="sm"
					className="text-destructive hover:bg-destructive/10 hover:text-destructive"
					onClick={onDelete}
				>
					<Trash2 className="h-4 w-4" />
					Delete
				</Button>
			</div>

			<div className="h-6 w-px bg-border" aria-hidden="true" />

			{/* Close */}
			<button
				type="button"
				onClick={onClose}
				aria-label="Deselect all"
				className="rounded-xs opacity-70 outline-none hover:opacity-100 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none p-1"
			>
				<X className="h-3.5 w-3.5" />
			</button>
		</div>,
		document.body
	)
}
