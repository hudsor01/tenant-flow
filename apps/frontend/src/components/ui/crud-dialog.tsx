'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { cn } from '#lib/utils'
import { useModalStore } from '#stores/modal-store'
// Import base components from dialog.tsx - no duplication!
import {
	Dialog as _BaseDialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	DialogOverlay,
	DialogPortal,
	DialogTrigger
} from '#components/ui/dialog'

export type CrudMode = 'create' | 'read' | 'edit' | 'delete'

export interface CrudDialogProps
	extends Omit<React.ComponentProps<typeof DialogPrimitive.Root>, 'children'> {
	/**
	 * CRUD operation mode
	 */
	mode: CrudMode
	/**
	 * Unique modal ID for the modal store (required for read/edit/delete modes)
	 */
	modalId?: string
	/**
	 * Dialog content children
	 */
	children: ReactNode
	/**
	 * Custom close handler
	 */
	onClose?: () => void
	/**
	 * Whether to persist the modal through navigation
	 */
	persistThroughNavigation?: boolean
}

/**
 * CrudDialogBody - Container for dialog form content
 * This is the ONLY new component - not in base dialog.tsx
 */
function CrudDialogBody({
	className,
	...props
}: React.ComponentProps<'div'>) {
	return <div className={cn('space-y-4', className)} {...props} />
}
CrudDialogBody.displayName = 'CrudDialogBody'

/**
 * CrudDialog - Dialog with modal store integration for CRUD operations
 *
 * This is the ONLY unique component - everything else is re-exported from dialog.tsx.
 * Adds:
 * - Modal store integration for state management
 * - Navigation handling on close
 * - CRUD mode support
 */
function CrudDialog({
	mode: _mode,
	modalId,
	children,
	onClose,
	persistThroughNavigation = false,
	...props
}: CrudDialogProps) {
	const router = useRouter()
	const { isModalOpen, closeModal } = useModalStore()

	// Modal mode is enabled when a modalId is provided, regardless of CRUD mode
	// This allows any dialog (create, read, edit, delete) to be controlled by the modal store
	const isModalMode = !!modalId
	let isOpen = false
	if (isModalMode) {
		isOpen = isModalOpen(modalId)
	}

	// Track if modal was ever opened - only navigate back on close if it was opened
	// This prevents router.back() on initial mount when modal starts closed
	const wasEverOpenRef = useRef(false)
	useEffect(() => {
		if (isOpen) {
			wasEverOpenRef.current = true
		}
	}, [isOpen])

	useEffect(() => {
		// Only navigate back if:
		// 1. We're in modal mode
		// 2. Not persisting through navigation
		// 3. Modal is currently closed
		// 4. Modal was previously opened (prevents navigation on initial mount)
		if (isModalMode && !persistThroughNavigation && !isOpen && wasEverOpenRef.current) {
			router.back()
		}
	}, [isModalMode, isOpen, router, persistThroughNavigation])

	if (isModalMode) {
		return (
			<DialogPrimitive.Root
				open={isOpen}
				onOpenChange={open => {
					if (!open) {
						closeModal(modalId)
						onClose?.()
					}
				}}
				{...props}
			>
				{children}
			</DialogPrimitive.Root>
		)
	}

	// For create mode, use normal dialog behavior
	return (
		<DialogPrimitive.Root
			onOpenChange={open => {
				if (!open) {
					onClose?.()
				}
			}}
			{...props}
		>
			{children}
		</DialogPrimitive.Root>
	)
}
CrudDialog.displayName = 'CrudDialog'

// Export CrudDialog (the unique component with modal store integration)
export { CrudDialog }

// Export CrudDialogBody (the only new component)
export { CrudDialogBody }

// Re-export base components with Crud prefix aliases for consumers that prefer that naming
export {
	DialogContent as CrudDialogContent,
	DialogHeader as CrudDialogHeader,
	DialogTitle as CrudDialogTitle,
	DialogDescription as CrudDialogDescription,
	DialogFooter as CrudDialogFooter,
	DialogClose as CrudDialogClose,
	DialogOverlay as CrudDialogOverlay,
	DialogPortal as CrudDialogPortal,
	DialogTrigger as CrudDialogTrigger
}

// Also re-export with Dialog prefix for compatibility with existing imports
export {
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	DialogOverlay,
	DialogPortal,
	DialogTrigger
}

// Re-export CrudDialog as Dialog for consumers expecting that name
export { CrudDialog as Dialog }
// Re-export CrudDialogBody as DialogBody
export { CrudDialogBody as DialogBody }
