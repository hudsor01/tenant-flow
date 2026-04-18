'use client'

import { Button } from '#components/ui/button'
import { createLogger } from '#lib/frontend-logger'
import type { Property, Unit } from '#types/core'
import { useForm } from '@tanstack/react-form'
import { UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useUnsavedChangesWarning } from '#hooks/use-unsaved-changes'
import { createClient } from '#lib/supabase/client'
import { handleMutationError } from '#lib/mutation-error-handler'
import { InviteTenantInfoFields } from './invite-tenant-info-fields'
import { InviteTenantPropertyFields } from './invite-tenant-property-fields'

const logger = createLogger({ component: 'AddTenantForm' })

interface InviteTenantFormProps {
	properties: Property[]
	units: Unit[]
	onSuccess?: () => void
}

/**
 * Add Tenant Form (landlord-only mode)
 *
 * Collects basic tenant info and records a tenant row for the landlord.
 * Tenants do NOT receive a portal login — they are data records on the
 * landlord's side. Lease assignment happens on the lease creation flow.
 *
 * Required Fields:
 * - Email
 * - First/Last name
 *
 * Optional Fields:
 * - Phone
 * - Property / Unit for early association
 */
export function InviteTenantForm({
	properties,
	units,
	onSuccess
}: InviteTenantFormProps) {
	const router = useRouter()
	const [selectedPropertyId, setSelectedPropertyId] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

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
			setIsSubmitting(true)
			try {
				const supabase = createClient()

				// Create tenant record. In landlord-only mode, tenants are data records
				// without auth accounts. The tenants.user_id FK is expected to be relaxed
				// in the accompanying DB migration; until then, insertions from this form
				// rely on the migration being applied.
				const payload: Record<string, unknown> = {
					email: value.email,
					first_name: value.first_name,
					last_name: value.last_name,
					name: `${value.first_name} ${value.last_name}`.trim()
				}
				if (value.phone) payload.phone = value.phone

				const { error } = await supabase
					.from('tenants')
					.insert(payload as never)

				if (error) {
					handleMutationError(error, 'Add tenant')
					return
				}

				logger.info('Tenant added', { email: value.email })
				toast.success('Tenant added')

				onSuccess?.()
				router.push('/tenants')
				router.refresh()
			} catch (error) {
				logger.error('Failed to add tenant', {
					error: error instanceof Error ? error.message : String(error)
				})
				handleMutationError(error, 'Add tenant')
			} finally {
				setIsSubmitting(false)
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
							disabled={!canSubmit || isSubmitting || isFormSubmitting}
							onClick={form.handleSubmit}
						>
							<UserPlus className="size-4 mr-2" />
							{isSubmitting || isFormSubmitting ? 'Adding tenant...' : 'Add Tenant'}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</div>
	)
}
