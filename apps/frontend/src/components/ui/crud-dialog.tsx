'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { cn } from '#lib/utils'
import { useModalStore } from '#stores/modal-store'
import { Dialog } from '#components/ui/dialog'

export type CrudMode = 'create' | 'read' | 'edit' | 'delete'

export interface CrudDialogProps
	extends React.ComponentProps<typeof DialogPrimitive.Root> {
	mode: CrudMode
	modalId?: string
	onClose?: () => void
	persistThroughNavigation?: boolean
}

export function CrudDialog({
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

export function CrudDialogBody({ className, ...props }: React.ComponentProps<'div'>) {
	return <div className={cn('space-y-4', className)} {...props} />
}
