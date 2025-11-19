'use client'

import { Button } from '#components/ui/button'
import {
	CrudDialog,
	CrudDialogContent,
	CrudDialogDescription,
	CrudDialogFooter,
	CrudDialogHeader,
	CrudDialogTitle,
	CrudDialogBody
} from '#components/ui/crud-dialog'
import { handleMutationError } from '#lib/mutation-error-handler'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { clientFetch } from '#lib/api/client'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useModalStore } from '#stores/modal-store'
import { useMutation } from '@tanstack/react-query'

const logger = createLogger({ component: 'InviteTenantDialog' })

interface InviteTenantDialogProps {
	tenant_id: string
	tenantEmail: string
	tenantName: string
	property_id?: string
	lease_id?: string
	onSuccess?: () => void
}

/**
 * Invite Tenant to Portal Dialog
 *
 * Sends email invitation to existing tenant record to access their digital portal.
 * This is OPTIONAL - owners can manage tenants manually without portal access.
 *
 * Use case: Owner has already created tenant + lease manually, now wants to
 * invite them to pay rent online, submit maintenance requests, view documents.
 */
export function InviteTenantDialog({
	tenant_id,
	tenantEmail,
	tenantName,
	property_id,
	lease_id,
	onSuccess
}: InviteTenantDialogProps) {
	const { openModal, closeModal } = useModalStore()
	const [isSubmitting, setIsSubmitting] = useState(false)

	const modalId = `invite-tenant-${tenant_id}`

	const { mutateAsync: sendInvitation } = useMutation({
		mutationFn: async () => {
			// Use V2 endpoint (Supabase Auth) with optional property/lease context
			// Only pass defined values to avoid exactOptionalPropertyTypes errors
			const params: { property_id?: string; lease_id?: string } = {}
			if (property_id) params.property_id = property_id
			if (lease_id) params.lease_id = lease_id

			const invitationResponse = await clientFetch<{
				success: boolean
				message?: string
			}>(`/api/v1/tenants/${tenant_id}/send-invitation-v2`, {
				method: 'POST',
				body: JSON.stringify(params)
			})

			const logContext: Record<string, unknown> = {
				tenant_id,
				response: invitationResponse
			}
			if (property_id) logContext.property_id = property_id
			if (lease_id) logContext.lease_id = lease_id

			logger.info('Invitation sent via Supabase Auth', logContext)

			// Check if invitation was successful
			if (!invitationResponse.success) {
				throw new Error(
					invitationResponse.message || 'Failed to send invitation'
				)
			}

			return invitationResponse
		},
		onSuccess: () => {
			toast.success(`Invitation sent to ${tenantName}`, {
				description: `${tenantEmail} will receive a secure invitation link to access their tenant portal (valid for 24 hours).`
			})
			closeModal(modalId)
			onSuccess?.()
		},
		onError: error => {
			const errorContext: Record<string, unknown> = {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			}
			if (property_id) errorContext.property_id = property_id
			if (lease_id) errorContext.lease_id = lease_id

			logger.error('Failed to invite tenant', errorContext)
			handleMutationError(error, 'Send tenant invitation')
		},
		meta: { modalId }
	})

	const handleInvite = async () => {
		setIsSubmitting(true)
		try {
			await sendInvitation()
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleOpenModal = () => {
		openModal(modalId)
	}

	return (
		<>
			<Button variant="ghost" size="sm" onClick={handleOpenModal}>
				<Mail className="size-4" />
				Invite to Portal
			</Button>

			<CrudDialog mode="create" modalId={modalId}>
				<CrudDialogContent className="sm:max-w-lg">
					<CrudDialogHeader>
						<CrudDialogTitle>
							Invite {tenantName} to Tenant Portal
						</CrudDialogTitle>
						<CrudDialogDescription>
							Send an email invitation to {tenantEmail}. They'll receive a link
							to:
							<ul className="list-disc list-inside mt-2 space-y-1">
								<li>Pay rent online via Stripe</li>
								<li>Submit maintenance requests</li>
								<li>View lease documents</li>
								<li>Track payment history</li>
							</ul>
						</CrudDialogDescription>
					</CrudDialogHeader>

					<CrudDialogBody>
						<div className="bg-muted p-4 rounded-lg space-y-2">
							<p className="text-sm font-medium">What happens next?</p>
							<ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
								<li>Secure email sent to {tenantEmail} (via Supabase Auth)</li>
								<li>Tenant clicks invitation link (valid 24 hours)</li>
								<li>Tenant sets password & completes onboarding</li>
								<li>Tenant accesses their portal automatically</li>
							</ol>
							<p className="text-xs text-muted-foreground mt-2">
								Note: Invitation uses secure token authentication. You can
								resend if it expires.
							</p>
						</div>
					</CrudDialogBody>

					<CrudDialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => closeModal(modalId)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button onClick={handleInvite} disabled={isSubmitting}>
							{isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}
						</Button>
					</CrudDialogFooter>
				</CrudDialogContent>
			</CrudDialog>
		</>
	)
}
