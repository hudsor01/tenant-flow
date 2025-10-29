'use client'

import { Button } from '#components/ui/button'
import { Eye, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

export interface ViewModalProps {
	/**
	 * Modal trigger button text
	 */
	triggerText: string
	/**
	 * Modal trigger button icon (defaults to Eye)
	 */
	triggerIcon?: ReactNode
	/**
	 * Modal title
	 */
	title: string
	/**
	 * Modal description
	 */
	description?: string
	/**
	 * Controlled open state (optional)
	 */
	open?: boolean
	/**
	 * Callback when modal open state changes
	 */
	onOpenChange?: (open: boolean) => void
	/**
	 * Content to display (read-only view)
	 */
	children: ReactNode
	/**
	 * Custom modal className
	 */
	className?: string
	/**
	 * Custom trigger button className
	 */
	triggerClassName?: string
	/**
	 * Custom trigger button variant
	 */
	triggerVariant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
	/**
	 * Show close button
	 */
	showCloseButton?: boolean
	/**
	 * Close button text
	 */
	closeText?: string
	/**
	 * Render trigger as button child (for custom triggers)
	 */
	renderTrigger?: (onClick: () => void) => ReactNode
}

/**
 * Base view modal component (full-page overlay) for read-only data display
 *
 * @example
 * ```tsx
 * <ViewModal
 *   triggerText="View Details"
 *   title="Property Details"
 *   description="Complete property information"
 * >
 *   <PropertyDetailsView property={property} />
 * </ViewModal>
 * ```
 */
export function ViewModal({
	triggerText,
	triggerIcon = <Eye className="size-4" />,
	title,
	description,
	onOpenChange,
	children,
	className = '',
	triggerClassName = 'flex items-center gap-2',
	triggerVariant = 'outline',
	showCloseButton = true,
	closeText = 'Close',
	renderTrigger
}: ViewModalProps) {
	const [internalOpen, setInternalOpen] = useState(false)
	const isControlled = open !== undefined
	const isOpen = isControlled ? !!open : internalOpen

	const handleOpenChange = (open: boolean) => {
		if (!isControlled) setInternalOpen(open)
		onOpenChange?.(open)
	}

	if (!isOpen) {
		if (renderTrigger) {
			return (
				<div onClick={() => handleOpenChange(true)}>
					{renderTrigger(() => handleOpenChange(true))}
				</div>
			)
		}

		return (
			<Button
				variant={triggerVariant}
				className={triggerClassName}
				onClick={() => handleOpenChange(true)}
			>
				{triggerIcon}
				{triggerText}
			</Button>
		)
	}

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0"
				onClick={() => handleOpenChange(false)}
			/>

			{/* Modal Content */}
			<div
				className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%] sm:rounded-lg ${className}`}
			>
				{/* Close Button */}
				<button
					onClick={() => handleOpenChange(false)}
					className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
				>
					<X className="size-4" />
					<span className="sr-only">Close</span>
				</button>

				{/* Header */}
				<div className="space-y-2">
					<h2 className="text-2xl font-semibold">{title}</h2>
					{description && (
						<p className="text-muted-foreground">{description}</p>
					)}
				</div>

				{/* Read-only content */}
				<div className="max-h-[70vh] overflow-y-auto space-y-4">{children}</div>

				{/* Optional close button */}
				{showCloseButton && (
					<div className="flex justify-end pt-6 border-t">
						<Button variant="outline" onClick={() => handleOpenChange(false)}>
							{closeText}
						</Button>
					</div>
				)}
			</div>
		</>
	)
}
