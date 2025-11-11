'use client'

import { Button } from '#components/ui/button'
import { ConfirmDialog } from '#components/ui/confirm-dialog'
import { Trash2 } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { handleMutationError } from '#lib/mutation-error-handler'
import { useModalStore } from '#stores/modal-store'

interface DeleteMaintenanceButtonProps {
	maintenance: {
		id: string
		title: string
	}
	deleteAction: (id: string) => Promise<{ success: boolean }>
}

export function DeleteMaintenanceButton({
	maintenance,
	deleteAction
}: DeleteMaintenanceButtonProps) {
	const { openModal } = useModalStore()
	const [isPending, startTransition] = useTransition()

	const modalId = `delete-maintenance-${maintenance.id}`

	const handleDelete = () => {
		startTransition(async () => {
			try {
				await deleteAction(maintenance.id)
				toast.success('Maintenance request deleted successfully')
			} catch (error) {
				handleMutationError(error, 'Delete maintenance request')
			}
		})
	}

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				className="flex items-center gap-2 text-(--color-system-red) hover:text-(--color-system-red-85)"
				onClick={() => openModal(modalId)}
			>
				<Trash2 className="size-4" />
				Delete
			</Button>

			<ConfirmDialog
				modalId={modalId}
				title="Delete Maintenance Request"
				description={`Are you sure you want to delete "${maintenance.title}"? This action cannot be undone.`}
				confirmText="Delete Request"
				confirmVariant="destructive"
				onConfirm={handleDelete}
				loading={isPending}
			/>
		</>
	)
}
