'use client'

import { useQuery } from '@tanstack/react-query'
import { Wrench } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type ChangeEvent } from 'react'

import { Button } from '#components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Textarea } from '#components/ui/textarea'
import { clientFetch } from '#lib/api/client'
import { useCreateMaintenanceRequest } from '#hooks/api/use-maintenance'

import { maintenanceRequestFormSchema } from '@repo/shared/validation/maintenance'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import type { Property, Unit } from '@repo/shared/types/core'

const PRIORITY_OPTIONS = [
	{ label: 'Low', value: 'LOW' },
	{ label: 'Medium', value: 'MEDIUM' },
	{ label: 'High', value: 'HIGH' }
]

const CATEGORY_OPTIONS = [
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

export function CreateMaintenanceForm() {
	const router = useRouter()
	const [selectedPropertyId, setSelectedPropertyId] = useState('')
	const createMaintenanceRequest = useCreateMaintenanceRequest()

	const { data: properties = [] } = useQuery({
		queryKey: ['properties'],
		queryFn: () => clientFetch<Property[]>('/api/v1/properties')
	})

	const { data: units = [] } = useQuery({
		queryKey: ['units'],
		queryFn: () => clientFetch<Unit[]>('/api/v1/units')
	})

	const availableUnits = useMemo(() => {
		if (!selectedPropertyId) return []
		return units.filter((unit) => unit.propertyId === selectedPropertyId)
	}, [selectedPropertyId, units])

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
			const payload = {
				title: value.title,
				description: value.description,
				unitId: value.unitId,
				...(value.priority && {
					priority: value.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
				}),
				...(value.category && {
					category: value.category as
						| 'HVAC'
						| 'GENERAL'
						| 'PLUMBING'
						| 'ELECTRICAL'
						| 'APPLIANCES'
						| 'SAFETY'
						| 'OTHER'
				}),
				...(value.estimatedCost && {
					estimatedCost: Number.parseFloat(value.estimatedCost)
				}),
				...(value.preferredDate && { scheduledDate: value.preferredDate })
			}

			createMaintenanceRequest.mutate(payload, {
				onSuccess: () => {
					form.reset()
					setSelectedPropertyId('')
					router.push('/manage/maintenance')
				}
			})
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

	return (
		<Card>
			<CardHeader className="space-y-2">
				<CardTitle className="flex items-center gap-2 text-xl font-semibold">
					<Wrench className="size-5 text-primary" />
					New maintenance request
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Log maintenance issues, assign priority, and track resolution details.
				</p>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={event => {
						event.preventDefault()
						form.handleSubmit()
					}}
					className="space-y-6"
				>
					<div className="grid gap-4 md:grid-cols-2">
						<Field>
							<FieldLabel htmlFor="property">Property</FieldLabel>
							<Select
								value={selectedPropertyId}
								onValueChange={value => setSelectedPropertyId(value)}
							>
								<SelectTrigger id="property">
									<SelectValue placeholder="Select property" />
								</SelectTrigger>
								<SelectContent>
									{properties.map((property) => (
										<SelectItem key={property.id} value={property.id}>
											{property.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>

						<form.Field name="unitId">
							{field => (
								<Field>
									<FieldLabel htmlFor="unitId">Unit (optional)</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={field.handleChange}
										disabled={!selectedPropertyId || !availableUnits.length}
									>
										<SelectTrigger id="unitId">
											<SelectValue placeholder="Select unit" />
										</SelectTrigger>
										<SelectContent>
											{availableUnits.map((unit) => (
												<SelectItem key={unit.id} value={unit.id}>
													Unit {unit.unitNumber}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							)}
						</form.Field>
					</div>

					<form.Field name="title">
						{field => (
							<Field>
								<FieldLabel htmlFor="title">Title</FieldLabel>
								<Input
									id="title"
									placeholder="Kitchen faucet leak"
									value={field.state.value}
									onChange={(event: ChangeEvent<HTMLInputElement>) =>
										field.handleChange(event.target.value)
									}
									onBlur={field.handleBlur}
								/>
								{field.state.meta.errors?.length ? (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								) : null}
							</Field>
						)}
					</form.Field>

					<form.Field name="description">
						{field => (
							<Field>
								<FieldLabel htmlFor="description">Description</FieldLabel>
								<Textarea
									id="description"
									placeholder="Describe the maintenance issue..."
									rows={4}
									value={field.state.value}
									onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
										field.handleChange(event.target.value)
									}
									onBlur={field.handleBlur}
								/>
								{field.state.meta.errors?.length ? (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								) : null}
							</Field>
						)}
					</form.Field>

					<div className="grid gap-4 md:grid-cols-2">
						<form.Field name="priority">
							{field => (
								<Field>
									<FieldLabel htmlFor="priority">Priority</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={field.handleChange}
									>
										<SelectTrigger id="priority">
											<SelectValue placeholder="Select priority" />
										</SelectTrigger>
										<SelectContent>
											{PRIORITY_OPTIONS.map(option => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							)}
						</form.Field>

						<form.Field name="category">
							{field => (
								<Field>
									<FieldLabel htmlFor="category">Category</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={field.handleChange}
									>
										<SelectTrigger id="category">
											<SelectValue placeholder="Select category" />
										</SelectTrigger>
										<SelectContent>
											{CATEGORY_OPTIONS.map(option => (
												<SelectItem key={option} value={option}>
													{option}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							)}
						</form.Field>
					</div>

					<form.Field name="preferredDate">
						{field => (
							<Field>
								<FieldLabel htmlFor="preferredDate">Preferred date</FieldLabel>
								<Input
									id="preferredDate"
									type="date"
									value={field.state.value}
									onChange={(event: ChangeEvent<HTMLInputElement>) =>
										field.handleChange(event.target.value)
									}
									onBlur={field.handleBlur}
								/>
							</Field>
						)}
					</form.Field>

					<form.Field name="contactPhone">
						{field => (
							<Field>
								<FieldLabel htmlFor="contactPhone">Contact phone</FieldLabel>
								<Input
									id="contactPhone"
									placeholder="(555) 123-4567"
									value={field.state.value}
									onChange={(event: ChangeEvent<HTMLInputElement>) =>
										field.handleChange(event.target.value)
									}
								/>
							</Field>
						)}
					</form.Field>

					<div className="flex justify-end border-t pt-6">
						<Button
							type="submit"
							size="lg"
							disabled={createMaintenanceRequest.isPending}
						>
							{createMaintenanceRequest.isPending
								? 'Submitting...'
								: 'Create request'}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	)
}
