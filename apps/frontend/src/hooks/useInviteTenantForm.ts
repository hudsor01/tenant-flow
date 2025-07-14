import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

const inviteTenantSchema = z.object({
	name: z.string().min(1, 'Tenant name is required'),
	email: z.string().email('Valid email is required'),
	phone: z.string().optional(),
	propertyId: z.string().min(1, 'Property selection is required'),
	unitId: z.string().optional()
})

export type InviteTenantForm = z.infer<typeof inviteTenantSchema>

interface UseInviteTenantFormProps {
	selectedPropertyId?: string
	canAddTenant: () => boolean
	setShowUpgradeModal: (show: boolean) => void
	setPendingInvitationError: (
		error: { message: string; tenantId?: string } | null
	) => void
	setAlreadyAcceptedTenant: (
		tenant: { name: string; email: string } | null
	) => void
	inviteTenant: (data: {
		name: string
		email: string
		phone?: string
		propertyId: string
		unitId?: string
	}) => Promise<{ emailSent: boolean; invitationUrl: string }>
	onClose: () => void
}

/**
 * Custom hook for managing invite tenant form logic and validation
 * Separates form state and business logic from UI components
 */
export function useInviteTenantForm({
	selectedPropertyId,
	canAddTenant,
	setShowUpgradeModal,
	setPendingInvitationError,
	setAlreadyAcceptedTenant,
	inviteTenant,
	onClose
}: UseInviteTenantFormProps) {
	const form = useForm<InviteTenantForm>({
		resolver: zodResolver(inviteTenantSchema),
		defaultValues: {
			name: '',
			email: '',
			phone: '',
			propertyId: selectedPropertyId || '',
			unitId: ''
		}
	})

	const handleSubmit = async (data: InviteTenantForm) => {
		logger.debug('Invite tenant form submitted', undefined, {
			form: { ...data, email: data.email ? '***' : undefined }, // Hide email for privacy
			errors: form.formState.errors,
			isValid: form.formState.isValid
		})

		// Check if user can add tenant before proceeding
		if (!canAddTenant()) {
			setShowUpgradeModal(true)
			return
		}

		try {
			setPendingInvitationError(null)
			logger.debug('Calling inviteTenant mutation')
			const result = await inviteTenant({
				name: data.name,
				email: data.email,
				phone: data.phone || undefined,
				propertyId: data.propertyId,
				unitId: data.unitId || undefined
			})

			// Check if email was actually sent
			if (result.emailSent) {
				toast.success('🎉 Invitation sent successfully!', {
					description:
						'The tenant will receive an email with login instructions.',
					duration: 5000
				})
			} else {
				toast.success('✅ Tenant created successfully!', {
					description: React.createElement(
						'div',
						{ className: 'space-y-2' },
						React.createElement(
							'p',
							{
								className:
									'text-sm text-emerald-700 font-medium'
							},
							'📧 Email system temporarily unavailable'
						),
						React.createElement(
							'div',
							{
								className:
									'bg-emerald-50 border border-emerald-200 rounded-lg p-3'
							},
							React.createElement(
								'p',
								{
									className:
										'text-xs text-emerald-600 font-medium mb-2'
								},
								'Share this invitation link manually:'
							),
							React.createElement(
								'div',
								{ className: 'flex items-center gap-2' },
								React.createElement(
									'code',
									{
										className:
											'flex-1 text-xs bg-white border border-emerald-300 rounded px-2 py-1 text-emerald-800 break-all'
									},
									result.invitationUrl
								),
								React.createElement(
									'button',
									{
										onClick: () => {
											navigator.clipboard.writeText(
												result.invitationUrl
											)
											toast.success(
												'🔗 Link copied to clipboard!',
												{ duration: 2000 }
											)
										},
										className:
											'text-emerald-600 hover:text-emerald-700 p-1 rounded hover:bg-emerald-100 transition-colors',
										title: 'Copy link'
									},
									'📋'
								)
							)
						)
					),
					duration: 10000
				})
			}
			onClose()
		} catch (error) {
			handleFormError(error)
		}
	}

	const handleFormError = (error: unknown) => {
		// Check if this is a pending invitation error
		const errorWithTenantId = error as Error & { tenantId?: string }
		const errorWithTenantDetails = error as Error & {
			tenantDetails?: { id: string; email: string; name: string }
		}

		if (
			error instanceof Error &&
			error.message.includes('already pending') &&
			errorWithTenantId.tenantId
		) {
			setPendingInvitationError({
				message: error.message,
				tenantId: errorWithTenantId.tenantId
			})
		} else if (
			error instanceof Error &&
			error.message.includes('already been invited and accepted') &&
			errorWithTenantDetails.tenantDetails
		) {
			// Show the prominent modal for already accepted tenants
			setAlreadyAcceptedTenant({
				name: errorWithTenantDetails.tenantDetails.name,
				email: errorWithTenantDetails.tenantDetails.email
			})
		} else {
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to send invitation'
			)
		}
	}

	return {
		form,
		handleSubmit,
		inviteTenantSchema
	}
}
