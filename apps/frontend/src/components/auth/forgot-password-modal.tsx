'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabaseClient } from '@repo/shared'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Info, Loader2, Mail } from 'lucide-react'
import { useState } from 'react'

interface ForgotPasswordModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
	const [email, setEmail] = useState('')
	const [isSubmitted, setIsSubmitted] = useState(false)

	// Reset state when modal closes
	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			setEmail('')
			setIsSubmitted(false)
			resetPasswordMutation.reset()
		}
		onOpenChange(newOpen)
	}

	const resetPasswordMutation = useMutation({
		mutationFn: async (email: string) => {
			// Always return success to prevent email enumeration
			// Supabase will only send email if user exists
			const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/update-password`
			})

			// Log error internally but don't expose to user
			if (error) {
				console.error('Password reset error:', error)
			}

			// Always show success to prevent email enumeration
			return { success: true }
		},
		onSuccess: () => {
			setIsSubmitted(true)
		}
	})

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (email) {
			resetPasswordMutation.mutate(email)
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				{!isSubmitted ? (
					<>
						<DialogHeader>
							<DialogTitle>Reset Password</DialogTitle>
							<DialogDescription>
								Enter your email address and we'll send you instructions to reset your password.
							</DialogDescription>
						</DialogHeader>

						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email">Email address</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										id="email"
										type="email"
										placeholder="Enter your email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className="pl-9"
										required
										disabled={resetPasswordMutation.isPending}
										autoFocus
									/>
								</div>
							</div>

							<Alert className="border-[var(--color-info-border)] bg-[var(--color-info-background)]">
								<Info className="h-4 w-4 text-[var(--color-info)]" />
								<AlertDescription className="text-sm text-[var(--color-info-foreground)]">
									For security reasons, we'll always show a success message.
									If an account exists with this email, you'll receive password reset instructions.
								</AlertDescription>
							</Alert>

							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => handleOpenChange(false)}
									disabled={resetPasswordMutation.isPending}
									className="flex-1"
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={resetPasswordMutation.isPending || !email}
									className="flex-1"
								>
									{resetPasswordMutation.isPending ? (
										<>
											<Loader2 className="w-4 h-4 mr-2 animate-spin" />
											Sending...
										</>
									) : (
										'Send Instructions'
									)}
								</Button>
							</div>
						</form>
					</>
				) : (
					<>
						<DialogHeader>
							<div className="mx-auto mb-4 w-12 h-12 rounded-full bg-[var(--color-success-background)] flex items-center justify-center">
								<CheckCircle2 className="w-6 h-6 text-[var(--color-success)]" />
							</div>
							<DialogTitle className="text-center">Check Your Email</DialogTitle>
							<DialogDescription className="text-center">
								We've sent password reset instructions to:
								<span className="block font-medium mt-2">{email}</span>
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4">
							<Alert>
								<Mail className="h-4 w-4" />
								<AlertDescription>
									<strong>If an account exists with this email</strong>, you'll receive
									a password reset link within the next few minutes.
								</AlertDescription>
							</Alert>

							<div className="text-sm text-muted-foreground space-y-2">
								<p>• Check your spam/junk folder if you don't see the email</p>
								<p>• The reset link will expire in 1 hour for security</p>
								<p>• You can request a new link if needed</p>
							</div>

							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => {
										setIsSubmitted(false)
										resetPasswordMutation.reset()
									}}
									className="flex-1"
								>
									Send Again
								</Button>
								<Button
									onClick={() => handleOpenChange(false)}
									className="flex-1"
								>
									Done
								</Button>
							</div>
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}