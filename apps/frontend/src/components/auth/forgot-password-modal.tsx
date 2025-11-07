'use client'

import { Alert, AlertDescription } from '#components/ui/alert'
import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { Spinner } from '#components/ui/spinner'
import { useSupabasePasswordReset } from '#hooks/api/use-supabase-auth'
import { CheckCircle2, Info, Mail } from 'lucide-react'
import { useState } from 'react'

interface ForgotPasswordModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function ForgotPasswordModal({
	open,
	onOpenChange
}: ForgotPasswordModalProps) {
	const [email, setEmail] = useState('')
	const [isSubmitted, setIsSubmitted] = useState(false)

	const resetPasswordMutation = useSupabasePasswordReset()

	// Reset state when modal closes
	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			setEmail('')
			setIsSubmitted(false)
			resetPasswordMutation.reset()
		}
		onOpenChange(newOpen)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (email) {
			resetPasswordMutation.mutate(email, {
				onSuccess: () => setIsSubmitted(true),
				onError: () => {
					// Display generic message without leaking email existence
					setIsSubmitted(true)
				}
			})
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
								Enter your email address and we&apos;ll send you instructions to
								reset your password.
							</DialogDescription>
						</DialogHeader>

						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email">Email address</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 translate-y-[-50%] size-4 text-muted-foreground" />
									<Input
										id="email"
										name="email"
										type="email"
										placeholder="Enter your email"
										autoComplete="email"
										value={email}
										onChange={e => setEmail(e.target.value)}
										className="pl-9"
										required
										disabled={resetPasswordMutation.isPending}
										autoFocus
									/>
								</div>
							</div>

							<Alert className="border-info bg-info/10">
					<Info className="size-4 text-info" />
					<AlertDescription className="text-sm text-info-foreground">
									For security reasons, we&apos;ll always show a success message. If
									an account exists with this email, you&apos;ll receive password
									reset instructions.
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
											<Spinner className="size-4 mr-2 animate-spin" />
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
							<div className="mx-auto mb-4 size-12 rounded-full bg-success/10 flex items-center justify-center">
						<CheckCircle2 className="size-6 text-success" />
							</div>
							<DialogTitle className="text-center">
								Check Your Email
							</DialogTitle>
							<DialogDescription className="text-center">
								We&apos;ve sent password reset instructions to:
								<span className="block font-medium mt-2">{email}</span>
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4">
							<Alert>
								<Mail className="size-4" />
								<AlertDescription>
									<strong>If an account exists with this email</strong>, you&apos;ll
									receive a password reset link within the next few minutes.
								</AlertDescription>
							</Alert>

							<div className="text-sm text-muted-foreground space-y-2">
								<p>• Check your spam/junk folder if you don&apos;t see the email</p>
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
