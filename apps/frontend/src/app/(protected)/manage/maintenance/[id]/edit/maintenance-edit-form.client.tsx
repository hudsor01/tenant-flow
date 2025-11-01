'use client'

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
import {
	useMaintenanceRequest,
	useUpdateMaintenanceRequest
} from '#hooks/api/use-maintenance'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { maintenanceRequestFormSchema } from '@repo/shared/validation/maintenance'
import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { z } from 'zod'

interface MaintenanceEditFormProps {
	id: string
}

const logger = createLogger({ component: 'MaintenanceEditForm' })

export function MaintenanceEditForm({ id }: MaintenanceEditFormProps) {
	const router = useRouter()
	const [step, setStep] = useState(1)
	const totalSteps = 2
	const updateMaintenanceRequest = useUpdateMaintenanceRequest()

	const { data: request, isLoading, isError } = useMaintenanceRequest(id)

	const { data: properties = [] } = useQuery({
		queryKey: ['properties'],
		queryFn: async () => {
			const res = await fetch('/api/v1/properties', { credentials: 'include' })
			if (!res.ok) throw new Error('Failed to fetch properties')
			return res.json()
		}
	})

	const { data: units = [] } = useQuery({
		queryKey: ['units'],
		queryFn: async () => {
			const res = await fetch('/api/v1/units', { credentials: 'include' })
			if (!res.ok) throw new Error('Failed to fetch units')
			return res.json()
		}
	})

	const [selectedPropertyId, setSelectedPropertyId] = useState('')

	useEffect(() => {
		// Get property ID from the request's unit
		if (request?.unitId) {
			const unit = units.find((u: import('@repo/shared/types/core').Unit) => u.id === request.unitId)
			if (unit?.propertyId) {
				queueMicrotask(() => {
					setSelectedPropertyId(unit.propertyId)
				})
			}
		}
	}, [request?.unitId, units])

	const availableUnits = useMemo(() => {
		if (!selectedPropertyId) return []
		return units.filter((unit: import('@repo/shared/types/core').Unit) => unit.propertyId === selectedPropertyId)
	}, [selectedPropertyId, units])

	const form = useForm({
		defaultValues: {
			title: '',
			description: '',
			priority: 'MEDIUM',
			category: '',
			unitId: '',
			requestedBy: '',
			contactPhone: '',
			estimatedCost: '',
			preferredDate: ''
		},
		onSubmit: async ({ value }) => {
			const payload: Record<string, unknown> = {}

			if (value.title) payload.title = value.title
			if (value.description) payload.description = value.description
			if (value.priority)
				payload.priority = value.priority as
					| 'LOW'
					| 'MEDIUM'
					| 'HIGH'
					| 'URGENT'
			if (value.category) payload.category = value.category
			if (value.estimatedCost)
				payload.estimatedCost = Number.parseFloat(value.estimatedCost)
			if (value.preferredDate)
				payload.preferredDate = new Date(value.preferredDate)

			updateMaintenanceRequest.mutate(
				{ id, data: payload },
				{
					onSuccess: () => {
						router.push(`/manage/maintenance/${id}`)
					},
					onError: error => {
						logger.error(
							'Failed to update maintenance request',
							{ action: 'updateMaintenanceRequest' },
							error
						)
					}
				}
			)
		},
		validators: {
			onChange: ({ value }) => {
				const result = maintenanceRequestFormSchema.safeParse({
					...request,
					...value
				})
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	useEffect(() => {
		if (request) {
			form.reset({
				title: request.title || '',
				description: request.description || '',
				priority: request.priority || 'MEDIUM',
				category: request.category || '',
				unitId: request.unitId || '',
				requestedBy: request.requestedBy || '',
				contactPhone: request.contactPhone || '',
				estimatedCost: request.estimatedCost
					? String(request.estimatedCost)
					: '',
				preferredDate: request.preferredDate
					? request.preferredDate.slice(0, 10)
					: ''
			})
			// Get property ID from unit
			const unit = units.find((u: import('@repo/shared/types/core').Unit) => u.id === request.unitId)
			if (unit?.propertyId) {
				queueMicrotask(() => {
					setSelectedPropertyId(unit.propertyId)
				})
			}
		}
	}, [request, form, units])

	if (isLoading) {
		return (
			<div className="animate-pulse text-muted-foreground">
				Loading request...
			</div>
		)
	}

	if (isError || !request) {
		return (
			<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
				Unable to load maintenance request.
			</div>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-xl font-semibold">
					Edit maintenance request
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Update request details, priority, and scheduling information.
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
					{step === 1 && (
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
										{properties.map((property: import('@repo/shared/types/core').Property) => (
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
												{availableUnits.map((unit: import('@repo/shared/types/core').Unit) => (
													<SelectItem key={unit.id} value={unit.id}>
														Unit {unit.unitNumber}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{field.state.meta.errors?.length ? (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										) : null}
									</Field>
								)}
							</form.Field>

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
												<SelectItem value="LOW">Low</SelectItem>
												<SelectItem value="MEDIUM">Medium</SelectItem>
												<SelectItem value="HIGH">High</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>
						</div>
					)}

					{step === 2 && (
						<div className="grid gap-4 md:grid-cols-2">
							<form.Field name="title">
								{field => (
									<Field className="md:col-span-2">
										<FieldLabel htmlFor="title">Title</FieldLabel>
										<Input
											id="title"
											value={field.state.value}
											onChange={(event: ChangeEvent<HTMLInputElement>) =>
												field.handleChange(event.target.value)
											}
											placeholder="Brief summary"
											autoComplete="off"
										/>
										{field.state.meta.errors?.length ? (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										) : null}
									</Field>
								)}
							</form.Field>

							<form.Field name="description">
								{field => (
									<Field className="md:col-span-2">
										<FieldLabel htmlFor="description">Description</FieldLabel>
										<Textarea
											id="description"
											rows={4}
											value={field.state.value}
											onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
												field.handleChange(event.target.value)
											}
											placeholder="Detailed description"
										/>
										{field.state.meta.errors?.length ? (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										) : null}
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
												<SelectItem value="Plumbing">Plumbing</SelectItem>
												<SelectItem value="Electrical">Electrical</SelectItem>
												<SelectItem value="HVAC">HVAC</SelectItem>
												<SelectItem value="Appliances">Appliances</SelectItem>
												<SelectItem value="Cleaning">Cleaning</SelectItem>
												<SelectItem value="Other">Other</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>

							<form.Field name="preferredDate">
								{field => (
									<Field>
										<FieldLabel htmlFor="preferredDate">
											Preferred date
										</FieldLabel>
										<Input
											id="preferredDate"
											type="date"
											value={field.state.value}
											onChange={(event: ChangeEvent<HTMLInputElement>) =>
												field.handleChange(event.target.value)
											}
										/>
									</Field>
								)}
							</form.Field>

							<form.Field name="contactPhone">
								{field => (
									<Field>
										<FieldLabel htmlFor="contactPhone">
											Contact phone
										</FieldLabel>
										<Input
											id="contactPhone"
											value={field.state.value}
											onChange={(event: ChangeEvent<HTMLInputElement>) =>
												field.handleChange(event.target.value)
											}
										/>
									</Field>
								)}
							</form.Field>

							<form.Field name="estimatedCost">
								{field => (
									<Field>
										<FieldLabel htmlFor="estimatedCost">
											Estimated cost
										</FieldLabel>
										<Input
											id="estimatedCost"
											type="number"
											min={0}
											step={0.01}
											value={field.state.value}
											onChange={(event: ChangeEvent<HTMLInputElement>) =>
												field.handleChange(event.target.value)
											}
										/>
									</Field>
								)}
							</form.Field>
						</div>
					)}

					<div className="flex items-center justify-between border-t pt-6">
						<Button
							type="button"
							variant="outline"
							size="lg"
							onClick={() => setStep(prev => Math.max(1, prev - 1))}
							disabled={step === 1}
						>
							<ChevronLeft className="size-4" />
							Previous
						</Button>
						{step === totalSteps ? (
							<Button
								type="submit"
								size="lg"
								disabled={updateMaintenanceRequest.isPending}
							>
								{updateMaintenanceRequest.isPending
									? 'Saving...'
									: 'Save changes'}
							</Button>
						) : (
							<Button
								type="button"
								size="lg"
								onClick={() => setStep(prev => Math.min(totalSteps, prev + 1))}
							>
								Next
								<ChevronRight className="size-4" />
							</Button>
						)}
					</div>
				</form>
			</CardContent>
		</Card>
	)
}
