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
import { useSupabasePasswordReset } from '#hooks/api/use-auth'
import { useModalStore } from '#stores/modal-store'
import { CheckCircle2, Info, Mail } from 'lucide-react'
import { useState } from 'react'

export function ForgotPasswordModal() {
	const { closeModal, isModalOpen } = useModalStore()
	const [email, setEmail] = useState('')
	const [isSubmitted, setIsSubmitted] = useState(false)

	const resetPasswordMutation = useSupabasePasswordReset()

	const modalId = 'forgot-password'

	// Reset state when modal closes
	const handleOpenChange = () => {
		setEmail('')
		setIsSubmitted(false)
		resetPasswordMutation.reset()
		closeModal(modalId)
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
		<>
			{isModalOpen(modalId) && (
				<Dialog open={true} onOpenChange={handleOpenChange}>
					<DialogContent className="sm:max-w-md">
						{!isSubmitted ? (
							<>
								<DialogHeader>
									<DialogTitle>Reset Password</DialogTitle>
									<DialogDescription>
										Enter your email address and we&apos;ll send you
										instructions to reset your password.
									</DialogDescription>
								</DialogHeader>

								<form onSubmit={handleSubmit} className="space-y-[var(--spacing-4)]">
									<div className="space-y-[var(--spacing-2)]">
										<Label htmlFor="email">Email address</Label>
										<div className="relative">
											<Mail className="absolute left-[var(--spacing-3)] top-[50%] translate-y-[-50%] size-[var(--spacing-4)] text-muted-foreground" />
											<Input
												id="email"
												name="email"
												type="email"
												placeholder="Enter your email"
												autoComplete="email"
												value={email}
												onChange={e => setEmail(e.target.value)}
												className="pl-[var(--spacing-9)]"
												required
												disabled={resetPasswordMutation.isPending}
												autoFocus
											/>
										</div>
									</div>

									<Alert className="border-info bg-info/10">
										<Info className="size-[var(--spacing-4)] text-info" />
										<AlertDescription className="text-caption text-info-foreground">
											For security reasons, we&apos;ll always show a success
											message. If an account exists with this email, you&apos;ll
											receive password reset instructions.
										</AlertDescription>
									</Alert>

									<div className="flex gap-[var(--spacing-2)]">
										<Button
											type="button"
											variant="outline"
											onClick={handleOpenChange}
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
													<Spinner className="size-[var(--spacing-4)] mr-[var(--spacing-2)] animate-spin" />
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
									<div className="mx-auto mb-4 size-[var(--spacing-12)] rounded-full bg-success/10 flex items-center justify-center">
										<CheckCircle2 className="size-[var(--spacing-6)] text-success" />
									</div>
									<DialogTitle className="text-center">
										Check Your Email
									</DialogTitle>
									<DialogDescription className="text-center">
										We&apos;ve sent password reset instructions to:
										<span className="block font-medium mt-[var(--spacing-2)]">{email}</span>
									</DialogDescription>
								</DialogHeader>

								<div className="space-y-[var(--spacing-4)]">
									<Alert>
										<Mail className="size-[var(--spacing-4)]" />
										<AlertDescription>
											<strong>If an account exists with this email</strong>,
											you&apos;ll receive a password reset link within the next
											few minutes.
										</AlertDescription>
									</Alert>

									<div className="text-caption text-muted-foreground space-y-[var(--spacing-2)]">
										<p>
											• Check your spam/junk folder if you don&apos;t see the
											email
										</p>
										<p>• The reset link will expire in 1 hour for security</p>
										<p>• You can request a new link if needed</p>
									</div>

									<div className="flex gap-[var(--spacing-2)]">
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
										<Button onClick={handleOpenChange} className="flex-1">
											Done
										</Button>
									</div>
								</div>
							</>
						)}
					</DialogContent>
				</Dialog>
			)}
		</>
	)
}
