import { Button } from '#components/ui/button'
import {
	DialogBody,
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
import { CheckCircle2, Copy, Loader2, Shield } from 'lucide-react'

interface EnrollmentData {
	factorId: string
	qrCode: string
	secret: string
}

interface QrStepProps {
	enrollmentData: EnrollmentData | null
	enrollPending: boolean
	enrollError: unknown
	isLoading: boolean
	onCopySecret: () => void
	onContinue: () => void
	onCancel: () => void
}

export function QrStep({
	enrollmentData,
	enrollPending,
	enrollError,
	isLoading,
	onCopySecret,
	onContinue,
	onCancel
}: QrStepProps) {
	return (
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
				{enrollPending ? (
					<div className="flex-center py-12">
						<Loader2 className="size-8 animate-spin text-muted-foreground" />
					</div>
				) : enrollmentData?.qrCode ? (
					<>
						<div className="flex-center">
							{/* bg-white intentional: QR codes require white background for scanning */}
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
									onClick={onCopySecret}
									aria-label="Copy secret to clipboard"
								>
									<Copy className="size-4" />
								</Button>
							</div>
						</div>
					</>
				) : enrollError ? (
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
					onClick={onCancel}
					disabled={isLoading}
				>
					Cancel
				</Button>
				<Button
					type="button"
					onClick={onContinue}
					disabled={!enrollmentData || isLoading}
				>
					Continue
				</Button>
			</DialogFooter>
		</>
	)
}

interface VerifyStepProps {
	verifyCode: string
	onVerifyCodeChange: (code: string) => void
	verifyPending: boolean
	verifyError: unknown
	onVerify: () => void
	onBack: () => void
}

export function VerifyStep({
	verifyCode,
	onVerifyCodeChange,
	verifyPending,
	verifyError,
	onVerify,
	onBack
}: VerifyStepProps) {
	return (
		<>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-2">
					<Shield className="size-5" />
					Verify Your Code
				</DialogTitle>
				<DialogDescription>
					Enter the 6-digit code from your authenticator app to complete
					setup
				</DialogDescription>
			</DialogHeader>
			<DialogBody className="space-y-6">
				<div className="flex-center py-4">
					<InputOTP
						maxLength={6}
						value={verifyCode}
						onChange={onVerifyCodeChange}
						disabled={verifyPending}
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

				{verifyError !== null && (
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
					onClick={onBack}
					disabled={verifyPending}
				>
					Back
				</Button>
				<Button
					type="button"
					onClick={onVerify}
					disabled={verifyCode.length !== 6 || verifyPending}
				>
					{verifyPending ? (
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
	)
}

interface SuccessStepProps {
	onComplete: () => void
}

export function SuccessStep({ onComplete }: SuccessStepProps) {
	return (
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
						<p className="font-medium">Your account is now more secure</p>
						<p className="text-sm text-muted-foreground">
							You&apos;ll need your authenticator app to sign in from now
							on.
						</p>
					</div>
				</div>
			</DialogBody>
			<DialogFooter className="sm:justify-center">
				<Button type="button" onClick={onComplete}>
					Done
				</Button>
			</DialogFooter>
		</>
	)
}
