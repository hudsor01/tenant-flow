'use client'

import { GridPattern } from '#components/ui/grid-pattern'
import { createClient } from '#lib/supabase/client'
import { logger } from '#lib/frontend-logger.js'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
	ConfirmEmailActions,
	ConfirmEmailErrorBanner,
	ConfirmEmailFooter,
	ConfirmEmailHeader,
	ConfirmEmailImagePanel,
	ConfirmEmailInstructions,
	ConfirmEmailMobileLogo
} from './confirm-email-states'

const RESEND_COOLDOWN_SECONDS = 60

function ConfirmEmailContent() {
	const [isResending, setIsResending] = useState(false)
	const [cooldownSeconds, setCooldownSeconds] = useState(0)
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const searchParams = useSearchParams()
	const errorParam = searchParams.get('error')

	useEffect(() => {
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current)
			}
		}
	}, [])

	const startCooldown = useCallback(() => {
		setCooldownSeconds(RESEND_COOLDOWN_SECONDS)
		if (intervalRef.current) {
			clearInterval(intervalRef.current)
		}
		intervalRef.current = setInterval(() => {
			setCooldownSeconds(prev => {
				if (prev <= 1) {
					if (intervalRef.current) {
						clearInterval(intervalRef.current)
						intervalRef.current = null
					}
					return 0
				}
				return prev - 1
			})
		}, 1000)
	}, [])

	const handleResendEmail = async () => {
		if (cooldownSeconds > 0) return
		setIsResending(true)
		try {
			const supabase = createClient()
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user?.email) {
				toast.error('Unable to resend email', {
					description: 'Please sign up again or contact support.'
				})
				return
			}
			const { error } = await supabase.auth.resend({
				type: 'signup',
				email: user.email
			})
			if (error) throw error
			toast.success('Email sent!', {
				description: 'Check your inbox for the confirmation link.'
			})
			startCooldown()
		} catch (error) {
			logger.error('Failed to resend confirmation email', {
				action: 'resend_confirmation_email_failed',
				metadata: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			})
			toast.error('Failed to resend email', {
				description:
					error instanceof Error
						? error.message
						: 'Please try again or contact support.'
			})
		} finally {
			setIsResending(false)
		}
	}

	const isDisabled = isResending || cooldownSeconds > 0

	function getResendButtonText(): string {
		if (isResending) return 'Sending...'
		if (cooldownSeconds > 0) return `Resend Email (${cooldownSeconds}s)`
		return 'Resend Email'
	}

	return (
		<div className="relative min-h-screen flex flex-col lg:flex-row">
			<GridPattern
				patternId="confirm-email-grid"
				className="fixed inset-0 -z-10"
			/>
			<ConfirmEmailImagePanel />
			<div className="flex-1 lg:w-1/2 flex-center p-6 sm:p-8 lg:p-12 bg-background min-h-screen">
				<div className="w-full max-w-md space-y-8">
					<ConfirmEmailMobileLogo />
					{errorParam === 'invalid_token' && <ConfirmEmailErrorBanner />}
					<ConfirmEmailHeader />
					<ConfirmEmailInstructions />
					<ConfirmEmailActions
						isResending={isResending}
						isDisabled={isDisabled}
						buttonText={getResendButtonText()}
						onResend={handleResendEmail}
					/>
					<ConfirmEmailFooter />
				</div>
			</div>
		</div>
	)
}

export default function ConfirmEmailPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex-center bg-background">
					<div className="text-center space-y-4">
						<div className="size-16 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
						<p className="text-muted-foreground">Loading...</p>
					</div>
				</div>
			}
		>
			<ConfirmEmailContent />
		</Suspense>
	)
}
