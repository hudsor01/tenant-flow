'use client'

import {
	useCreateUnitMutation,
	useUpdateUnitMutation
} from '#hooks/api/use-unit'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import { unitQueries } from '#hooks/api/query-keys/unit-keys'
import type { Unit } from '@repo/shared/types/core'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { ERROR_MESSAGES } from '#lib/constants/error-messages'
import {
	isConflictError,
	handleConflictError
} from '@repo/shared/utils/optimistic-locking'
import { handleMutationError } from '#lib/mutation-error-handler'
import { UnitFormFields } from './unit-form-fields'

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
export function UnitForm({
	mode,
	unit: unitProp,
	id,
	onSuccess
}: UnitFormProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { data: propertiesResponse } = useQuery(
		propertyQueries.list({ limit: 100 })
	)
	const properties = propertiesResponse?.data
	const createUnitMutation = useCreateUnitMutation()
	const updateUnitMutation = useUpdateUnitMutation()

	// Fetch unit if id provided (for client-side edit mode)
	// Only fetch if we don't have a unit prop and we're in edit mode
	const shouldFetch = mode === 'edit' && !!id && !unitProp
	const { data: fetchedUnit } = useQuery({
		...unitQueries.detail(shouldFetch ? id! : ''),
		enabled: shouldFetch
	})

	// Use provided unit or fetched unit
	const unit = unitProp || fetchedUnit

	// Sync server-fetched unit into TanStack Query cache (edit mode only)
	useEffect(() => {
		if (mode === 'edit' && unit) {
			queryClient.setQueryData(unitQueries.detail(unit.id).queryKey, unit)
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
			status: (unit?.status ?? 'available') as
				| 'available'
				| 'occupied'
				| 'maintenance'
				| 'reserved'
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
				const square_feet = value.square_feet
					? Number.parseInt(value.square_feet)
					: null

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

				if (
					value.square_feet &&
					(!Number.isFinite(square_feet) || square_feet! < 0)
				) {
					toast.error('Square feet must be a valid positive number')
					return
				}

				const unitData = {
					property_id: value.property_id,
					unit_number: value.unit_number,
					bedrooms,
					bathrooms,
					square_feet: square_feet ?? undefined,
					rent_amount,
					rent_currency: 'USD',
					rent_period: 'monthly',
					status: value.status
				}

				if (mode === 'create') {
					await createUnitMutation.mutateAsync(unitData)
					toast.success('Unit created successfully')
					router.push('/units')
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
						unitQueries.detail(unit.id).queryKey,
						unitQueries.lists()
					])
					toast.error(ERROR_MESSAGES.CONFLICT_UPDATE)
					return
				}

				handleMutationError(
					error,
					`${mode === 'create' ? 'Create' : 'Update'} unit`
				)
			}
		}
	})

	// Reset form when unit data loads
	useEffect(() => {
		if (unit) {
			form.reset({
				property_id: unit.property_id ?? '',
				unit_number: unit.unit_number ?? '',
				bedrooms: unit.bedrooms?.toString() ?? '1',
				bathrooms: unit.bathrooms?.toString() ?? '1',
				square_feet: unit.square_feet?.toString() ?? '',
				rent_amount: unit.rent_amount?.toString() ?? '',
				status: (unit.status ?? 'available') as
					| 'available'
					| 'occupied'
					| 'maintenance'
					| 'reserved'
			})
		}
	}, [unit, form])

	const isSubmitting =
		mode === 'create'
			? createUnitMutation.isPending
			: updateUnitMutation.isPending

	return (
		<form
			onSubmit={e => {
				e.preventDefault()
				form.handleSubmit()
			}}
			className="space-y-6"
		>
			<UnitFormFields
				form={form}
				properties={properties}
				mode={mode}
				isSubmitting={isSubmitting}
			/>
		</form>
	)
}
