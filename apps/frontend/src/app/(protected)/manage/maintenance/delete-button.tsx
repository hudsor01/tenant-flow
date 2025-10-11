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
import { maintenanceApi } from '@/lib/api-client'
import type {
	MaintenanceRequest,
	MaintenanceRequestResponse
} from '@repo/shared/types/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface DeleteMaintenanceButtonProps {
	maintenance: {
		id: string
		title: string
	}
}

export function DeleteMaintenanceButton({
	maintenance
}: DeleteMaintenanceButtonProps) {
	const [open, setOpen] = useState(false)
	const queryClient = useQueryClient()

	const deleteMutation = useMutation({
		mutationFn: () => maintenanceApi.remove(maintenance.id),
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: ['maintenance'] })
			const previous = queryClient.getQueryData<
				MaintenanceRequestResponse | MaintenanceRequest[] | undefined
			>(['maintenance'])
			queryClient.setQueryData<
				MaintenanceRequestResponse | MaintenanceRequest[] | undefined
			>(['maintenance'], old => {
				if (!old) return old
				if (Array.isArray(old)) return old.filter(m => m.id !== maintenance.id)
				if ('data' in old)
					return { ...old, data: old.data.filter(m => m.id !== maintenance.id) }
				return old
			})
			return { previous }
		},
		onError: (
			err: unknown,
			_vars,
			context?: { previous?: MaintenanceRequestResponse | MaintenanceRequest[] }
		) => {
			if (context?.previous)
				queryClient.setQueryData(['maintenance'], context.previous)
			const message =
				err instanceof Error ? err.message : 'Failed to delete request'
			toast.error(`Failed to delete request: ${message}`)
		},
		onSuccess: () => {
			toast.success('Maintenance request deleted successfully')
			setOpen(false)
		}
	})

	const handleDelete = () => {
		deleteMutation.mutate()
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
						disabled={deleteMutation.isPending}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={deleteMutation.isPending}
					>
						{deleteMutation.isPending ? 'Deleting...' : 'Delete Request'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
