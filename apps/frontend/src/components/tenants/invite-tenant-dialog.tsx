'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogBody
} from '#components/ui/dialog'
import { handleMutationError } from '#lib/mutation-error-handler'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { apiRequest } from '#lib/api-request'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
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
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [open, setOpen] = useState(false)

	const { mutateAsync: sendInvitation } = useMutation({
		mutationFn: async () => {
			// Use V2 endpoint (Supabase Auth) with optional property/lease context
			// Only pass defined values to avoid exactOptionalPropertyTypes errors
			const params: { property_id?: string; lease_id?: string } = {}
			if (property_id) params.property_id = property_id
			if (lease_id) params.lease_id = lease_id

			const invitationResponse = await apiRequest<{
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
			setOpen(false)
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
		}
	})

	const handleInvite = async () => {
		setIsSubmitting(true)
		try {
			await sendInvitation()
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<>
			<Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
				<Mail className="size-4" />
				Invite to Portal
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent intent="create" className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Invite {tenantName} to Tenant Portal</DialogTitle>
						<DialogDescription>
							Send an email invitation to {tenantEmail}. They'll receive a link
							to:
							<ul className="list-disc list-inside mt-2 space-y-1">
								<li>Pay rent online via Stripe</li>
								<li>Submit maintenance requests</li>
								<li>View lease documents</li>
								<li>Track payment history</li>
							</ul>
						</DialogDescription>
					</DialogHeader>

					<DialogBody>
						<div className="bg-muted p-4 rounded-lg space-y-2">
							<p className="typography-small">What happens next?</p>
							<ol className="text-muted space-y-1 list-decimal list-inside">
								<li>Secure email sent to {tenantEmail} (via Supabase Auth)</li>
								<li>Tenant clicks invitation link (valid 24 hours)</li>
								<li>Tenant sets password & completes onboarding</li>
								<li>Tenant accesses their portal automatically</li>
							</ol>
							<p className="text-caption mt-2">
								Note: Invitation uses secure token authentication. You can
								resend if it expires.
							</p>
						</div>
					</DialogBody>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button onClick={handleInvite} disabled={isSubmitting}>
							{isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
