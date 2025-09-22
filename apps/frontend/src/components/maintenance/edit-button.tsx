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
import type { MaintenanceRequestUpdate } from '@repo/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const updateMaintenanceSchema = z.object({
	title: z
		.string()
		.min(5, 'Title must be at least 5 characters')
		.max(200, 'Title cannot exceed 200 characters')
		.optional(),
	description: z
		.string()
		.min(10, 'Description must be at least 10 characters')
		.max(2000, 'Description cannot exceed 2000 characters')
		.optional(),
	priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']).optional(),
	category: z.string().optional(),
	estimatedCost: z.number().optional(),
	notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
	scheduledDate: z.string().optional(),
	accessInstructions: z
		.string()
		.max(500, 'Access instructions cannot exceed 500 characters')
		.optional()
})

type UpdateMaintenanceFormData = z.infer<typeof updateMaintenanceSchema>

interface EditMaintenanceButtonProps {
	maintenance: {
		id: string
		title: string
		description: string
		priority: string
		category: string
		estimatedCost?: number
		notes?: string
		scheduledDate?: string
		accessInstructions?: string
	}
}

export function EditMaintenanceButton({
	maintenance
}: EditMaintenanceButtonProps) {
	const [open, setOpen] = useState(false)
	const queryClient = useQueryClient()

	const form = useForm<UpdateMaintenanceFormData>({
		resolver: zodResolver(updateMaintenanceSchema),
		defaultValues: {
			title: maintenance.title,
			description: maintenance.description,
			priority: maintenance.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY',
			category: maintenance.category,
			estimatedCost: maintenance.estimatedCost,
			notes: maintenance.notes || '',
			scheduledDate: maintenance.scheduledDate || '',
			accessInstructions: maintenance.accessInstructions || ''
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

	const onSubmit = (data: UpdateMaintenanceFormData) => {
		const updateData = {
			...data,
			scheduledDate:
				data.scheduledDate && data.scheduledDate.trim() !== ''
					? data.scheduledDate
					: undefined
		}
		updateMutation.mutate(updateData as MaintenanceRequestUpdate)
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
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
						<Label htmlFor="scheduledDate">Scheduled Date (Optional)</Label>
						<Input
							id="scheduledDate"
							type="date"
							{...form.register('scheduledDate')}
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
						<Label htmlFor="accessInstructions">
							Access Instructions (Optional)
						</Label>
						<Textarea
							id="accessInstructions"
							{...form.register('accessInstructions')}
							placeholder="How to access the unit/area..."
							rows={2}
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
							{updateMutation.isPending ? 'Updating...' : 'Update Request'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
