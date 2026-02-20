'use client'

import { Button } from '#components/ui/button'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Property, Unit } from '@repo/shared/types/core'
import type { InviteTenantRequest } from '@repo/shared/validation/tenants'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { apiRequest } from '#lib/api-request'
import { InviteTenantInfoFields } from './invite-tenant-info-fields'
import { InviteTenantPropertyFields } from './invite-tenant-property-fields'

const logger = createLogger({ component: 'InviteTenantForm' })

interface InviteTenantFormProps {
	properties: Property[]
	units: Unit[]
	onSuccess?: () => void
}

interface InviteTenantResponse {
	success: boolean
	tenant_id: string
	message: string
}

/**
 * Simplified Invite Tenant Form
 *
 * Collects basic tenant info to send portal invitation.
 * Property assignment is OPTIONAL - can be done later when creating a lease.
 *
 * Required Fields:
 * - Email - for invitation
 * - First/Last name - for tenant record
 *
 * Optional Fields:
 * - Phone
 * - Property - assign to a property now or later
 * - Unit - for multi-unit properties
 */
export function InviteTenantForm({
	properties,
	units,
	onSuccess
}: InviteTenantFormProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const [selectedPropertyId, setSelectedPropertyId] = useState('')

	const inviteTenantMutation = useMutation({
		mutationFn: async (payload: InviteTenantRequest) =>
			apiRequest<InviteTenantResponse>('/api/v1/tenants/invite', {
				method: 'POST',
				body: JSON.stringify(payload)
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: tenantQueries.all() })
		}
	})

	const form = useForm({
		defaultValues: {
			email: '',
			first_name: '',
			last_name: '',
			phone: '',
			property_id: '',
			unit_id: ''
		},
		onSubmit: async ({ value }) => {
			try {
				const payload: InviteTenantRequest = {
					tenantData: {
						email: value.email,
						first_name: value.first_name,
						last_name: value.last_name,
						...(value.phone && { phone: value.phone })
					}
				}

				if (value.property_id) {
					payload.leaseData = {
						property_id: value.property_id,
						...(value.unit_id && { unit_id: value.unit_id })
					}
				}

				const response = await inviteTenantMutation.mutateAsync(payload)

				logger.info('Tenant invitation sent', {
					tenant_id: response.tenant_id
				})

				toast.success('Invitation Sent', {
					description: `${value.first_name} ${value.last_name} will receive an email to access their tenant portal.`
				})

				onSuccess?.()
				router.push('/tenants')
				router.refresh()
			} catch (error) {
				logger.error('Failed to invite tenant', {
					error: error instanceof Error ? error.message : String(error)
				})

				toast.error('Failed to send invitation', {
					description:
						error instanceof Error
							? error.message
							: 'Please try again or contact support.'
				})
			}
		}
	})

	// Filter units based on selected property
	const availableUnits = units.filter(
		unit => unit.property_id === selectedPropertyId
	)

	// Auto-select the first unit if only one exists
	useEffect(() => {
		if (
			availableUnits.length === 1 &&
			!form.getFieldValue('unit_id') &&
			availableUnits[0]
		) {
			form.setFieldValue('unit_id', availableUnits[0].id)
		}
	}, [availableUnits, form])

	return (
		<div className="space-y-6">
			<InviteTenantInfoFields form={form} />

			<InviteTenantPropertyFields
				form={form}
				properties={properties}
				availableUnits={availableUnits}
				selectedPropertyId={selectedPropertyId}
				onPropertyChange={setSelectedPropertyId}
			/>

			{/* Form Actions */}
			<div className="flex justify-end gap-4 pt-4 border-t">
				<Button type="button" variant="outline" onClick={() => router.back()}>
					Cancel
				</Button>
				<form.Subscribe
					selector={state => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isFormSubmitting]) => (
						<Button
							type="submit"
							disabled={
								!canSubmit || inviteTenantMutation.isPending || isFormSubmitting
							}
							onClick={form.handleSubmit}
						>
							<Mail className="size-4 mr-2" />
							{inviteTenantMutation.isPending || isFormSubmitting
								? 'Sending Invitation...'
								: 'Send Invitation'}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</div>
	)
}
