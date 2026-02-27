'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'

interface OnboardingStepTenantProps {
	onNext: () => void
	onSkip: () => void
}

/**
 * Tenant step - simplified tenant invitation form in the onboarding wizard
 */
export function OnboardingStepTenant({
	onNext,
	onSkip
}: OnboardingStepTenantProps) {
	const queryClient = useQueryClient()

	const [email, setEmail] = useState('')
	const [firstName, setFirstName] = useState('')
	const [lastName, setLastName] = useState('')

	const inviteTenant = useMutation({
		mutationFn: async (data: {
			tenantData: { email: string; first_name: string; last_name: string }
		}) => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')

			const invitationCode = crypto.randomUUID()
			const appBaseUrl =
				process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3050'
			const invitationUrl = `${appBaseUrl}/auth/accept-invitation?code=${invitationCode}`
			const expiresAt = new Date(
				Date.now() + 7 * 24 * 60 * 60 * 1000
			).toISOString()

			const { error } = await supabase.from('tenant_invitations').insert({
				email: data.tenantData.email,
				owner_user_id: user.id,
				invitation_code: invitationCode,
				invitation_url: invitationUrl,
				expires_at: expiresAt,
				status: 'sent',
				type: 'portal_access'
			})

			if (error) throw error
		},
		onSuccess: () => {
			toast.success('Invitation sent', {
				description: `${firstName.trim()} ${lastName.trim()} will receive an email invitation`
			})
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			onNext()
		},
		onError: (error: unknown) => {
			handleMutationError(error, 'Invite tenant')
		}
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (!email.trim() || !firstName.trim() || !lastName.trim()) {
			return
		}

		inviteTenant.mutate({
			tenantData: {
				email: email.trim(),
				first_name: firstName.trim(),
				last_name: lastName.trim()
			}
		})
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-3">
				<div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
					<Users className="w-5 h-5 text-primary" aria-hidden="true" />
				</div>
				<div>
					<h3 className="font-semibold">Invite Your First Tenant</h3>
					<p className="text-sm text-muted-foreground">
						Send an invitation email to your tenant.
					</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-3">
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1.5">
						<Label htmlFor="onboarding-tenant-first-name">First Name</Label>
						<Input
							id="onboarding-tenant-first-name"
							value={firstName}
							onChange={e => setFirstName(e.target.value)}
							placeholder="Jane"
							required
							className="h-11"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="onboarding-tenant-last-name">Last Name</Label>
						<Input
							id="onboarding-tenant-last-name"
							value={lastName}
							onChange={e => setLastName(e.target.value)}
							placeholder="Smith"
							required
							className="h-11"
						/>
					</div>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="onboarding-tenant-email">Email Address</Label>
					<Input
						id="onboarding-tenant-email"
						type="email"
						value={email}
						onChange={e => setEmail(e.target.value)}
						placeholder="jane@example.com"
						required
						className="h-11"
					/>
				</div>

				<div className="flex gap-2 pt-2">
					<Button
						type="submit"
						disabled={inviteTenant.isPending}
						className="min-h-11 flex-1"
					>
						{inviteTenant.isPending ? 'Sending...' : 'Send Invitation'}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={onSkip}
						className="min-h-11"
					>
						Skip
					</Button>
				</div>
			</form>
		</div>
	)
}
