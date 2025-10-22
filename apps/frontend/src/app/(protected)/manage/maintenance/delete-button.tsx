'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

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
	const [open, setOpen] = useState(false)
	const [isPending, startTransition] = useTransition()

	const handleDelete = () => {
		startTransition(async () => {
			try {
				await deleteAction(maintenance.id)
				toast.success('Maintenance request deleted successfully')
				setOpen(false)
			} catch {
				toast.error('Failed to delete request')
			}
		})
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="flex items-center gap-2 text-[var(--color-system-red)] hover:text-[var(--color-system-red-85)]"
				>
					<Trash2 className="size-4" />
					Delete
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Maintenance Request</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this maintenance request? This
						action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<p className="text-sm text-[var(--color-label-secondary)]">
						<strong>Request:</strong> {maintenance.title}
					</p>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={isPending}
					>
						{isPending ? 'Deleting...' : 'Delete Request'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
