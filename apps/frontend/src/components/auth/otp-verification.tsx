'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { Button } from '@/components/ui/button'
import { ANIMATION_DURATIONS, cn, TYPOGRAPHY_SCALE } from '@/lib/utils'
import { ArrowLeft, Loader2, Mail, Shield } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface OTPVerificationProps {
	onSubmit?: (otp: string) => void | Promise<void>
	onResend?: () => void | Promise<void>
	onBack?: () => void
	email?: string
	isLoading?: boolean
	className?: string
}

export function OTPVerification({
	onSubmit,
	onResend,
	onBack,
	email = 'john@example.com',
	isLoading = false,
	className
}: OTPVerificationProps) {
	const [otp, setOtp] = useState(['', '', '', '', '', ''])
	const [countdown, setCountdown] = useState(60)
	const [canResend, setCanResend] = useState(false)
	const inputRefs = useRef<(HTMLInputElement | null)[]>([])

	useEffect(() => {
		if (countdown > 0 && !canResend) {
			const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
			return () => clearTimeout(timer)
		} else if (countdown === 0 && !canResend) {
			setCanResend(true)
		}
		return undefined
	}, [countdown, canResend])

	const handleChange = (index: number, value: string) => {
		if (value.length > 1) return

		const newOtp = [...otp]
		newOtp[index] = value
		setOtp(newOtp)

		// Auto-focus next input
		if (value && index < 5) {
			inputRefs.current[index + 1]?.focus()
		}

		// Auto-submit when all filled
		if (newOtp.every(digit => digit) && value) {
			handleSubmit(newOtp.join(''))
		}
	}

	const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
		if (e.key === 'Backspace' && !otp[index] && index > 0) {
			inputRefs.current[index - 1]?.focus()
		}
	}

	const handleSubmit = async (otpValue: string) => {
		await onSubmit?.(otpValue)
	}

	const handleResend = async () => {
		setCountdown(60)
		setCanResend(false)
		await onResend?.()
	}

	return (
		<div
			className={cn(
				'min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-accent/5',
				className
			)}
		>
			<div className="w-full max-w-md">
				<BlurFade delay={0.2} inView>
					<div className="bg-background rounded-3xl card-padding shadow-2xl border border-border">
						{/* Header */}
						<div className="text-center mb-8">
							<div className="flex justify-center mb-6">
								<div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary to-accent flex items-center justify-center">
									<Shield className="h-8 w-8 text-white" />
								</div>
							</div>

							<BlurFade delay={0.3} inView>
								<h1 className="text-2xl font-bold text-foreground mb-2">
									Verify Your Email
								</h1>
								<p className="text-muted-foreground mb-4">
									We've sent a verification code to
								</p>
								<p className="text-primary font-semibold">{email}</p>
							</BlurFade>
						</div>

						{/* OTP Input */}
						<BlurFade delay={0.4} inView>
							<div className="mb-8">
								<div className="flex gap-3 justify-center mb-6">
									{otp.map((digit, index) => (
										<input
											key={index}
											ref={el => {
												inputRefs.current[index] = el
											}}
											type="text"
											inputMode="numeric"
											pattern="[0-9]"
											maxLength={1}
											value={digit}
											onChange={e => handleChange(index, e.target.value)}
											onKeyDown={e => handleKeyDown(index, e)}
											className={cn(
												'w-12 h-12 text-center font-bold rounded-10px border-2',
												`transition-all duration-[${ANIMATION_DURATIONS.default}]`,
												'border-border bg-muted',
												'focus:border-primary focus:bg-background',
												'focus:ring-3 focus:ring-primary/20',
												'hover:border-border',
												'disabled:opacity-50 disabled:cursor-not-allowed',
												digit && 'border-primary/50 bg-primary/5'
											)}
											style={{
												fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize,
												lineHeight: TYPOGRAPHY_SCALE['heading-lg'].lineHeight,
												fontWeight: TYPOGRAPHY_SCALE['heading-lg'].fontWeight
											}}
											disabled={isLoading}
										/>
									))}
								</div>

								<div className="text-center">
									{!canResend ? (
										<p className="text-muted-foreground text-sm">
											Resend code in{' '}
											<span className="font-semibold text-primary">
												<NumberTicker value={countdown} />
											</span>
											s
										</p>
									) : (
										<button
											onClick={handleResend}
											className="text-primary hover:text-primary/80 text-sm font-semibold transition-colors"
											disabled={isLoading}
										>
											Didn't receive the code? Resend
										</button>
									)}
								</div>
							</div>
						</BlurFade>

						{/* Submit Button */}
						<BlurFade delay={0.5} inView>
							<Button
								onClick={() => handleSubmit(otp.join(''))}
								disabled={otp.some(digit => !digit) || isLoading}
								className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isLoading ? (
									<>
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
										Verifying...
									</>
								) : (
									'Verify Code'
								)}
							</Button>
						</BlurFade>

						{/* Footer */}
						<BlurFade delay={0.6} inView>
							<div className="mt-8 pt-6 border-t border-border">
								<div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
									<Mail className="w-4 h-4" />
									<span>Check your spam folder if you don't see the email</span>
								</div>

								{onBack && (
									<div className="text-center mt-4">
										<button
											onClick={onBack}
											className="inline-flex items-center text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
										>
											<ArrowLeft className="w-4 h-4 mr-1" />
											Back to login
										</button>
									</div>
								)}
							</div>
						</BlurFade>
					</div>
				</BlurFade>
			</div>
		</div>
	)
}
