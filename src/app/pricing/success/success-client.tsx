'use client'

import { CustomerPortalButton } from '#components/pricing/customer-portal'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { subscriptionStatusQueries } from '#hooks/api/query-keys/subscription-verification-keys'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Home } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function SuccessClient() {
	const searchParams = useSearchParams()
	const sessionId = searchParams?.get('session_id') ?? null

	const {
		data: verificationData,
		isLoading: isVerifying,
		error: verificationError,
		isSuccess
	} = useQuery(subscriptionStatusQueries.verifySession(sessionId))

	const subscription = verificationData?.subscription

	useEffect(() => {
		if (isSuccess && subscription) {
			toast.success('Payment successful! Welcome to your new plan.')
		}
	}, [isSuccess, subscription])

	useEffect(() => {
		if (verificationError) {
			toast.error('Failed to verify payment')
		}
	}, [verificationError])

	useEffect(() => {
		if (!sessionId) {
			toast.error('No session ID found')
		}
	}, [sessionId])

	if (isVerifying) {
		return (
			<div className="mx-auto max-w-2xl px-6 section-content lg:px-8">
				<CardLayout
					title="Verifying your payment..."
					description="Please wait while we confirm your subscription."
					className="text-center"
				>
					<div className="flex-col-center space-y-4 pb-4">
						<div
							className="size-12 animate-spin rounded-full border-b-2 border-primary"
							aria-hidden="true"
						/>
					</div>
				</CardLayout>
			</div>
		)
	}

	return (
		<div className="mx-auto max-w-2xl px-6 section-content lg:px-8">
			<CardLayout
				title="Payment successful!"
				description="Welcome to TenantFlow. Your subscription is now active."
				className="text-center"
			>
				<div className="flex flex-col items-center gap-6 pb-4">
					<div className="flex-center size-16 rounded-full bg-accent/10">
						<CheckCircle className="size-8 text-accent" aria-hidden="true" />
					</div>
					<p className="text-base text-muted-foreground">
						A confirmation email has been sent with your receipt and
						subscription details.
					</p>
				</div>

				<div className="space-y-6">
					<div className="space-y-4">
						<h3 className="text-base font-semibold text-foreground">
							What's next?
						</h3>
						<div className="grid grid-cols-1 gap-4 text-left md:grid-cols-2">
							<Link href="/dashboard">
								<Button className="w-full justify-start" size="lg">
									<Home className="mr-2 size-4" />
									Go to Dashboard
								</Button>
							</Link>
							<CustomerPortalButton
								className="w-full justify-start"
								size="lg"
							/>
						</div>
					</div>

					<div className="border-t pt-6">
						<p className="text-muted-foreground">
							Need help?{' '}
							<Link
								href="/contact"
								className="text-primary hover:underline"
							>
								Contact our support team
							</Link>
						</p>
					</div>
				</div>
			</CardLayout>
		</div>
	)
}
