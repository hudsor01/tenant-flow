'use client'

import {
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter
} from '#components/ui/dialog'
import { CrudDialog, CrudDialogBody } from '#components/ui/crud-dialog'
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
 * ConfirmDialog - Reusable confirmation dialog using CrudDialog (safe for nesting)
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
		<CrudDialog mode="delete" modalId={modalId}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<CrudDialogBody>
					<p className="text-muted">
						This action cannot be undone.
					</p>
				</CrudDialogBody>
				<DialogFooter>
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
				</DialogFooter>
			</DialogContent>
		</CrudDialog>
	)
}
