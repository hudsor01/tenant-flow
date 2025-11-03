'use client'

import { useEffect, useMemo, useState } from 'react'
import { Wrench } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
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
	maintenanceKeys,
	useCreateMaintenanceRequest,
	useUpdateMaintenanceRequest
} from '#hooks/api/use-maintenance'
import { clientFetch } from '#lib/api/client'
import type { CreateMaintenanceRequest, UpdateMaintenanceRequest } from '@repo/shared/types/backend-domain'
import type { MaintenanceRequest, Property, Unit } from '@repo/shared/types/core'
import { useQueryClient } from '@tanstack/react-query'

const PRIORITY_OPTIONS = [
	{ label: 'Low', value: 'LOW' },
	{ label: 'Medium', value: 'MEDIUM' },
	{ label: 'High', value: 'HIGH' },
	{ label: 'Urgent', value: 'URGENT' }
] as const

const CATEGORY_OPTIONS = [
	{ label: 'Plumbing', value: 'PLUMBING' },
	{ label: 'Electrical', value: 'ELECTRICAL' },
	{ label: 'HVAC', value: 'HVAC' },
	{ label: 'Appliances', value: 'APPLIANCES' },
	{ label: 'Safety', value: 'SAFETY' },
	{ label: 'General', value: 'GENERAL' },
	{ label: 'Other', value: 'OTHER' }
] as const

type PriorityValue = (typeof PRIORITY_OPTIONS)[number]['value']

interface MaintenanceFormProps {
	mode: 'create' | 'edit'
	request?: MaintenanceRequest
	onSuccess?: (requestId: string) => void
}

type MaintenanceRequestWithExtras = MaintenanceRequest & {
	propertyId?: string | null
	preferredDate?: string | null
}

type FormState = {
	propertyId: string
	unitId: string
	title: string
	description: string
	priority: PriorityValue
	category: string
	estimatedCost: string
	preferredDate: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

export function MaintenanceForm({ mode, request, onSuccess }: MaintenanceFormProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const createRequest = useCreateMaintenanceRequest()
	const updateRequest = useUpdateMaintenanceRequest()

	const extendedRequest = request as MaintenanceRequestWithExtras | undefined
	const [properties, setProperties] = useState<Property[]>([])
	const [units, setUnits] = useState<Unit[]>([])
	const [errors, setErrors] = useState<FormErrors>({})

	const [formState, setFormState] = useState<FormState>(() => {
		const preferredDate = extendedRequest?.preferredDate ?? null

		return {
			propertyId: extendedRequest?.propertyId ?? '',
			unitId: extendedRequest?.unitId ?? '',
			title: extendedRequest?.title ?? '',
			description: extendedRequest?.description ?? '',
			priority: (extendedRequest?.priority as PriorityValue) ?? 'MEDIUM',
			category: extendedRequest?.category ?? '',
			estimatedCost:
				extendedRequest?.estimatedCost !== null &&
				extendedRequest?.estimatedCost !== undefined
					? String(extendedRequest.estimatedCost)
					: '',
			preferredDate: preferredDate ? preferredDate.slice(0, 10) : ''
		}
	})

	useEffect(() => {
		if (mode === 'edit' && extendedRequest) {
			const preferredDate = extendedRequest.preferredDate ?? null

			setFormState({
				propertyId: extendedRequest.propertyId ?? '',
				unitId: extendedRequest.unitId ?? '',
				title: extendedRequest.title ?? '',
				description: extendedRequest.description ?? '',
				priority: (extendedRequest.priority as PriorityValue) ?? 'MEDIUM',
				category: extendedRequest.category ?? '',
				estimatedCost:
					extendedRequest.estimatedCost !== null &&
					extendedRequest.estimatedCost !== undefined
						? String(extendedRequest.estimatedCost)
						: '',
				preferredDate: preferredDate ? preferredDate.slice(0, 10) : ''
			})

			queryClient.setQueryData(
				maintenanceKeys.detail(extendedRequest.id),
				extendedRequest
			)
		}
	}, [extendedRequest, mode, queryClient])

	useEffect(() => {
		let isActive = true

		async function fetchProperties() {
			try {
				const data = await clientFetch<Property[]>('/api/v1/properties')
				if (!isActive) return
				setProperties(Array.isArray(data) ? data : [])
			} catch (error) {
				if (!isActive) return
				console.error('Failed to load properties', error)
				setProperties([])
			}
		}

		fetchProperties()

		return () => {
			isActive = false
		}
	}, [])

	useEffect(() => {
		let isActive = true

		async function fetchUnits() {
			try {
				const data = await clientFetch<Unit[]>('/api/v1/units')
				if (!isActive) return
				setUnits(Array.isArray(data) ? data : [])
			} catch (error) {
				if (!isActive) return
				console.error('Failed to load units', error)
				setUnits([])
			}
		}

		fetchUnits()

		return () => {
			isActive = false
		}
	}, [])

	const availableUnits = useMemo(() => {
		if (!formState.propertyId) {
			return []
		}

		return units.filter(unit => unit.propertyId === formState.propertyId)
	}, [formState.propertyId, units])

	const isUnitDisabled =
		!formState.propertyId || availableUnits.length === 0

	const isSubmitting =
		mode === 'create' ? createRequest.isPending : updateRequest.isPending

	const submitLabel =
		mode === 'create'
			? isSubmitting
				? 'Creating...'
				: 'Create Request'
			: isSubmitting
				? 'Saving...'
				: 'Save Changes'

	const headerTitle =
		mode === 'create' ? 'New Maintenance Request' : 'Edit Maintenance Request'
	const headerDescription =
		mode === 'create'
			? 'Log maintenance issues, assign priority, and track resolution details'
			: 'Update maintenance details and priority settings'

	const validate = (): FormErrors => {
		const nextErrors: FormErrors = {}

		if (!formState.propertyId) {
			nextErrors.propertyId = 'Property is required'
		}

		// unitId is optional - users can create property-level maintenance requests

		if (!formState.title.trim()) {
			nextErrors.title = 'Title is required'
		}

		if (!formState.description.trim()) {
			nextErrors.description = 'Description is required'
		}

		if (!formState.priority) {
			nextErrors.priority = 'Priority is required'
		}

		return nextErrors
	}

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const validationErrors = validate()
		setErrors(validationErrors)

		if (Object.keys(validationErrors).length > 0) {
			return
		}

		try {
			if (mode === 'create') {
				const payload = {
					unitId: formState.unitId || undefined,
					title: formState.title.trim(),
					description: formState.description.trim(),
					priority: formState.priority,
					...(formState.category
						? {
								category: formState.category as CreateMaintenanceRequest['category']
							}
						: {}),
					...(formState.preferredDate
						? { scheduledDate: formState.preferredDate }
						: {}),
					...(formState.estimatedCost
						? { estimatedCost: parseFloat(formState.estimatedCost) }
						: {})
				} as CreateMaintenanceRequest

				const result = await createRequest.mutateAsync(payload)

				toast.success('Maintenance request created')

				setFormState({
					propertyId: '',
					unitId: '',
					title: '',
					description: '',
					priority: 'MEDIUM',
					category: '',
					estimatedCost: '',
					preferredDate: ''
				})
				setErrors({})

				onSuccess?.(result.id)
				} else if (mode === 'edit' && request) {
					const payload = {
						title: formState.title.trim(),
						description: formState.description.trim(),
						priority: formState.priority,
						...(formState.category
							? {
									category: formState.category as UpdateMaintenanceRequest['category']
								}
							: {}),
						...(formState.preferredDate
							? { scheduledDate: formState.preferredDate }
							: {}),
						...(formState.estimatedCost
							? { estimatedCost: parseFloat(formState.estimatedCost) }
							: {})
					} as UpdateMaintenanceRequest

				await updateRequest.mutateAsync({
					id: request.id,
					data: payload,
					version: request.version
				})

				toast.success('Maintenance request updated')

				onSuccess?.(request.id)

				if (!onSuccess) {
					router.back()
				}
			}
		} catch (error) {
			const action = mode === 'create' ? 'create' : 'update'
			console.error(`Failed to ${action} maintenance request`, error)
			toast.error(`Failed to ${action} maintenance request`)
		}
	}

	const clearError = (field: keyof FormState) => {
		setErrors(prev => {
			if (!prev[field]) {
				return prev
			}
			const next = { ...prev }
			delete next[field]
			return next
		})
	}

	const propertyLabelId = 'maintenance-property-label'
	const unitLabelId = 'maintenance-unit-label'
	const priorityLabelId = 'maintenance-priority-label'
	const categoryLabelId = 'maintenance-category-label'

	return (
		<form onSubmit={handleSubmit} noValidate>
			<Card className="mx-auto max-w-3xl">
				<CardHeader>
					<div className="flex items-start gap-3">
						<span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
							<Wrench className="size-5" aria-hidden="true" />
						</span>
						<div>
							<CardTitle>{headerTitle}</CardTitle>
							<CardDescription>{headerDescription}</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="grid gap-6">
					<div className="grid gap-4 md:grid-cols-2">
						<Field>
							<FieldLabel id={propertyLabelId} htmlFor="propertyId">
								Property *
							</FieldLabel>
							<Select
								value={formState.propertyId}
								onValueChange={value => {
									setFormState(prev => ({
										...prev,
										propertyId: value,
										unitId: ''
									}))
									clearError('propertyId')
								}}
							>
								<SelectTrigger
									id="propertyId"
									aria-labelledby={propertyLabelId}
									className="w-full justify-between"
								>
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
							{errors.propertyId ? (
								<FieldError>{errors.propertyId}</FieldError>
							) : null}
						</Field>

						<Field>
							<FieldLabel id={unitLabelId} htmlFor="unitId">
								Unit (optional)
							</FieldLabel>
							<Select
								value={formState.unitId}
								onValueChange={value => {
									setFormState(prev => ({
										...prev,
										unitId: value
									}))
									clearError('unitId')
								}}
								disabled={isUnitDisabled}
							>
								<SelectTrigger
									id="unitId"
									aria-labelledby={unitLabelId}
									className="w-full justify-between"
									disabled={isUnitDisabled}
								>
									<SelectValue placeholder="Select unit" />
								</SelectTrigger>
								<SelectContent>
									{availableUnits.map(unit => (
										<SelectItem key={unit.id} value={unit.id}>
											Unit {unit.unitNumber}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.unitId ? <FieldError>{errors.unitId}</FieldError> : null}
						</Field>
					</div>

					<Field>
						<FieldLabel htmlFor="title">Title *</FieldLabel>
						<Input
							id="title"
							name="title"
							placeholder="Kitchen faucet leak"
							value={formState.title}
							onChange={event => {
								setFormState(prev => ({
									...prev,
									title: event.target.value
								}))
								clearError('title')
							}}
						/>
						{errors.title ? <FieldError>{errors.title}</FieldError> : null}
					</Field>

					<Field>
						<FieldLabel htmlFor="description">Description *</FieldLabel>
						<Textarea
							id="description"
							name="description"
							rows={4}
							placeholder="Describe the issue in detail"
							value={formState.description}
							onChange={event => {
								setFormState(prev => ({
									...prev,
									description: event.target.value
								}))
								clearError('description')
							}}
						/>
						{errors.description ? (
							<FieldError>{errors.description}</FieldError>
						) : null}
					</Field>

					<div className="grid gap-4 md:grid-cols-2">
						<Field>
							<FieldLabel id={priorityLabelId} htmlFor="priority">
								Priority *
							</FieldLabel>
							<Select
								value={formState.priority}
								onValueChange={value => {
									setFormState(prev => ({
										...prev,
										priority: value as PriorityValue
									}))
									clearError('priority')
								}}
							>
								<SelectTrigger
									id="priority"
									aria-labelledby={priorityLabelId}
									className="w-full justify-between"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PRIORITY_OPTIONS.map(option => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.priority ? (
								<FieldError>{errors.priority}</FieldError>
							) : null}
						</Field>

						<Field>
							<FieldLabel id={categoryLabelId} htmlFor="category">
								Category
							</FieldLabel>
							<Select
								value={formState.category}
								onValueChange={value => {
									setFormState(prev => ({
										...prev,
										category: value
									}))
									clearError('category')
								}}
							>
								<SelectTrigger
									id="category"
									aria-labelledby={categoryLabelId}
									className="w-full justify-between"
								>
									<SelectValue placeholder="Select category" />
								</SelectTrigger>
								<SelectContent>
									{CATEGORY_OPTIONS.map(option => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Field>
							<FieldLabel htmlFor="estimatedCost">
								Estimated Cost (optional)
							</FieldLabel>
							<Input
								id="estimatedCost"
								name="estimatedCost"
								type="number"
								min="0"
								step="0.01"
								value={formState.estimatedCost}
								onChange={event => {
									setFormState(prev => ({
										...prev,
										estimatedCost: event.target.value
									}))
									clearError('estimatedCost')
								}}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="preferredDate">
								Preferred Date (optional)
							</FieldLabel>
							<Input
								id="preferredDate"
								name="preferredDate"
								type="date"
								value={formState.preferredDate}
								onChange={event => {
									setFormState(prev => ({
										...prev,
										preferredDate: event.target.value
									}))
									clearError('preferredDate')
								}}
							/>
						</Field>
					</div>
				</CardContent>
				<CardFooter className="flex justify-end gap-3 border-t">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.back()}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{submitLabel}
					</Button>
				</CardFooter>
			</Card>
		</form>
	)
}
