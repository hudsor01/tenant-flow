'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
	InputOTPSeparator
} from '#components/ui/input-otp'
import { createClient } from '#utils/supabase/client'
import { logger } from '@repo/shared/lib/frontend-logger'
import { Loader2, Shield } from 'lucide-react'
import { useState } from 'react'

interface MfaVerificationDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	factorId: string
	onSuccess: () => void
	onCancel: () => void
}

/**
 * MFA Verification Dialog
 * Shown during login when the user has 2FA enabled and needs to complete the second factor.
 */
export function MfaVerificationDialog({
	open,
	onOpenChange,
	factorId,
	onSuccess,
	onCancel
}: MfaVerificationDialogProps) {
	const [code, setCode] = useState('')
	const [isVerifying, setIsVerifying] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleVerify = async () => {
		if (code.length !== 6) return

		setIsVerifying(true)
		setError(null)

		try {
			const supabase = createClient()

			// Create a challenge
			const { data: challengeData, error: challengeError } =
				await supabase.auth.mfa.challenge({ factorId })

			if (challengeError) {
				throw challengeError
			}

			// Verify the code
			const { error: verifyError } = await supabase.auth.mfa.verify({
				factorId,
				challengeId: challengeData.id,
				code
			})

			if (verifyError) {
				throw verifyError
			}

			logger.info('MFA verification successful during login')
			onSuccess()
		} catch (err) {
			logger.error('MFA verification failed during login', {
				action: 'mfa_login_verify',
				metadata: {
					error: err instanceof Error ? err.message : 'Unknown error'
				}
			})
			setError('Invalid code. Please try again.')
			setCode('')
		} finally {
			setIsVerifying(false)
		}
	}

	const handleCancel = () => {
		setCode('')
		setError(null)
		onCancel()
	}

	// Auto-submit when 6 digits are entered
	const handleCodeChange = (value: string) => {
		setCode(value)
		setError(null)
		if (value.length === 6) {
			// Small delay to show the completed input before verifying
			setTimeout(() => {
				handleVerify()
			}, 100)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[400px]" intent="default">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Shield className="size-5 text-primary" />
						Two-Factor Authentication
					</DialogTitle>
					<DialogDescription>
						Enter the 6-digit code from your authenticator app to complete
						sign in
					</DialogDescription>
				</DialogHeader>
				<DialogBody className="space-y-6">
					<div className="flex-center py-4">
						<InputOTP
							maxLength={6}
							value={code}
							onChange={handleCodeChange}
							disabled={isVerifying}
							autoFocus
							containerClassName="gap-4"
						>
							<InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:h-14 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl">
								<InputOTPSlot index={0} />
								<InputOTPSlot index={1} />
								<InputOTPSlot index={2} />
							</InputOTPGroup>
							<InputOTPSeparator />
							<InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:h-14 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl">
								<InputOTPSlot index={3} />
								<InputOTPSlot index={4} />
								<InputOTPSlot index={5} />
							</InputOTPGroup>
						</InputOTP>
					</div>

					{error && (
						<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center">
							<p className="text-sm text-destructive">{error}</p>
						</div>
					)}

					{isVerifying && (
						<div className="flex-center gap-2 text-muted-foreground">
							<Loader2 className="size-4 animate-spin" />
							<span className="text-sm">Verifying...</span>
						</div>
					)}
				</DialogBody>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={handleCancel}
						disabled={isVerifying}
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleVerify}
						disabled={code.length !== 6 || isVerifying}
					>
						{isVerifying ? (
							<>
								<Loader2 className="size-4 mr-2 animate-spin" />
								Verifying...
							</>
						) : (
							'Verify'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
