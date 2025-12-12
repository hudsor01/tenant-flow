'use client'

/**
 * CrudDialog - Dialog with modal store integration
 *
 * This is a thin wrapper around ShadCN Dialog that adds:
 * - Modal store integration for URL-synced modal state
 * - Auto-navigation on close (router.back())
 *
 * For simple dialogs without modal store, use Dialog directly from './dialog'
 */

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { cn } from '#lib/utils'
import { useModalStore } from '#stores/modal-store'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	DialogOverlay,
	DialogPortal,
	DialogTrigger,
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '#components/ui/dialog'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	DrawerPortal,
	DrawerTitle,
	DrawerTrigger
} from '#components/ui/drawer'
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger
} from '#components/ui/sheet'

export type CrudMode = 'create' | 'read' | 'edit' | 'delete'
export type CrudDialogVariant = 'dialog' | 'alert' | 'confirm' | 'drawer' | 'sheet'

export interface CrudDialogProps
	extends React.ComponentProps<typeof DialogPrimitive.Root> {
	/** CRUD operation mode (for semantic purposes) */
	mode: CrudMode
	/** Unique modal ID for the modal store (enables URL-synced state) */
	modalId?: string
	/** Custom close handler */
	onClose?: () => void
	/** Whether to persist the modal through navigation (default: false = router.back() on close) */
	persistThroughNavigation?: boolean
	/**
	 * Modal variant (dialog, alert, confirm, drawer, sheet)
	 */
	variant?: CrudDialogVariant
}

/**
 * CrudDialog - Dialog with modal store integration
 *
 * When modalId is provided, the dialog state is managed by the modal store.
 * When closed, it automatically calls router.back() unless persistThroughNavigation is true.
 */
function CrudDialog({
	mode: _mode,
	modalId,
	children,
	onClose,
	persistThroughNavigation = false,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	defaultOpen,
	...props
}: CrudDialogProps) {
	const router = useRouter()
	const { isModalOpen, closeModal } = useModalStore()

	const isModalMode = !!modalId
	const modalOpen = isModalMode ? isModalOpen(modalId) : undefined
	const wasEverOpenRef = useRef(false)

	// Handle modal close with navigation
	useEffect(() => {
		if (!isModalMode) return
		if (modalOpen) {
			wasEverOpenRef.current = true
			return
		}

		if (wasEverOpenRef.current) {
			onClose?.()
			if (!persistThroughNavigation) {
				router.back()
			}
		}
	}, [isModalMode, modalOpen, onClose, persistThroughNavigation, router])

	const handleOpenChange = (openState: boolean) => {
		controlledOnOpenChange?.(openState)
		if (!openState) {
			if (isModalMode && modalId) {
				closeModal(modalId)
			} else {
				onClose?.()
			}
		}
	}

	// Determine open state - modal store takes precedence, then controlled prop
	const resolvedOpen = isModalMode ? modalOpen : controlledOpen

	return (
		<Dialog
			{...(resolvedOpen !== undefined && { open: resolvedOpen })}
			{...(!isModalMode && defaultOpen !== undefined && { defaultOpen })}
			onOpenChange={handleOpenChange}
			{...props}
		>
			{children}
		</Dialog>
	)
}
CrudDialog.displayName = 'CrudDialog'

/**
 * CrudDialogBody - Container for dialog form content
 */
function CrudDialogBody({ className, ...props }: React.ComponentProps<'div'>) {
	return <div className={cn('space-y-4', className)} {...props} />
}
CrudDialogBody.displayName = 'CrudDialogBody'

// Export the modal-aware wrapper
export { CrudDialog }

// Export body helper
export { CrudDialogBody }

// Re-export Dialog components with CrudDialog prefix for backwards compatibility
export {
	CrudDialogContent,
	CrudDialogHeader,
	CrudDialogTitle,
	CrudDialogDescription,
	CrudDialogFooter,
	CrudDialogClose,
	CrudDialogOverlay,
	CrudDialogPortal,
	CrudDialogTrigger,
	CrudDialogAction,
	CrudDialogCancel
}

// Re-export AlertDialog components with CrudDialog prefix
export {
	AlertDialogAction as CrudDialogAction,
	AlertDialogCancel as CrudDialogCancel
}

// Also re-export base Dialog components for mixed usage
export {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	DialogOverlay,
	DialogPortal,
	DialogTrigger,
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
}

// CrudDialogBody alias
export { CrudDialogBody as DialogBody }
