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
import { Textarea } from '#components/ui/textarea'
import {
	useCreateLease,
	useUpdateLease,
	leaseKeys
} from '#hooks/api/use-lease'
import { usePropertyList } from '#hooks/api/use-properties'
import { useUnitsByProperty } from '#hooks/api/use-unit'
import { useTenantList } from '#hooks/api/use-tenant'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Lease, Property, Unit } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { LEASE_STATUS, LEASE_STATUS_LABELS, ERROR_MESSAGES } from '#lib/constants'

type LeaseStatus = Database['public']['Enums']['LeaseStatus']

interface LeaseFormProps {
	mode: 'create' | 'edit'
	lease?: Lease
	onSuccess?: () => void
}

export function LeaseForm({ mode, lease, onSuccess }: LeaseFormProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const logger = createLogger({ component: 'LeaseForm' })

	const createLeaseMutation = useCreateLease()
	const updateLeaseMutation = useUpdateLease()
	const propertiesResponse = usePropertyList()
	const properties = Array.isArray(propertiesResponse.data) ? propertiesResponse.data : propertiesResponse.data?.data ?? []
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
			propertyId: lease?.propertyId ?? '',
			unitId: lease?.unitId ?? '',
			tenantId: lease?.tenantId ?? '',
			startDate: lease?.startDate ?? '',
			endDate: lease?.endDate ?? '',
			rentAmount: lease?.rentAmount ?? 0,
			securityDeposit: lease?.securityDeposit ?? 0,
			terms: lease?.terms ?? '',
			status: (lease?.status ?? LEASE_STATUS.DRAFT) as LeaseStatus
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
						data: {
							...value,
							terms: value.terms || null
						},
						version: lease.version
					})
					toast.success('Lease updated successfully')
				}

				onSuccess?.()
			} catch (error) {
				logger.error(`Lease ${mode} failed`, {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined
				})

				const errorMessage =
					error instanceof Error ? error.message : ERROR_MESSAGES.GENERIC_FAILED(mode, 'lease')
				
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

	const [selectedPropertyId, setSelectedPropertyId] = useState(lease?.propertyId ?? '')
	const unitsResponse = useUnitsByProperty(selectedPropertyId)
	const units = Array.isArray(unitsResponse.data) ? unitsResponse.data : unitsResponse.data?.data ?? []

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
				<div className="grid gap-4 md:grid-cols-2">
					<form.Field name="propertyId">
						{field => (
							<Field>
								<FieldLabel htmlFor="propertyId">Property *</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={value => {
										field.handleChange(value)
										setSelectedPropertyId(value)
										form.setFieldValue('unitId', '')
									}}
								>
									<SelectTrigger id="propertyId">
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
								{field.state.meta.errors.length > 0 && (
									<FieldError>{field.state.meta.errors[0]}</FieldError>
								)}
							</Field>
						)}
					</form.Field>

					<form.Field name="unitId">
						{field => (
							<Field>
								<FieldLabel htmlFor="unitId">Unit *</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={field.handleChange}
									disabled={!selectedPropertyId}
								>
									<SelectTrigger id="unitId">
										<SelectValue placeholder="Select unit" />
									</SelectTrigger>
									<SelectContent>
										{units.map((unit: Unit) => (
											<SelectItem key={unit.id} value={unit.id}>
												Unit {unit.unitNumber}
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
				</div>

				<form.Field name="tenantId">
					{field => (
						<Field>
							<FieldLabel htmlFor="tenantId">Tenant *</FieldLabel>
							<Select value={field.state.value} onValueChange={field.handleChange}>
								<SelectTrigger id="tenantId">
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

				<div className="grid gap-4 md:grid-cols-2">
					<form.Field name="startDate">
						{field => (
							<Field>
								<FieldLabel htmlFor="startDate">Start Date *</FieldLabel>
								<Input
									id="startDate"
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

					<form.Field name="endDate">
						{field => (
							<Field>
								<FieldLabel htmlFor="endDate">End Date *</FieldLabel>
								<Input
									id="endDate"
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

				<div className="grid gap-4 md:grid-cols-2">
					<form.Field name="rentAmount">
						{field => (
							<Field>
								<FieldLabel htmlFor="rentAmount">Monthly Rent *</FieldLabel>
								<Input
									id="rentAmount"
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

					<form.Field name="securityDeposit">
						{field => (
							<Field>
								<FieldLabel htmlFor="securityDeposit">
									Security Deposit *
								</FieldLabel>
								<Input
									id="securityDeposit"
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

				<form.Field name="status">
					{field => (
						<Field>
							<FieldLabel htmlFor="status">Status *</FieldLabel>
							<Select value={field.state.value} onValueChange={(value: string) => field.handleChange(value as LeaseStatus)}>
								<SelectTrigger id="status">
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

				<form.Field name="terms">
					{field => (
						<Field>
							<FieldLabel htmlFor="terms">Terms (optional)</FieldLabel>
							<Textarea
								id="terms"
								rows={4}
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								placeholder="Additional lease terms and conditions..."
							/>
							{field.state.meta.errors.length > 0 && (
								<FieldError>{field.state.meta.errors[0]}</FieldError>
							)}
						</Field>
					)}
				</form.Field>

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
	)
}
