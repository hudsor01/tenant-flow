'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { Label } from '#components/ui/label'
import { Input } from '#components/ui/input'
import { Button } from '#components/ui/button'
import { Loader2, Mail, UserPlus } from 'lucide-react'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { tenantInvitationQueries } from '#hooks/api/query-keys/tenant-invitation-keys'

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
	const queryClient = useQueryClient()
	const [inviteForm, setInviteForm] = useState<InviteFormData>({
		first_name: '',
		last_name: '',
		email: '',
		phone: ''
	})

	const inviteMutation = useMutation({
		mutationFn: async (inviteData: InviteFormData) => {
			const supabase = createClient()
			const user = await getCachedUser()
			const ownerId = requireOwnerUserId(user?.id)

			const invitationCode = crypto.randomUUID()
			const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3050'
			const invitationUrl = `${appBaseUrl}/auth/accept-invitation?code=${invitationCode}`
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

			const { error } = await supabase
				.from('tenant_invitations')
				.insert({
					email: inviteData.email,
					owner_user_id: ownerId,
					property_id: propertyId ?? null,
					invitation_code: invitationCode,
					invitation_url: invitationUrl,
					expires_at: expiresAt,
					status: 'sent',
					type: 'lease_signing'
				})

			if (error) throw new Error(error.message || 'Failed to send invitation')
		},
		onSuccess: () => {
			toast.success('Invitation sent', {
				description: `${inviteForm.first_name} ${inviteForm.last_name} will receive an email to join`
			})
			onToggleMode()
			setInviteForm({ first_name: '', last_name: '', email: '', phone: '' })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantInvitationQueries.invitations() })
		},
		onError: (error: Error) => {
			toast.error(error.message)
		}
	})

	const handleSendInvite = () => {
		if (!inviteForm.first_name || !inviteForm.last_name || !inviteForm.email) return
		inviteMutation.mutate(inviteForm)
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
				disabled={!isInviteFormValid || inviteMutation.isPending}
			>
				{inviteMutation.isPending ? (
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
