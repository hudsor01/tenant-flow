'use client'

import {
	CrudModal,
	CrudModalContent,
	CrudModalHeader,
	CrudModalTitle,
	CrudModalDescription,
	CrudModalContent as CrudModalBody,
	CrudModalFooter
} from '#components/ui/crud-modal'
import { Button } from '#components/ui/button'
import { useModalStore } from '#stores/modal-store'

interface ConfirmDialogProps {
	/**
	 * Unique modal ID for the modal store
	 */
	modalId: string
	/**
	 * Title of the confirmation dialog
	 */
	title: string
	/**
	 * Description of the action
	 */
	description: string
	/**
	 * Text for the confirm button
	 */
	confirmText?: string
	/**
	 * Variant for the confirm button
	 */
	confirmVariant?:
		| 'default'
		| 'destructive'
		| 'outline'
		| 'secondary'
		| 'ghost'
		| 'link'
	/**
	 * Callback when confirmed
	 */
	onConfirm: () => void
	/**
	 * Whether the action is loading
	 */
	loading?: boolean
}

/**
 * ConfirmDialog - Reusable confirmation dialog using CrudModal (safe for nesting)
 */
export function ConfirmDialog({
	modalId,
	title,
	description,
	confirmText = 'Confirm',
	confirmVariant = 'destructive',
	onConfirm,
	loading = false
}: ConfirmDialogProps) {
	const { closeModal } = useModalStore()

	const handleConfirm = () => {
		onConfirm()
		closeModal(modalId)
	}

	const handleCancel = () => {
		closeModal(modalId)
	}

	return (
		<CrudModal mode="delete" modalId={modalId}>
			<CrudModalContent className="sm:max-w-md">
				<CrudModalHeader>
					<CrudModalTitle>{title}</CrudModalTitle>
					<CrudModalDescription>{description}</CrudModalDescription>
				</CrudModalHeader>
				<CrudModalBody>
					<p className="text-sm text-muted-foreground">
						This action cannot be undone.
					</p>
				</CrudModalBody>
				<CrudModalFooter>
					<Button variant="outline" onClick={handleCancel} disabled={loading}>
						Cancel
					</Button>
					<Button
						variant={confirmVariant}
						onClick={handleConfirm}
						disabled={loading}
					>
						{loading ? 'Processing...' : confirmText}
					</Button>
				</CrudModalFooter>
			</CrudModalContent>
		</CrudModal>
	)
}
