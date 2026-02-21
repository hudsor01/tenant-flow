'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '#components/ui/button'
import {
	useCreateLeaseMutation,
	useUpdateLeaseMutation
} from '#hooks/api/use-lease'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import { unitQueries } from '#hooks/api/query-keys/unit-keys'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { leaseQueries } from '#hooks/api/query-keys/lease-keys'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { LeaseStatus, LeaseWithExtras } from '@repo/shared/types/core'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { handleMutationError } from '#lib/mutation-error-handler'
import { ErrorBoundary } from '#components/error-boundary/error-boundary'
import { z } from 'zod'
import { LeaseFormPropertyUnitFields } from './lease-form-property-unit-fields'
import { LeaseFormTenantDateFields } from './lease-form-tenant-date-fields'
import { LeaseFormFinancialFields } from './lease-form-financial-fields'
// LeaseFormValues is defined in lease-form-types.ts and used by sub-components

interface LeaseFormProps {
	mode: 'create' | 'edit'
	lease?: LeaseWithExtras
	onSuccess?: () => void
}

const validationSchema = z.object({
	unit_id: z.string().min(1, 'Unit is required'),
	primary_tenant_id: z.string().min(1, 'Primary tenant is required'),
	start_date: z.string().min(1, 'Start date is required'),
	end_date: z.string().min(1, 'End date is required'),
	rent_amount: z.number().min(0, 'Rent amount must be positive'),
	security_deposit: z.number().min(0, 'Security deposit must be positive'),
	rent_currency: z.string().min(1, 'Currency is required'),
	payment_day: z
		.number()
		.min(1)
		.max(31, 'Payment day must be between 1 and 31'),
	lease_status: z.string().min(1, 'Lease status is required')
})

export function LeaseForm({ mode, lease, onSuccess }: LeaseFormProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const logger = createLogger({ component: 'LeaseForm' })

	const createLeaseMutation = useCreateLeaseMutation()
	const updateLeaseMutation = useUpdateLeaseMutation()

	const {
		data: propertiesResponse,
		error: propertiesError,
		isError: propertiesIsError,
		isLoading: propertiesIsLoading
	} = useQuery(propertyQueries.list())
	const properties = propertiesResponse?.data ?? []

	const tenantsResponse = useQuery(tenantQueries.list())
	const tenants = tenantsResponse.data?.data ?? []

	// Sync server-fetched lease into TanStack Query cache (edit mode only)
	useEffect(() => {
		if (mode === 'edit' && lease) {
			queryClient.setQueryData(leaseQueries.detail(lease.id).queryKey, lease)
		}
	}, [mode, lease, queryClient])

	const form = useForm({
		defaultValues: {
			unit_id: lease?.unit_id ?? '',
			primary_tenant_id: lease?.primary_tenant_id ?? '',
			start_date: lease?.start_date ?? '',
			end_date: lease?.end_date ?? '',
			rent_amount: lease?.rent_amount ?? 0,
			security_deposit: lease?.security_deposit ?? 0,
			rent_currency: lease?.rent_currency ?? 'USD',
			payment_day: lease?.payment_day ?? 1,
			lease_status: lease?.lease_status ?? 'draft'
		},
		onSubmit: async ({ value }) => {
			try {
				const leaseStatus = value.lease_status as LeaseStatus
				if (mode === 'create') {
					await createLeaseMutation.mutateAsync({
						...value,
						lease_status: leaseStatus,
						auto_pay_enabled: false,
						tenant_ids: [value.primary_tenant_id]
					})
					await Promise.all([
						queryClient.invalidateQueries({ queryKey: ['leases'] }),
						queryClient.invalidateQueries({ queryKey: ['units'] }),
						queryClient.invalidateQueries({ queryKey: ['tenants'] })
					])
					toast.success('Lease created successfully')
					router.push('/leases')
				} else {
					if (!lease?.id) {
						toast.error('Lease ID is missing')
						return
					}
					await updateLeaseMutation.mutateAsync({
						id: lease.id,
						data: { ...value, lease_status: leaseStatus },
						version: lease.version ?? 1
					})
					toast.success('Lease updated successfully')
				}
				onSuccess?.()
			} catch (error) {
				logger.error(`Lease ${mode} failed`, {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined
				})
				handleMutationError(
					error,
					`${mode === 'create' ? 'Create' : 'Update'} lease`
				)
			}
		},
		validators: {
			onBlur: ({ value }) => {
				const result = validationSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			},
			onSubmitAsync: ({ value }) => {
				const result = validationSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	const [selectedPropertyId, setSelectedPropertyId] = useState(
		lease?.unit?.property_id ?? ''
	)
	const {
		data: unitsData,
		error: unitsError,
		isError: unitsIsError
	} = useQuery({
		...unitQueries.listByProperty(selectedPropertyId),
		enabled: !!selectedPropertyId
	})

	const isSubmitting =
		mode === 'create'
			? createLeaseMutation.isPending
			: updateLeaseMutation.isPending

	return (
		<ErrorBoundary>
			<form
				onSubmit={e => {
					e.preventDefault()
					e.stopPropagation()
					form.handleSubmit()
				}}
			>
				<div className="space-y-6">
					<LeaseFormPropertyUnitFields
						form={form}
						properties={properties}
						propertiesIsLoading={propertiesIsLoading}
						propertiesIsError={propertiesIsError}
						propertiesError={propertiesError}
						units={unitsData ?? []}
						unitsIsError={unitsIsError}
						unitsError={unitsError}
						selectedPropertyId={selectedPropertyId}
						onPropertyChange={setSelectedPropertyId}
					/>

					<LeaseFormTenantDateFields form={form} tenants={tenants} />

					<LeaseFormFinancialFields form={form} />

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
									? 'Create Lease'
									: 'Save Changes'}
						</Button>
					</div>
				</div>
			</form>
		</ErrorBoundary>
	)
}
