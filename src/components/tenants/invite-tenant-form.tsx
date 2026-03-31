'use client'

import { Button } from '#components/ui/button'
import { createLogger } from '#lib/frontend-logger'
import type { Property, Unit } from '#types/core'
import { useForm } from '@tanstack/react-form'
import { Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useUnsavedChangesWarning } from '#hooks/use-unsaved-changes'
import { useCreateInvitation } from '#hooks/api/use-create-invitation'
import { useResendInvitationMutation } from '#hooks/api/use-tenant-invite-mutations'
import { handleDuplicateInvitation } from '#lib/invitation-utils'
import { InviteTenantInfoFields } from './invite-tenant-info-fields'
import { InviteTenantPropertyFields } from './invite-tenant-property-fields'

const logger = createLogger({ component: 'InviteTenantForm' })

interface InviteTenantFormProps {
	properties: Property[]
	units: Unit[]
	onSuccess?: () => void
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
	const [selectedPropertyId, setSelectedPropertyId] = useState('')
	const createInvitation = useCreateInvitation()
	const resendInvitation = useResendInvitationMutation()

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
				const result = await createInvitation.mutateAsync({
					email: value.email,
					property_id: value.property_id || undefined,
					unit_id: value.unit_id || undefined
				})

				if (result.status === 'duplicate') {
					handleDuplicateInvitation(result.existing, resendInvitation.mutate)
					return
				}

				// Hook already fires success toast. Consumer handles navigation only.
				logger.info('Tenant invitation sent', {
					email: value.email
				})

				onSuccess?.()
				router.push('/tenants')
				router.refresh()
			} catch (error) {
				logger.error('Failed to invite tenant', {
					error: error instanceof Error ? error.message : String(error)
				})
			}
		}
	})

	// Warn before navigating away with unsaved form data
	useUnsavedChangesWarning(form.state.isDirty)

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
								!canSubmit || createInvitation.isPending || isFormSubmitting
							}
							onClick={form.handleSubmit}
						>
							<Mail className="size-4 mr-2" />
							{createInvitation.isPending || isFormSubmitting
								? 'Sending Invitation...'
								: 'Send Invitation'}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</div>
	)
}
