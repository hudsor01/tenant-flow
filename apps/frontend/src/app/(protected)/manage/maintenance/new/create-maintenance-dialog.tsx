'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { maintenanceApi, propertiesApi, unitsApi } from '@/lib/api-client'
import { maintenanceRequestFormSchema } from '@repo/shared/validation/maintenance'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

export function CreateMaintenanceDialog() {
	const [open, setOpen] = useState(false)
	const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
	const queryClient = useQueryClient()

	const { data: properties = [] } = useQuery({
		queryKey: ['properties'],
		queryFn: () => propertiesApi.list()
	})

	const { data: units = [] } = useQuery({
		queryKey: ['units', selectedPropertyId],
		queryFn: () => unitsApi.list(),
		enabled: !!selectedPropertyId
	})

	const form = useForm({
		defaultValues: {
			title: '',
			description: '',
			priority: 'MEDIUM',
			category: '',
			unitId: '',
			assignedTo: '',
			requestedBy: '',
			contactPhone: '',
			allowEntry: false,
			estimatedCost: '',
			photos: [] as string[],
			notes: '',
			preferredDate: ''
		},
		onSubmit: async ({ value }) => {
			createMutation.mutate(value)
		},
		validators: {
			onChange: ({ value }) => {
				const result = maintenanceRequestFormSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	const createMutation = useMutation({
		mutationFn: (data: typeof form.state.values) => {
			const payload = {
				...data,
				estimatedCost: data.estimatedCost
					? Number(data.estimatedCost)
					: undefined,
				preferredDate: data.preferredDate
					? new Date(data.preferredDate)
					: undefined
			}
			return maintenanceApi.create(payload)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
			queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] })
			toast.success('Maintenance request created successfully')
			setOpen(false)
			form.reset()
		},
		onError: error => {
			toast.error(`Failed to create request: ${error.message}`)
		}
	})

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
				<Button className="flex items-center gap-2">
					<Plus className="size-4" />
					New Request
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Create Maintenance Request</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={e => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className="space-y-4"
				>
					<Field>
						<FieldLabel htmlFor="propertyId">Property</FieldLabel>
						<Select
							value={selectedPropertyId}
							onValueChange={setSelectedPropertyId}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select property" />
							</SelectTrigger>
							<SelectContent>
								{properties.map(property => (
									<SelectItem key={property.id} value={property.id}>
										{property.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					{selectedPropertyId && units.length > 0 && (
						<form.Field name="unitId">
							{field => (
								<Field>
									<FieldLabel htmlFor="unitId">Unit (Optional)</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={value => field.handleChange(value)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select unit (optional)" />
										</SelectTrigger>
										<SelectContent>
											{units.map(unit => (
												<SelectItem key={unit.id} value={unit.id}>
													Unit {unit.unitNumber}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							)}
						</form.Field>
					)}

					<form.Field name="title">
						{field => (
							<Field>
								<FieldLabel htmlFor="title">Title</FieldLabel>
								<Input
									id="title"
									placeholder="Kitchen faucet leak"
									value={field.state.value}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
								/>
							</Field>
						)}
					</form.Field>

					<form.Field name="description">
						{field => (
							<Field>
								<FieldLabel htmlFor="description">Description</FieldLabel>
								<Textarea
									id="description"
									placeholder="Detailed description of the maintenance issue..."
									rows={3}
									value={field.state.value}
									onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
								/>
							</Field>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="category">
							{field => (
								<Field>
									<FieldLabel htmlFor="category">Category</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={value => field.handleChange(value)}
									>
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
								</Field>
							)}
						</form.Field>

						<form.Field name="priority">
							{field => (
								<Field>
									<FieldLabel htmlFor="priority">Priority</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={value => field.handleChange(value)}
									>
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
								</Field>
							)}
						</form.Field>
					</div>

					<form.Field name="estimatedCost">
						{field => (
							<Field>
								<FieldLabel htmlFor="estimatedCost">
									Estimated Cost (Optional)
								</FieldLabel>
								<Input
									id="estimatedCost"
									type="number"
									placeholder="250"
									value={field.state.value}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
								/>
							</Field>
						)}
					</form.Field>

					<form.Field name="preferredDate">
						{field => (
							<Field>
								<FieldLabel htmlFor="preferredDate">
									Preferred Date (Optional)
								</FieldLabel>
								<Input
									id="preferredDate"
									type="date"
									value={field.state.value}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
								/>
							</Field>
						)}
					</form.Field>

					<form.Field name="allowEntry">
						{field => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="allowEntry"
									className="flex items-center gap-2"
								>
									<input
										id="allowEntry"
										type="checkbox"
										checked={field.state.value}
										onChange={e => field.handleChange(e.target.checked)}
										className="rounded border border-input"
									/>
									Allow entry when tenant is not present
								</FieldLabel>
							</div>
						)}
					</form.Field>

					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending ? 'Creating...' : 'Create Request'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
