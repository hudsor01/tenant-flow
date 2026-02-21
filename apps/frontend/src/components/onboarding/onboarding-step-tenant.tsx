'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { toast } from 'sonner'

interface OnboardingStepTenantProps {
	onNext: () => void
	onSkip: () => void
}

interface CreateTenantResponse {
	id: string
	email: string | null
	name: string | null
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

	const createTenant = useMutation({
		mutationFn: (data: { email: string; name: string }) =>
			apiRequest<CreateTenantResponse>('/api/v1/tenants', {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onSuccess: data => {
			toast.success('Invitation sent', {
				description: `${data?.name ?? data?.email ?? 'Tenant'} will receive an email invitation`
			})
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			onNext()
		},
		onError: () => {
			toast.error('Failed to send invitation. Please try again.')
		}
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (!email.trim() || !firstName.trim() || !lastName.trim()) {
			return
		}

		createTenant.mutate({
			email: email.trim(),
			name: `${firstName.trim()} ${lastName.trim()}`
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
						disabled={createTenant.isPending}
						className="min-h-11 flex-1"
					>
						{createTenant.isPending ? 'Sending...' : 'Send Invitation'}
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
