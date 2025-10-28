'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { tenantsApi } from '#lib/api-client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const logger = createLogger({ component: 'InviteTenantDialog' })

interface InviteTenantDialogProps {
	tenantId: string
	tenantEmail: string
	tenantName: string
	propertyId?: string
	leaseId?: string
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
	tenantId,
	tenantEmail,
	tenantName,
	propertyId,
	leaseId,
	onSuccess
}: InviteTenantDialogProps) {
	const [open, setOpen] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleInvite = async () => {
		setIsSubmitting(true)
		try {
			// Use V2 endpoint (Supabase Auth) with optional property/lease context
			// Only pass defined values to avoid exactOptionalPropertyTypes errors
			const params: { propertyId?: string; leaseId?: string } = {}
			if (propertyId) params.propertyId = propertyId
			if (leaseId) params.leaseId = leaseId

			const invitationResponse = await tenantsApi.sendInvitationV2(tenantId, params)

			const logContext: Record<string, unknown> = {
				tenantId,
				response: invitationResponse
			}
			if (propertyId) logContext.propertyId = propertyId
			if (leaseId) logContext.leaseId = leaseId

			logger.info('Invitation sent via Supabase Auth', logContext)

			// Check if invitation was successful
			if (!invitationResponse.success) {
				throw new Error(invitationResponse.message || 'Failed to send invitation')
			}

			toast.success(
				`Invitation sent to ${tenantName}`,
				{
					description: `${tenantEmail} will receive a secure invitation link to access their tenant portal (valid for 24 hours).`
				}
			)

			setOpen(false)
			onSuccess?.()
		} catch (error) {
			const errorContext: Record<string, unknown> = {
				error: error instanceof Error ? error.message : String(error),
				tenantId
			}
			if (propertyId) errorContext.propertyId = propertyId
			if (leaseId) errorContext.leaseId = leaseId

			logger.error('Failed to invite tenant', errorContext)
			toast.error('Failed to send invitation', {
				description:
					error instanceof Error
						? error.message
						: 'Please try again or contact support.'
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="sm">
					<Mail className="size-4" />
					Invite to Portal
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Invite {tenantName} to Tenant Portal</DialogTitle>
					<DialogDescription>
						Send an email invitation to {tenantEmail}. They'll receive a link to:
						<ul className="list-disc list-inside mt-2 space-y-1">
							<li>Pay rent online via Stripe</li>
							<li>Submit maintenance requests</li>
							<li>View lease documents</li>
							<li>Track payment history</li>
						</ul>
					</DialogDescription>
				</DialogHeader>

				<div className="bg-muted p-4 rounded-lg space-y-2">
					<p className="text-sm font-medium">What happens next?</p>
					<ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
						<li>Secure email sent to {tenantEmail} (via Supabase Auth)</li>
						<li>Tenant clicks invitation link (valid 24 hours)</li>
						<li>Tenant sets password & completes onboarding</li>
						<li>Tenant accesses their portal automatically</li>
					</ol>
					<p className="text-xs text-muted-foreground mt-2">
						Note: Invitation uses secure token authentication. You can resend if it expires.
					</p>
				</div>

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
	)
}
