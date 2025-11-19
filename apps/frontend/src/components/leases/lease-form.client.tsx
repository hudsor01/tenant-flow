'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '#components/ui/button'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	useCreateLease,
	useUpdateLease,
	leaseKeys
} from '#hooks/api/use-lease'
import { usePropertyList } from '#hooks/api/use-properties'
import { useUnitsByProperty } from '#hooks/api/use-unit'
import { useTenantList } from '#hooks/api/use-tenant'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { LeaseStatus, Property, Unit, LeaseWithExtras } from '@repo/shared/types/core'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { LEASE_STATUS, LEASE_STATUS_LABELS } from '#lib/constants/status-values'
import { handleMutationError } from '#lib/mutation-error-handler'

interface LeaseFormProps {
	mode: 'create' | 'edit'
	lease?: LeaseWithExtras
	onSuccess?: () => void
}

export function LeaseForm({ mode, lease, onSuccess }: LeaseFormProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const logger = createLogger({ component: 'LeaseForm' })

	const createLeaseMutation = useCreateLease()
	const updateLeaseMutation = useUpdateLease()
	const {
		data: propertiesData,
		error: propertiesError,
		isError: propertiesIsError
	} = usePropertyList()
	const properties = Array.isArray(propertiesData) ? propertiesData : propertiesData?.data ?? []
	const tenantsResponse = useTenantList()
	const tenants = Array.isArray(tenantsResponse.data) ? tenantsResponse.data : tenantsResponse.data?.data ?? []

	// Sync server-fetched lease into TanStack Query cache (edit mode only)
	useEffect(() => {
		if (mode === 'edit' && lease) {
			queryClient.setQueryData(leaseKeys.detail(lease.id), lease)
		}
	}, [mode, lease, queryClient])

	// Initialize form
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
			lease_status: (lease?.lease_status ?? LEASE_STATUS.DRAFT) as LeaseStatus
		},
		onSubmit: async ({ value }) => {
			try {
				if (mode === 'create') {
					await createLeaseMutation.mutateAsync(value)
					await Promise.all([
						queryClient.invalidateQueries({ queryKey: ['leases'] }),
						queryClient.invalidateQueries({ queryKey: ['units'] }),
						queryClient.invalidateQueries({ queryKey: ['tenants'] })
					])
					toast.success('Lease created successfully')
					router.push('/manage/leases')
				} else {
					if (!lease?.id) {
						toast.error('Lease ID is missing')
						return
					}
					await updateLeaseMutation.mutateAsync({
						id: lease.id,
						data: value,
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

				handleMutationError(error, `${mode === 'create' ? 'Create' : 'Update'} lease`)
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
	} = useUnitsByProperty(selectedPropertyId)
	const units = Array.isArray(unitsData) ? unitsData : unitsData?.data ?? []

	const isSubmitting =
		mode === 'create'
			? createLeaseMutation.isPending
			: updateLeaseMutation.isPending

	return (
		<form
			onSubmit={e => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit()
			}}
		>
			<div className="space-y-6">
				{/* Property Selection (for filtering units, not stored in lease) */}
				<div className="grid gap-[var(--spacing-4)] md:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="property-select">Property *</FieldLabel>
						<Select
							value={selectedPropertyId}
							onValueChange={value => {
								setSelectedPropertyId(value)
								form.setFieldValue('unit_id', '')
							}}
							disabled={propertiesIsError}
						>
							<SelectTrigger id="property-select">
								<SelectValue placeholder="Select property" />
							</SelectTrigger>
							<SelectContent>
								{properties.map((property: Property) => (
									<SelectItem key={property.id} value={property.id}>
										{property.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					{propertiesIsError && (
						<p className="text-sm text-destructive mt-[var(--spacing-2)]">
							Failed to load properties{propertiesError ? `: ${propertiesError.message}` : ''}.
							Please refresh to retry.
						</p>
					)}

					<form.Field name="unit_id">
						{field => (
							<Field>
								<FieldLabel htmlFor="unit_id">Unit *</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={field.handleChange}
									disabled={!selectedPropertyId || unitsIsError}
								>
									<SelectTrigger id="unit_id">
										<SelectValue placeholder="Select unit" />
									</SelectTrigger>
									<SelectContent>
										{units.map((unit: Unit) => (
											<SelectItem key={unit.id} value={unit.id}>
												Unit {unit.unit_number}
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

					{unitsIsError && (
						<p className="text-sm text-destructive mt-[var(--spacing-2)]">
							Failed to load units for the selected property.
							{unitsError ? ` ${unitsError.message}` : ''} Please retry.
						</p>
					)}
				</div>

				<form.Field name="primary_tenant_id">
					{field => (
						<Field>
							<FieldLabel htmlFor="primary_tenant_id">Primary Tenant *</FieldLabel>
							<Select value={field.state.value} onValueChange={field.handleChange}>
								<SelectTrigger id="primary_tenant_id">
									<SelectValue placeholder="Select tenant" />
								</SelectTrigger>
								<SelectContent>
									{tenants.map(tenant => (
										<SelectItem key={tenant.id} value={tenant.id}>
											{tenant.name}
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

					<div className="grid gap-[var(--spacing-4)] md:grid-cols-2">
					<form.Field name="start_date">
						{field => (
							<Field>
								<FieldLabel htmlFor="start_date">Start Date *</FieldLabel>
								<Input
									id="start_date"
									type="date"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.length > 0 && (
									<FieldError>{field.state.meta.errors[0]}</FieldError>
								)}
							</Field>
						)}
					</form.Field>

					<form.Field name="end_date">
						{field => (
							<Field>
								<FieldLabel htmlFor="end_date">End Date *</FieldLabel>
								<Input
									id="end_date"
									type="date"
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

					<div className="grid gap-[var(--spacing-4)] md:grid-cols-2">
					<form.Field name="rent_amount">
						{field => (
							<Field>
								<FieldLabel htmlFor="rent_amount">Monthly Rent *</FieldLabel>
								<Input
									id="rent_amount"
									type="number"
									min="0"
									step="0.01"
									value={field.state.value}
									onChange={e => {
										const v = e.target.value
										field.handleChange(v === '' ? 0 : parseFloat(v))
									}}
								/>
								{field.state.meta.errors.length > 0 && (
									<FieldError>{field.state.meta.errors[0]}</FieldError>
								)}
							</Field>
						)}
					</form.Field>

					<form.Field name="security_deposit">
						{field => (
							<Field>
								<FieldLabel htmlFor="security_deposit">
									Security Deposit *
								</FieldLabel>
								<Input
									id="security_deposit"
									type="number"
									min="0"
									step="0.01"
									value={field.state.value}
									onChange={e => {
										const v = e.target.value
										field.handleChange(v === '' ? 0 : parseFloat(v))
									}}
								/>
								{field.state.meta.errors.length > 0 && (
									<FieldError>{field.state.meta.errors[0]}</FieldError>
								)}
							</Field>
						)}
					</form.Field>
				</div>

				<form.Field name="lease_status">
					{field => (
						<Field>
							<FieldLabel htmlFor="lease_status">Status *</FieldLabel>
							<Select value={field.state.value} onValueChange={(value: string) => field.handleChange(value as LeaseStatus)}>
								<SelectTrigger id="lease_status">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
					<SelectItem value={LEASE_STATUS.DRAFT}>{LEASE_STATUS_LABELS.DRAFT}</SelectItem>
					<SelectItem value={LEASE_STATUS.ACTIVE}>{LEASE_STATUS_LABELS.ACTIVE}</SelectItem>
					<SelectItem value={LEASE_STATUS.EXPIRED}>{LEASE_STATUS_LABELS.EXPIRED}</SelectItem>
					<SelectItem value={LEASE_STATUS.TERMINATED}>{LEASE_STATUS_LABELS.TERMINATED}</SelectItem>
				</SelectContent>
							</Select>
							{field.state.meta.errors.length > 0 && (
								<FieldError>{field.state.meta.errors[0]}</FieldError>
							)}
						</Field>
					)}
				</form.Field>

				<div className="grid gap-[var(--spacing-4)] md:grid-cols-2">
					<form.Field name="rent_currency">
						{field => (
							<Field>
								<FieldLabel htmlFor="rent_currency">Currency *</FieldLabel>
								<Select value={field.state.value} onValueChange={field.handleChange}>
									<SelectTrigger id="rent_currency">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="USD">USD ($)</SelectItem>
										<SelectItem value="EUR">EUR (€)</SelectItem>
										<SelectItem value="GBP">GBP (£)</SelectItem>
										<SelectItem value="CAD">CAD (C$)</SelectItem>
									</SelectContent>
								</Select>
								{field.state.meta.errors.length > 0 && (
									<FieldError>{field.state.meta.errors[0]}</FieldError>
								)}
							</Field>
						)}
					</form.Field>

					<form.Field name="payment_day">
						{field => (
							<Field>
								<FieldLabel htmlFor="payment_day">Payment Day *</FieldLabel>
								<Input
									id="payment_day"
									type="number"
									min="1"
									max="31"
									value={field.state.value}
									onChange={e => {
										const v = e.target.value
										field.handleChange(v === '' ? 1 : parseInt(v))
									}}
								/>
								{field.state.meta.errors.length > 0 && (
									<FieldError>{field.state.meta.errors[0]}</FieldError>
								)}
							</Field>
						)}
					</form.Field>
				</div>

				<div className="flex justify-end gap-[var(--spacing-3)]">
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
	)
}
