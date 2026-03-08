'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { useMfaEnrollMutation, useMfaVerifyMutation, useMfaUnenrollMutation } from '#hooks/api/use-mfa'
import { logger } from '#lib/frontend-logger.js'
import { Loader2, ShieldOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { QrStep, VerifyStep, SuccessStep } from './two-factor-setup-steps'

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
	const enrollMfa = useMfaEnrollMutation()
	const verifyMfa = useMfaVerifyMutation()

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

	const isLoading = enrollMfa.isPending || verifyMfa.isPending

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[480px]" intent="edit">
				{step === 'qr' && (
					<QrStep
						enrollmentData={enrollmentData}
						enrollPending={enrollMfa.isPending}
						enrollError={enrollMfa.error}
						isLoading={isLoading}
						onCopySecret={handleCopySecret}
						onContinue={() => setStep('verify')}
						onCancel={() => onOpenChange(false)}
					/>
				)}

				{step === 'verify' && (
					<VerifyStep
						verifyCode={verifyCode}
						onVerifyCodeChange={setVerifyCode}
						verifyPending={verifyMfa.isPending}
						verifyError={verifyMfa.error}
						onVerify={handleVerify}
						onBack={() => setStep('qr')}
					/>
				)}

				{step === 'success' && (
					<SuccessStep onComplete={handleComplete} />
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
	const unenrollMfa = useMfaUnenrollMutation()

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
						Are you sure you want to disable 2FA? This will make your account
						less secure.
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
