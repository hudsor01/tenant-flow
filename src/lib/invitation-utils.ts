import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { CreateInvitationResult } from '#hooks/api/use-create-invitation'

/**
 * Handle duplicate invitation result from useCreateInvitation().
 * Shows info toast with resend action button per D-07.
 */
export function handleDuplicateInvitation(
	existing: Extract<CreateInvitationResult, { status: 'duplicate' }>['existing'],
	onResend: (invitationId: string) => void
): void {
	const sentAgo = existing.created_at
		? formatDistanceToNow(new Date(existing.created_at), { addSuffix: true })
		: 'recently'
	toast.info(
		`${existing.email} already has a pending invitation (sent ${sentAgo})`,
		{
			action: {
				label: 'Resend',
				onClick: () => onResend(existing.id)
			}
		}
	)
}
