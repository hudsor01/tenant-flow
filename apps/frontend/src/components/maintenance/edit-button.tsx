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
	type MaintenancePriorityValidation,
	type MaintenanceRequestUpdate
} from '@repo/shared/validation/maintenance'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface EditMaintenanceButtonProps {
	maintenance: {
		id: string
		title: string
		description: string
		priority: string
		category: string | null
		estimatedCost?: number | null
		notes?: string | null
		preferredDate?: string | null
		allowEntry?: boolean | null
	}
}

export function EditMaintenanceButton({
	maintenance
}: EditMaintenanceButtonProps) {
	const [open, setOpen] = useState(false)
	const queryClient = useQueryClient()

	const form = useForm({
		resolver: zodResolver(maintenanceRequestUpdateSchema),
		defaultValues: {
			title: maintenance.title,
			description: maintenance.description,
			priority: maintenance.priority as MaintenancePriorityValidation,
			category: maintenance.category || '',
			estimatedCost: maintenance.estimatedCost || undefined,
			notes: maintenance.notes || '',
			preferredDate: maintenance.preferredDate || '',
			allowEntry: maintenance.allowEntry || false
		}
	})

	const updateMutation = useMutation({
		mutationFn: (data: MaintenanceRequestUpdate) =>
			maintenanceApi.update(maintenance.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['maintenance'] })
			queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] })
			toast.success('Maintenance request updated successfully')
			setOpen(false)
			form.reset()
		},
		onError: error => {
			toast.error(`Failed to update request: ${error.message}`)
		}
	})

	const onSubmit = (data: MaintenanceRequestUpdate) => {
		const updateData = {
			...data
		}
		updateMutation.mutate(updateData)
	}

	const categories = [
		'Plumbing',
		'Electrical',
		'HVAC',
		'Appliances',
		'Flooring',
		'Painting',
		'Cleaning',
		'Landscaping',
		'Security',
		'Other'
	]

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="flex items-center gap-2">
					<Edit className="size-4" />
					Edit
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit Maintenance Request</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={form.handleSubmit(data =>
						onSubmit(data as MaintenanceRequestUpdate)
					)}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="title">Title</Label>
						<Input
							id="title"
							{...form.register('title')}
							placeholder="Kitchen faucet leak"
						/>
						{form.formState.errors.title && (
							<p className="text-sm text-[var(--color-system-red)]">
								{form.formState.errors.title.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							{...form.register('description')}
							placeholder="Detailed description of the maintenance issue..."
							rows={3}
						/>
						{form.formState.errors.description && (
							<p className="text-sm text-[var(--color-system-red)]">
								{form.formState.errors.description.message}
							</p>
						)}
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="category">Category</Label>
							<Controller
								name="category"
								control={form.control}
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger>
											<SelectValue placeholder="Select category" />
										</SelectTrigger>
										<SelectContent>
											{categories.map(category => (
												<SelectItem key={category} value={category}>
													{category}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="priority">Priority</Label>
							<Controller
								name="priority"
								control={form.control}
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="LOW">Low</SelectItem>
											<SelectItem value="MEDIUM">Medium</SelectItem>
											<SelectItem value="HIGH">High</SelectItem>
											<SelectItem value="EMERGENCY">Emergency</SelectItem>
										</SelectContent>
									</Select>
								)}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="estimatedCost">Estimated Cost (Optional)</Label>
						<Input
							id="estimatedCost"
							type="number"
							{...form.register('estimatedCost', { valueAsNumber: true })}
							placeholder="250"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="preferredDate">Preferred Date (Optional)</Label>
						<Input
							id="preferredDate"
							type="date"
							{...form.register('preferredDate')}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="notes">Notes (Optional)</Label>
						<Textarea
							id="notes"
							{...form.register('notes')}
							placeholder="Additional notes..."
							rows={2}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="allowEntry" className="flex items-center gap-2">
							<input
								id="allowEntry"
								type="checkbox"
								{...form.register('allowEntry')}
								className="rounded border border-input"
							/>
							Allow entry when tenant is not present
						</Label>
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
							{updateMutation.isPending ? 'Updating...' : 'Update Request'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
