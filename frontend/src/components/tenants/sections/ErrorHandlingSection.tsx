import React from 'react'
import { AlertCircle, Send, X, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorHandlingSectionProps {
	pendingInvitationError: { message: string; tenantId?: string } | null
	isResending: boolean
	isDeleting: boolean
	onResendInvitation: () => Promise<void>
	onDeletePendingInvitation: () => Promise<void>
}

/**
 * Error handling section component for the invite tenant modal
 * Displays pending invitation errors and resend/delete options
 */
export function ErrorHandlingSection({
	pendingInvitationError,
	isResending,
	isDeleting,
	onResendInvitation,
	onDeletePendingInvitation
}: ErrorHandlingSectionProps) {
	if (pendingInvitationError) {
		return (
			<div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
				<div className="space-y-3">
					<div className="flex items-start space-x-3">
						<AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
						<div className="text-sm">
							<p className="mb-1 font-medium text-amber-900">
								Invitation Already Pending
							</p>
							<p className="mb-3 text-amber-700">
								{pendingInvitationError.message}
							</p>
						</div>
					</div>

					<div className="flex space-x-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onResendInvitation}
							disabled={isResending}
							className="border-amber-300 text-amber-700 hover:bg-amber-100"
						>
							{isResending ? (
								<div className="flex items-center">
									<div className="mr-1 h-3 w-3 animate-spin rounded-full border-b-2 border-amber-600"></div>
									Resending...
								</div>
							) : (
								<>
									<Send className="mr-1 h-3 w-3" />
									Resend Invitation
								</>
							)}
						</Button>

						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onDeletePendingInvitation}
							disabled={isDeleting}
							className="border-red-300 text-red-700 hover:bg-red-50"
						>
							{isDeleting ? (
								<div className="flex items-center">
									<div className="mr-1 h-3 w-3 animate-spin rounded-full border-b-2 border-red-600"></div>
									Deleting...
								</div>
							) : (
								<>
									<X className="mr-1 h-3 w-3" />
									Delete & Retry
								</>
							)}
						</Button>
					</div>
				</div>
			</div>
		)
	}

	// Information box when no errors
	return (
		<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
			<div className="flex items-start space-x-3">
				<Mail className="mt-0.5 h-5 w-5 text-blue-600" />
				<div className="text-sm">
					<p className="mb-1 font-medium text-blue-900">
						Invitation Process
					</p>
					<p className="text-blue-700">
						The tenant will receive an email invitation with a
						secure link to create their account and access their
						tenant portal. They'll be able to view lease
						information, make payments, and submit maintenance
						requests.
					</p>
				</div>
			</div>
		</div>
	)
}
