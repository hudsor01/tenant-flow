'use client'

import { Button } from '#components/ui/button'
import { ConfirmDialog } from '#components/ui/confirm-dialog'
import { Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { handleMutationError } from '#lib/mutation-error-handler'

interface DeleteMaintenanceButtonProps {
	maintenance: {
		id: string
		description: string
	}
	deleteAction: (id: string) => Promise<{ success: boolean }>
}

export function DeleteMaintenanceButton({
	maintenance,
	deleteAction
}: DeleteMaintenanceButtonProps) {
	const [open, setOpen] = useState(false)
	const [isPending, startTransition] = useTransition()

	const handleDelete = () => {
		startTransition(async () => {
			try {
				await deleteAction(maintenance.id)
				toast.success('Maintenance request deleted successfully')
				setOpen(false)
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
				className="flex items-center gap-2 text-(--color-destructive) hover:text-(--color-destructive-85)"
				onClick={() => setOpen(true)}
			>
				<Trash2 className="size-4" />
				Delete
			</Button>

			<ConfirmDialog
				open={open}
				onOpenChange={setOpen}
				title="Delete Maintenance Request"
				description={`Are you sure you want to delete "${maintenance.description}"? This action cannot be undone.`}
				confirmText="Delete Request"
				confirmVariant="destructive"
				onConfirm={handleDelete}
				loading={isPending}
			/>
		</>
	)
}
