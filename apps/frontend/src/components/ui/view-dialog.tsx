'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { Eye } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { useState } from 'react'

export interface ViewDialogProps
	extends Omit<ComponentProps<typeof Dialog>, 'children'> {
	/**
	 * Dialog trigger button text
	 */
	triggerText: string
	/**
	 * Dialog trigger button icon (defaults to Eye)
	 */
	triggerIcon?: ReactNode
	/**
	 * Dialog title
	 */
	title: string
	/**
	 * Dialog description
	 */
	description?: string
	/**
	 * Controlled open state (optional)
	 */
	open?: boolean
	/**
	 * Callback when dialog open state changes
	 */
	onOpenChange?: (open: boolean) => void
	/**
	 * Content to display (read-only view)
	 */
	children: ReactNode
	/**
	 * Custom dialog content className
	 */
	contentClassName?: string
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
	 * Render trigger as button child (for custom triggers like icon-only buttons)
	 */
	renderTrigger?: (onClick: () => void) => ReactNode
}

/**
 * Base view dialog component for read-only data display
 *
 * Features:
 * - Read-only content display
 * - Customizable trigger button
 * - Optional close button
 *
 * @example
 * ```tsx
 * <ViewDialog
 *   triggerText="View Details"
 *   title="Property Details"
 *   description="View complete property information"
 * >
 *   <PropertyDetailsView property={property} />
 * </ViewDialog>
 * ```
 */
export function ViewDialog(props: ViewDialogProps) {
	const {
		triggerText,
		triggerIcon = <Eye className="size-4" />,
		title,
		description,
		onOpenChange,
		children,
		contentClassName = 'sm:max-w-2xl max-h-[90vh] overflow-y-auto',
		triggerClassName = 'flex items-center gap-2',
		triggerVariant = 'outline',
		showCloseButton = true,
		closeText = 'Close',
		renderTrigger,
		...rest
	} = props

	const [internalOpen, setInternalOpen] = useState(false)
	const isControlled = rest.open !== undefined
	const isOpen = isControlled ? !!rest.open : internalOpen

	const handleOpenChange = (open: boolean) => {
		if (!isControlled) setInternalOpen(open)
		onOpenChange?.(open)
	}

	const triggerButton = renderTrigger ? (
		<div onClick={() => setInternalOpen(true)}>
			{renderTrigger(() => setInternalOpen(true))}
		</div>
	) : (
		<Button variant={triggerVariant} className={triggerClassName}>
			{triggerIcon}
			{triggerText}
		</Button>
	)

	return (
		<Dialog {...rest} open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{triggerButton}</DialogTrigger>

			<DialogContent className={contentClassName}>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>

				{/* Read-only content */}
				<div className="space-y-4">{children}</div>

				{/* Optional close button */}
				{showCloseButton && (
					<div className="flex justify-end pt-6 border-t">
						<Button variant="outline" onClick={() => setInternalOpen(false)}>
							{closeText}
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
