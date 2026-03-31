'use client'

import { useState } from 'react'
import { Label } from '#components/ui/label'
import { Input } from '#components/ui/input'
import { Button } from '#components/ui/button'
import { Loader2, Mail, UserPlus } from 'lucide-react'
import { useCreateInvitation } from '#hooks/api/use-create-invitation'
import { useResendInvitationMutation } from '#hooks/api/use-tenant-invite-mutations'
import { handleDuplicateInvitation } from '#lib/invitation-utils'

interface InviteFormData {
	first_name: string
	last_name: string
	email: string
	phone: string
}

interface InlineTenantInviteProps {
	propertyId: string | undefined
	onToggleMode: () => void
}

export function InlineTenantInvite({ propertyId, onToggleMode }: InlineTenantInviteProps) {
	const [inviteForm, setInviteForm] = useState<InviteFormData>({
		first_name: '',
		last_name: '',
		email: '',
		phone: ''
	})

	const createInvitation = useCreateInvitation()
	const resendInvitation = useResendInvitationMutation()

	const handleSendInvite = async () => {
		if (!inviteForm.first_name || !inviteForm.last_name || !inviteForm.email) return

		try {
			const result = await createInvitation.mutateAsync({
				email: inviteForm.email,
				property_id: propertyId
			})

			if (result.status === 'duplicate') {
				handleDuplicateInvitation(result.existing, resendInvitation.mutate)
				return
			}

			// Hook handles toast + cache. Consumer handles onToggleMode().
			onToggleMode()
			setInviteForm({ first_name: '', last_name: '', email: '', phone: '' })
		} catch {
			// Error handled by hook onError callback
		}
	}

	const isInviteFormValid = inviteForm.first_name && inviteForm.last_name && inviteForm.email

	return (
		<div className="space-y-3 rounded-md border border-border p-4">
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1">
					<Label htmlFor="invite_first_name">First Name *</Label>
					<Input
						id="invite_first_name"
						value={inviteForm.first_name}
						onChange={e =>
							setInviteForm(f => ({ ...f, first_name: e.target.value }))
						}
						placeholder="Jane"
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor="invite_last_name">Last Name *</Label>
					<Input
						id="invite_last_name"
						value={inviteForm.last_name}
						onChange={e =>
							setInviteForm(f => ({ ...f, last_name: e.target.value }))
						}
						placeholder="Doe"
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1">
					<Label htmlFor="invite_email">Email *</Label>
					<Input
						id="invite_email"
						type="email"
						value={inviteForm.email}
						onChange={e =>
							setInviteForm(f => ({ ...f, email: e.target.value }))
						}
						placeholder="jane@example.com"
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor="invite_phone">Phone</Label>
					<Input
						id="invite_phone"
						type="tel"
						value={inviteForm.phone}
						onChange={e =>
							setInviteForm(f => ({ ...f, phone: e.target.value }))
						}
						placeholder="(555) 123-4567"
					/>
				</div>
			</div>
			<Button
				type="button"
				size="sm"
				onClick={handleSendInvite}
				disabled={!isInviteFormValid || createInvitation.isPending}
			>
				{createInvitation.isPending ? (
					<>
						<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
						Sending...
					</>
				) : (
					<>
						<UserPlus className="mr-2 h-3.5 w-3.5" />
						Send Invitation
					</>
				)}
			</Button>
		</div>
	)
}

export function TenantModeToggle({
	inviteMode,
	onToggle
}: {
	inviteMode: boolean
	onToggle: () => void
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			onClick={onToggle}
		>
			{inviteMode ? (
				'Existing Tenant'
			) : (
				<>
					<Mail className="mr-1.5 h-3.5 w-3.5" />
					Invite New Tenant
				</>
			)}
		</Button>
	)
}
