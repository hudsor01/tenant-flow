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
import { useMfaEnroll, useMfaVerify, useMfaUnenroll } from '#hooks/api/use-mfa'
import { logger } from '@repo/shared/lib/frontend-logger'
import { CheckCircle2, Copy, Loader2, Shield, ShieldOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface TwoFactorSetupDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

type SetupStep = 'qr' | 'verify' | 'success'

export function TwoFactorSetupDialog({
	open,
	onOpenChange,
	onSuccess
}: TwoFactorSetupDialogProps) {
	const enrollMfa = useMfaEnroll()
	const verifyMfa = useMfaVerify()

	const [step, setStep] = useState<SetupStep>('qr')
	const [verifyCode, setVerifyCode] = useState('')
	const [enrollmentData, setEnrollmentData] = useState<{
		factorId: string
		qrCode: string
		secret: string
	} | null>(null)

	// Start enrollment when dialog opens
	useEffect(() => {
		if (open && !enrollmentData && !enrollMfa.isPending) {
			enrollMfa.mutate(undefined, {
				onSuccess: data => {
					setEnrollmentData({
						factorId: data.factorId,
						qrCode: data.qrCode,
						secret: data.secret
					})
				}
			})
		}
	}, [open, enrollmentData, enrollMfa])

	// Reset state when dialog closes
	useEffect(() => {
		if (!open) {
			setStep('qr')
			setVerifyCode('')
			setEnrollmentData(null)
			enrollMfa.reset()
			verifyMfa.reset()
		}
	}, [open, enrollMfa, verifyMfa])

	const handleCopySecret = async () => {
		if (enrollmentData?.secret) {
			await navigator.clipboard.writeText(enrollmentData.secret)
			toast.success('Secret copied to clipboard')
		}
	}

	const handleVerify = async () => {
		if (!enrollmentData?.factorId || verifyCode.length !== 6) return

		try {
			await verifyMfa.mutateAsync({
				factorId: enrollmentData.factorId,
				code: verifyCode
			})
			setStep('success')
		} catch (error) {
			logger.error('MFA verification failed', {
				action: 'mfa_verify',
				metadata: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			})
			setVerifyCode('')
		}
	}

	const handleComplete = () => {
		onOpenChange(false)
		onSuccess?.()
	}

	const handleCancel = () => {
		onOpenChange(false)
	}

	const isLoading = enrollMfa.isPending || verifyMfa.isPending

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[480px]" intent="edit">
				{step === 'qr' && (
					<>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Shield className="size-5" />
								Set Up Two-Factor Authentication
							</DialogTitle>
							<DialogDescription>
								Scan the QR code with your authenticator app (Google
								Authenticator, Authy, etc.)
							</DialogDescription>
						</DialogHeader>
						<DialogBody className="space-y-6">
							{enrollMfa.isPending ? (
								<div className="flex-center py-12">
									<Loader2 className="size-8 animate-spin text-muted-foreground" />
								</div>
							) : enrollmentData?.qrCode ? (
								<>
									<div className="flex-center">
										<div className="rounded-lg border bg-white p-4">
											<img
												src={enrollmentData.qrCode}
												alt="QR Code for authenticator app"
												className="size-48"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<p className="text-sm font-medium">
											Or enter this code manually:
										</p>
										<div className="flex items-center gap-2">
											<code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm break-all">
												{enrollmentData.secret}
											</code>
											<Button
												type="button"
												variant="outline"
												size="icon"
												onClick={handleCopySecret}
												aria-label="Copy secret to clipboard"
											>
												<Copy className="size-4" />
											</Button>
										</div>
									</div>
								</>
							) : enrollMfa.error ? (
								<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
									<p className="text-destructive">
										Failed to start 2FA setup. Please try again.
									</p>
								</div>
							) : null}
						</DialogBody>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={handleCancel}
								disabled={isLoading}
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={() => setStep('verify')}
								disabled={!enrollmentData || isLoading}
							>
								Continue
							</Button>
						</DialogFooter>
					</>
				)}

				{step === 'verify' && (
					<>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Shield className="size-5" />
								Verify Your Code
							</DialogTitle>
							<DialogDescription>
								Enter the 6-digit code from your authenticator app to
								complete setup
							</DialogDescription>
						</DialogHeader>
						<DialogBody className="space-y-6">
							<div className="flex-center py-4">
								<InputOTP
									maxLength={6}
									value={verifyCode}
									onChange={setVerifyCode}
									disabled={verifyMfa.isPending}
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

							{verifyMfa.error && (
								<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center">
									<p className="text-sm text-destructive">
										Invalid code. Please try again.
									</p>
								</div>
							)}
						</DialogBody>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setStep('qr')}
								disabled={verifyMfa.isPending}
							>
								Back
							</Button>
							<Button
								type="button"
								onClick={handleVerify}
								disabled={verifyCode.length !== 6 || verifyMfa.isPending}
							>
								{verifyMfa.isPending ? (
									<>
										<Loader2 className="size-4 mr-2 animate-spin" />
										Verifying...
									</>
								) : (
									'Verify & Enable'
								)}
							</Button>
						</DialogFooter>
					</>
				)}

				{step === 'success' && (
					<>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2 text-success">
								<CheckCircle2 className="size-5" />
								Two-Factor Authentication Enabled
							</DialogTitle>
						</DialogHeader>
						<DialogBody>
							<div className="space-y-4 py-4 text-center">
								<div className="mx-auto size-16 rounded-full bg-success/10 flex-center">
									<Shield className="size-8 text-success" />
								</div>
								<div className="space-y-2">
									<p className="font-medium">
										Your account is now more secure
									</p>
									<p className="text-sm text-muted-foreground">
										You&apos;ll need your authenticator app to sign in
										from now on.
									</p>
								</div>
							</div>
						</DialogBody>
						<DialogFooter className="sm:justify-center">
							<Button type="button" onClick={handleComplete}>
								Done
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}

interface DisableTwoFactorDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	factorId: string
	onSuccess?: () => void
}

export function DisableTwoFactorDialog({
	open,
	onOpenChange,
	factorId,
	onSuccess
}: DisableTwoFactorDialogProps) {
	const unenrollMfa = useMfaUnenroll()

	const handleDisable = async () => {
		try {
			await unenrollMfa.mutateAsync(factorId)
			onOpenChange(false)
			onSuccess?.()
		} catch (error) {
			logger.error('Failed to disable 2FA', {
				action: 'mfa_unenroll',
				metadata: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			})
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[400px]" intent="delete">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-destructive">
						<ShieldOff className="size-5" />
						Disable Two-Factor Authentication
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to disable 2FA? This will make your
						account less secure.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={unenrollMfa.isPending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={handleDisable}
						disabled={unenrollMfa.isPending}
					>
						{unenrollMfa.isPending ? (
							<>
								<Loader2 className="size-4 mr-2 animate-spin" />
								Disabling...
							</>
						) : (
							'Disable 2FA'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
