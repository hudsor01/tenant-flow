'use client'

import { Button } from '#components/ui/button'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '#components/ui/input-group'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { useCreateUnit, useUpdateUnit, useUnit, unitKeys } from '#hooks/api/use-unit'
import { usePropertyList } from '#hooks/api/use-properties'
import type { Unit } from '@repo/shared/types/core'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { UNIT_STATUS, UNIT_STATUS_LABELS } from '#lib/constants/status-values'
import { ERROR_MESSAGES } from '#lib/constants/error-messages'
import { isConflictError, handleConflictError } from '@repo/shared/utils/optimistic-locking'
import { handleMutationError } from '#lib/mutation-error-handler'

interface UnitFormProps {
	mode: 'create' | 'edit'
	unit?: Unit
	id?: string // For edit mode - will fetch unit if provided
	onSuccess?: () => void
}

/**
 * Unit Form Component
 *
 * Consolidated form for creating and editing units.
 * Follows the same pattern as PropertyForm, LeaseForm, and MaintenanceForm.
 */
export function UnitForm({ mode, unit: unitProp, id, onSuccess }: UnitFormProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { data: propertiesResponse } = usePropertyList({ limit: 100 })
	const properties = propertiesResponse?.data || []
	const createUnitMutation = useCreateUnit()
	const updateUnitMutation = useUpdateUnit()

	// Fetch unit if id provided (for client-side edit mode)
	// Only fetch if we don't have a unit prop and we're in edit mode
	const shouldFetch = mode === 'edit' && !!id && !unitProp
	const { data: fetchedUnit } = useUnit(shouldFetch ? id! : '')

	// Use provided unit or fetched unit
	const unit = unitProp || fetchedUnit

	// Sync server-fetched unit into TanStack Query cache (edit mode only)
	useEffect(() => {
		if (mode === 'edit' && unit) {
			queryClient.setQueryData(unitKeys.detail(unit.id), unit)
		}
	}, [mode, unit, unit?.id, queryClient])

	const form = useForm({
		defaultValues: {
			property_id: unit?.property_id ?? '',
			unit_number: unit?.unit_number ?? '',
			bedrooms: unit?.bedrooms?.toString() ?? '1',
			bathrooms: unit?.bathrooms?.toString() ?? '1',
			square_feet: unit?.square_feet?.toString() ?? '',
			rent_amount: unit?.rent_amount?.toString() ?? '',
			status: (unit?.status ?? 'VACANT') as 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
		},
		onSubmit: async ({ value }) => {
			try {
				// Validate required fields first
				if (!value.property_id?.trim()) {
					toast.error('Property is required')
					return
				}

				if (!value.unit_number?.trim()) {
					toast.error('Unit number is required')
					return
				}

				if (!value.rent_amount?.trim()) {
					toast.error('Rent is required')
					return
				}

				// Validate required numeric fields
				const bedrooms = Number.parseInt(value.bedrooms)
				const bathrooms = Number.parseFloat(value.bathrooms)
				const rent_amount = Number.parseFloat(value.rent_amount)
				const square_feet = value.square_feet ? Number.parseInt(value.square_feet) : null

				if (!Number.isFinite(bedrooms) || bedrooms < 0) {
					toast.error('Bedrooms must be a valid positive number')
					return
				}

				if (!Number.isFinite(bathrooms) || bathrooms < 0) {
					toast.error('Bathrooms must be a valid positive number')
					return
				}

				if (!Number.isFinite(rent_amount) || rent_amount <= 0) {
					toast.error('Rent must be a valid positive number greater than zero')
					return
				}

				if (value.square_feet && (!Number.isFinite(square_feet) || square_feet! < 0)) {
					toast.error('Square feet must be a valid positive number')
					return
				}

				const unitData = {
					property_id: value.property_id,
					unit_number: value.unit_number,
					bedrooms,
					bathrooms,
					square_feet,
					rent_amount,
					status: value.status
				}

				if (mode === 'create') {
					await createUnitMutation.mutateAsync(unitData)
					toast.success('Unit created successfully')
					router.push('/manage/units')
				} else {
					if (!unit?.id) {
						toast.error('Unit ID is missing')
						return
					}
					await updateUnitMutation.mutateAsync({
						id: unit.id,
						data: unitData
					})
					toast.success('Unit updated successfully')
				}

					onSuccess?.()
			} catch (error) {
				// Handle optimistic locking conflicts
				if (mode === 'edit' && unit && isConflictError(error)) {
					handleConflictError('units', unit.id, queryClient, [
						unitKeys.detail(unit.id),
						unitKeys.all
					])
					toast.error(ERROR_MESSAGES.CONFLICT_UPDATE)
					return
				}

				handleMutationError(error, `${mode === 'create' ? 'Create' : 'Update'} unit`)
			}
		}
	})

	const isSubmitting =
		mode === 'create' ? createUnitMutation.isPending : updateUnitMutation.isPending

	return (
		<form
			onSubmit={e => {
				e.preventDefault()
				form.handleSubmit()
			}}
			className="space-y-6"
		>
			<div className="grid gap-4 md:grid-cols-2">
				<form.Field name="property_id">
					{field => (
						<Field>
							<FieldLabel htmlFor="property_id">Property *</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={field.handleChange}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select a property" />
								</SelectTrigger>
								<SelectContent>
									{properties.map(property => (
										<SelectItem key={property.id} value={property.id}>
											{property.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{field.state.meta.errors.length > 0 && (
								<FieldError>{field.state.meta.errors[0]}</FieldError>
							)}
						</Field>
					)}
				</form.Field>

				<form.Field name="unit_number">
					{field => (
						<Field>
							<FieldLabel htmlFor="unit_number">Unit Number *</FieldLabel>
							<Input
								id="unit_number"
								placeholder="e.g., 101, A1"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
							/>
							{field.state.meta.errors.length > 0 && (
								<FieldError>{field.state.meta.errors[0]}</FieldError>
							)}
						</Field>
					)}
				</form.Field>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<form.Field name="bedrooms">
					{field => (
						<Field>
							<FieldLabel htmlFor="bedrooms">Bedrooms *</FieldLabel>
							<Input
								id="bedrooms"
								type="number"
								min="0"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="bathrooms">
					{field => (
						<Field>
							<FieldLabel htmlFor="bathrooms">Bathrooms *</FieldLabel>
							<Input
								id="bathrooms"
								type="number"
								min="0"
								step="0.5"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="square_feet">
					{field => (
						<Field>
							<FieldLabel htmlFor="square_feet">Square Feet</FieldLabel>
							<Input
								id="square_feet"
								type="number"
								min="0"
								placeholder="Optional"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
							/>
						</Field>
					)}
				</form.Field>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<form.Field name="rent_amount">
					{field => (
						<Field>
							<FieldLabel htmlFor="rent">Monthly Rent *</FieldLabel>
							<InputGroup>
								<InputGroupAddon>
									<DollarSign className="size-4" />
								</InputGroupAddon>
								<InputGroupInput
									id="rent"
									type="number"
									min="0"
									step="0.01"
									placeholder="0.00"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
								/>
							</InputGroup>
						</Field>
					)}
				</form.Field>

				<form.Field name="status">
					{field => (
						<Field>
							<FieldLabel htmlFor="status">Status *</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={value => {
									field.handleChange(
										value as 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
									)
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={UNIT_STATUS.VACANT}>{UNIT_STATUS_LABELS.VACANT}</SelectItem>
									<SelectItem value={UNIT_STATUS.OCCUPIED}>{UNIT_STATUS_LABELS.OCCUPIED}</SelectItem>
									<SelectItem value={UNIT_STATUS.MAINTENANCE}>{UNIT_STATUS_LABELS.MAINTENANCE}</SelectItem>
									<SelectItem value={UNIT_STATUS.RESERVED}>{UNIT_STATUS_LABELS.RESERVED}</SelectItem>
								</SelectContent>
							</Select>
						</Field>
					)}
				</form.Field>
			</div>

			<div className="flex justify-end gap-3">
				<Button
					type="button"
					variant="outline"
					onClick={() => router.back()}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting
						? mode === 'create'
							? 'Creating...'
							: 'Saving...'
						: mode === 'create'
							? 'Create Unit'
							: 'Save Changes'}
				</Button>
			</div>
		</form>
	)
}
