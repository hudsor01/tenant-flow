'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { maintenanceApi } from '@/lib/api-client'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	maintenanceRequestUpdateSchema,
	type MaintenanceRequestUpdate,
	type MaintenanceStatusValidation
} from '@repo/shared/validation/maintenance'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface StatusUpdateButtonProps {
	maintenance: {
		id: string
		title: string
		status: string
	}
}

export function StatusUpdateButton({ maintenance }: StatusUpdateButtonProps) {
	const [open, setOpen] = useState(false)
	const queryClient = useQueryClient()

	const form = useForm({
		resolver: zodResolver(maintenanceRequestUpdateSchema),
		defaultValues: {
			status: maintenance.status as MaintenanceStatusValidation,
			actualCost: undefined,
			notes: ''
		}
	})

	const updateMutation = useMutation({
		mutationFn: async (data: MaintenanceRequestUpdate) => {
			if (data.status === 'COMPLETED') {
				return maintenanceApi.complete(
					maintenance.id,
					data.actualCost,
					data.notes
				)
			} else if (data.status === 'CANCELED') {
				return maintenanceApi.cancel(maintenance.id, data.notes)
			} else {
				return maintenanceApi.update(maintenance.id, data)
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['maintenance'] })
			queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] })
			toast.success('Status updated successfully')
			setOpen(false)
			form.reset()
		},
		onError: error => {
			toast.error(`Failed to update status: ${error.message}`)
		}
	})

	const onSubmit = (data: MaintenanceRequestUpdate) => {
		updateMutation.mutate(data)
	}

	const selectedStatus = form.watch('status')

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="flex items-center gap-2">
					<Settings className="size-4" />
					Update Status
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Update Status</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={form.handleSubmit(data =>
						onSubmit(data as MaintenanceRequestUpdate)
					)}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="status">Status</Label>
						<Controller
							name="status"
							control={form.control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="OPEN">Open</SelectItem>
										<SelectItem value="IN_PROGRESS">In Progress</SelectItem>
										<SelectItem value="COMPLETED">Completed</SelectItem>
										<SelectItem value="CANCELED">Canceled</SelectItem>
										<SelectItem value="ON_HOLD">On Hold</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>
					</div>

					{(selectedStatus === 'COMPLETED' ||
						selectedStatus === 'IN_PROGRESS') && (
						<div className="space-y-2">
							<Label htmlFor="actualCost">Actual Cost (Optional)</Label>
							<Input
								id="actualCost"
								type="number"
								{...form.register('actualCost', { valueAsNumber: true })}
								placeholder="Enter actual cost"
							/>
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="notes">
							{selectedStatus === 'COMPLETED'
								? 'Completion Notes'
								: selectedStatus === 'CANCELED'
									? 'Cancellation Reason'
									: 'Notes'}{' '}
							(Optional)
						</Label>
						<Textarea
							id="notes"
							{...form.register('notes')}
							placeholder={
								selectedStatus === 'COMPLETED'
									? 'Work completed details...'
									: selectedStatus === 'CANCELED'
										? 'Reason for cancellation...'
										: 'Additional notes...'
							}
							rows={3}
						/>
					</div>

					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending ? 'Updating...' : 'Update Status'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
