'use client'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '#components/ui/alert-dialog'
import { Button } from '#components/ui/button'
import { AlertTriangle, Trash2 } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { useState } from 'react'

export interface DeleteDialogProps
	extends Omit<ComponentProps<typeof AlertDialog>, 'children'> {
	/**
	 * Dialog trigger button text
	 */
	triggerText: string
	/**
	 * Dialog trigger button icon (defaults to Trash2)
	 */
	triggerIcon?: ReactNode
	/**
	 * Dialog title
	 */
	title: string
	/**
	 * Dialog description/warning message
	 */
	description: string
	/**
	 * Item name to display in confirmation (e.g., "Property: Sunset Apartments")
	 */
	itemName?: string
	/**
	 * Whether the deletion is pending
	 */
	isPending?: boolean
	/**
	 * Delete button text
	 */
	deleteText?: string
	/**
	 * Delete button pending text
	 */
	deletePendingText?: string
	/**
	 * Delete confirmation handler
	 */
	onDelete: () => void | Promise<void>
	/**
	 * Controlled open state (optional)
	 */
	open?: boolean
	/**
	 * Callback when dialog open state changes
	 */
	onOpenChange?: (open: boolean) => void
	/**
	 * Custom trigger button className
	 */
	triggerClassName?: string
	/**
	 * Custom trigger button variant
	 */
	triggerVariant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
	/**
	 * Show warning icon in header
	 */
	showWarningIcon?: boolean
	/**
	 * Render trigger as button child (for custom triggers like icon-only buttons)
	 */
	renderTrigger?: (onClick: () => void) => ReactNode
}

/**
 * Base delete confirmation dialog component
 *
 * Features:
 * - AlertDialog for destructive action confirmation
 * - Warning icon and styling
 * - Pending state during deletion
 * - Customizable trigger button
 *
 * @example
 * ```tsx
 * <DeleteDialog
 *   triggerText="Delete Property"
 *   title="Delete Property"
 *   description="This action cannot be undone. This will permanently delete the property and all associated data."
 *   itemName="Sunset Apartments"
 *   onDelete={handleDelete}
 *   isPending={deleteMutation.isPending}
 * />
 * ```
 */
export function DeleteDialog(props: DeleteDialogProps) {
	const {
		triggerText,
		triggerIcon = <Trash2 className="size-4" />,
		title,
		description,
		itemName,
		isPending = false,
		deleteText = 'Delete',
		deletePendingText = 'Deleting...',
		onDelete,
		onOpenChange,
		triggerClassName = 'flex items-center gap-2',
		triggerVariant = 'destructive',
		showWarningIcon = true,
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

	const handleDelete = async () => {
		await onDelete()
		setInternalOpen(false)
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
		<AlertDialog {...rest} open={isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogTrigger asChild>{triggerButton}</AlertDialogTrigger>

			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						{showWarningIcon && (
							<AlertTriangle className="size-5 text-destructive" />
						)}
						{title}
					</AlertDialogTitle>
					<AlertDialogDescription className="space-y-2">
						<p>{description}</p>
						{itemName && (
							<p className="font-medium text-foreground">{itemName}</p>
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={isPending}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isPending ? deletePendingText : deleteText}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
