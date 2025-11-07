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
import { UNIT_STATUS, UNIT_STATUS_LABELS, ERROR_MESSAGES } from '#lib/constants'

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
			propertyId: unit?.propertyId ?? '',
			unitNumber: unit?.unitNumber ?? '',
			bedrooms: unit?.bedrooms?.toString() ?? '1',
			bathrooms: unit?.bathrooms?.toString() ?? '1',
			squareFeet: unit?.squareFeet?.toString() ?? '',
			rent: unit?.rent?.toString() ?? '',
			status: (unit?.status ?? 'VACANT') as 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED',
			lastInspectionDate: unit?.lastInspectionDate ?? ''
		},
		onSubmit: async ({ value }) => {
			try {
				// Validate required fields first
				if (!value.propertyId?.trim()) {
					toast.error('Property is required')
					return
				}

				if (!value.unitNumber?.trim()) {
					toast.error('Unit number is required')
					return
				}

				if (!value.rent?.trim()) {
					toast.error('Rent is required')
					return
				}

				// Validate required numeric fields
				const bedrooms = Number.parseInt(value.bedrooms)
				const bathrooms = Number.parseFloat(value.bathrooms)
				const rent = Number.parseFloat(value.rent)
				const squareFeet = value.squareFeet ? Number.parseInt(value.squareFeet) : null

				if (!Number.isFinite(bedrooms) || bedrooms < 0) {
					toast.error('Bedrooms must be a valid positive number')
					return
				}

				if (!Number.isFinite(bathrooms) || bathrooms < 0) {
					toast.error('Bathrooms must be a valid positive number')
					return
				}

				if (!Number.isFinite(rent) || rent <= 0) {
					toast.error('Rent must be a valid positive number greater than zero')
					return
				}

				if (value.squareFeet && (!Number.isFinite(squareFeet) || squareFeet! < 0)) {
					toast.error('Square feet must be a valid positive number')
					return
				}

				const unitData = {
					propertyId: value.propertyId,
					unitNumber: value.unitNumber,
					bedrooms,
					bathrooms,
					squareFeet,
					rent,
					status: value.status,
					lastInspectionDate: value.lastInspectionDate || null
				}

				if (mode === 'create') {
					await createUnitMutation.mutateAsync(unitData)
					await Promise.all([
						queryClient.invalidateQueries({ queryKey: ['units'] }),
						queryClient.invalidateQueries({ queryKey: ['properties'] })
					])
					toast.success('Unit created successfully')
					router.push('/manage/units')
				} else {
					if (!unit?.id) {
						toast.error('Unit ID is missing')
						return
					}
					await updateUnitMutation.mutateAsync({
						id: unit.id,
						data: { ...unitData, version: unit.version }
					})
					toast.success('Unit updated successfully')
				}

				onSuccess?.()
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : ERROR_MESSAGES.GENERIC_FAILED(mode, 'unit')
				
				// Check for 409 conflict via error status or response
				const is409Conflict = 
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(error as any)?.status === 409 || 
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(error as any)?.response?.status === 409
				
				toast.error(errorMessage, {
					description: is409Conflict ? ERROR_MESSAGES.CONFLICT_UPDATE : undefined
				})
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
				<form.Field name="propertyId">
					{field => (
						<Field>
							<FieldLabel htmlFor="propertyId">Property *</FieldLabel>
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

				<form.Field name="unitNumber">
					{field => (
						<Field>
							<FieldLabel htmlFor="unitNumber">Unit Number *</FieldLabel>
							<Input
								id="unitNumber"
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

				<form.Field name="squareFeet">
					{field => (
						<Field>
							<FieldLabel htmlFor="squareFeet">Square Feet</FieldLabel>
							<Input
								id="squareFeet"
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
				<form.Field name="rent">
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
