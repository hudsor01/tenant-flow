'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle, Lock } from 'lucide-react'

const supabase = createClient()

/**
 * Accept Invite Page - Tenant Onboarding
 *
 * Flow:
 * 1. Landlord creates tenant via `/billing/invite-tenant` endpoint
 * 2. Tenant receives email with invitation link
 * 3. Tenant clicks link → lands here with token & type=invite in URL
 * 4. Tenant sets password → account activated with TENANT role
 * 5. Redirected to `/tenant`
 *
 * Official Supabase pattern: verifyOtp with type 'invite'
 */
export default function AcceptInvitePage() {
	const router = useRouter()
	const searchParams = useSearchParams()

	const [status, setStatus] = useState<
		'loading' | 'ready' | 'success' | 'error'
	>('loading')
	const [errorMessage, setErrorMessage] = useState<string>('')
	const [password, setPassword] = useState<string>('')
	const [confirmPassword, setConfirmPassword] = useState<string>('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	useEffect(() => {
		async function verifyInviteToken() {
			try {
				const token = searchParams.get('token')
				const type = searchParams.get('type')

				if (!token || type !== 'invite') {
					setStatus('error')
					setErrorMessage('Invalid or missing invitation token')
					return
				}

				setStatus('ready')
			} catch {
				setStatus('error')
				setErrorMessage('Failed to verify invitation token')
			}
		}

		verifyInviteToken()
	}, [searchParams])

	async function handleAcceptInvite(e: React.FormEvent) {
		e.preventDefault()

		if (password.length < 8) {
			setErrorMessage('Password must be at least 8 characters')
			return
		}

		if (password !== confirmPassword) {
			setErrorMessage('Passwords do not match')
			return
		}

		setIsSubmitting(true)
		setErrorMessage('')

		try {
			const token = searchParams.get('token')
			if (!token) throw new Error('Missing invitation token')

			// Verify OTP & activate user
			const { data, error } = await supabase.auth.verifyOtp({
				token_hash: token,
				type: 'invite'
			})

			if (error) throw error
			if (!data.user) throw new Error('No user data returned')

			// Set password
			const { error: updateError } = await supabase.auth.updateUser({
				password
			})
			if (updateError) throw updateError

			setStatus('success')

			setTimeout(() => {
				router.push('/tenant')
			}, 2000)
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : 'Failed to accept invitation'
			)
			setIsSubmitting(false)
		}
	}

	if (status === 'loading') {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Spinner className="h-5 w-5 animate-spin" />
							Verifying invitation
						</CardTitle>
						<CardDescription>Please wait...</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-center py-8">
							<Spinner className="h-12 w-12 animate-spin text-muted-foreground" />
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (status === 'error') {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-destructive">
							<AlertCircle className="h-5 w-5" />
							Invalid Invitation
						</CardTitle>
						<CardDescription>This invitation link is not valid</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{errorMessage}</AlertDescription>
						</Alert>
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => router.push('/')}>
								Go Home
							</Button>
							<Button onClick={() => router.push('/login')}>Sign In</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (status === 'success') {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-green-600">
							<CheckCircle className="h-5 w-5" />
							Welcome to TenantFlow!
						</CardTitle>
						<CardDescription>Your account has been activated</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50">
							<CheckCircle className="h-4 w-4 text-green-600" />
							<AlertDescription className="text-green-900 dark:text-green-100">
								Redirecting you to your tenant portal...
							</AlertDescription>
						</Alert>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Lock className="h-5 w-5" />
						Set Your Password
					</CardTitle>
					<CardDescription>
						Create a password to access your tenant portal
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleAcceptInvite} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="Enter password (min 8 characters)"
								value={password}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setPassword(e.target.value)
								}
								disabled={isSubmitting}
								required
								minLength={8}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm Password</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="Re-enter password"
								value={confirmPassword}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setConfirmPassword(e.target.value)
								}
								disabled={isSubmitting}
								required
								minLength={8}
							/>
						</div>

						{errorMessage && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>{errorMessage}</AlertDescription>
							</Alert>
						)}

						<Button
							type="submit"
							className="w-full"
							disabled={isSubmitting || !password || !confirmPassword}
						>
							{isSubmitting ? (
								<>
									<Spinner className="mr-2 h-4 w-4 animate-spin" />
									Activating account...
								</>
							) : (
								'Activate Account'
							)}
						</Button>

						<p className="text-xs text-muted-foreground text-center">
							By activating your account, you agree to our Terms of Service and
							Privacy Policy.
						</p>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
