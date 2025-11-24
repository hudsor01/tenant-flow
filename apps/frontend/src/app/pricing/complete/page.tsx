'use client'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { LoadingDots } from '#components/ui/loading-spinner'
import { useSessionStatus } from '#hooks/api/use-payment-verification'
import { getStatusColorClass } from '#lib/utils/color-helpers'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

// Success Icon as per Stripe specification
const SuccessIcon = () => (
	<svg
		width="16"
		height="14"
		viewBox="0 0 16 14"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M15.4695 0.232963C15.8241 0.561287 15.8454 1.1149 15.5171 1.46949L6.14206 11.5945C5.97228 11.7778 5.73221 11.8799 5.48237 11.8748C5.23253 11.8698 4.99677 11.7582 4.83452 11.5681L0.459523 6.44311C0.145767 6.07557 0.18937 5.52327 0.556912 5.20951C0.924454 4.89575 1.47676 4.93936 1.79051 5.3069L5.52658 9.68343L14.233 0.280522C14.5613 -0.0740672 15.1149 -0.0953599 15.4695 0.232963Z"
			fill="white"
		/>
	</svg>
)

// Error Icon as per Stripe specification
const ErrorIcon = () => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 16 16"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M1.25628 1.25628C1.59799 0.914573 2.15201 0.914573 2.49372 1.25628L8 6.76256L13.5063 1.25628C13.848 0.914573 14.402 0.914573 14.7437 1.25628C15.0854 1.59799 15.0854 2.15201 14.7437 2.49372L9.23744 8L14.7437 13.5063C15.0854 13.848 15.0854 14.402 14.7437 14.7437C14.402 15.0854 13.848 15.0854 13.5063 14.7437L8 9.23744L2.49372 14.7437C2.15201 15.0854 1.59799 15.0854 1.25628 14.7437C0.914573 14.402 0.914573 13.848 1.25628 13.5063L6.76256 8L1.25628 2.49372C0.914573 2.15201 0.914573 1.59799 1.25628 1.25628Z"
			fill="white"
		/>
	</svg>
)

// External link icon for Stripe dashboard
const ExternalLinkIcon = () => (
	<svg
		width="15"
		height="14"
		viewBox="0 0 15 14"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M3.125 3.49998C2.64175 3.49998 2.25 3.89173 2.25 4.37498V11.375C2.25 11.8582 2.64175 12.25 3.125 12.25H10.125C10.6082 12.25 11 11.8582 11 11.375V9.62498C11 9.14173 11.3918 8.74998 11.875 8.74998C12.3582 8.74998 12.75 9.14173 12.75 9.62498V11.375C12.75 12.8247 11.5747 14 10.125 14H3.125C1.67525 14 0.5 12.8247 0.5 11.375V4.37498C0.5 2.92524 1.67525 1.74998 3.125 1.74998H4.875C5.35825 1.74998 5.75 2.14173 5.75 2.62498C5.75 3.10823 5.35825 3.49998 4.875 3.49998H3.125Z"
			fill="var(--color-primary)"
		/>
		<path
			d="M8.66672 0C8.18347 0 7.79172 0.391751 7.79172 0.875C7.79172 1.35825 8.18347 1.75 8.66672 1.75H11.5126L4.83967 8.42295C4.49796 8.76466 4.49796 9.31868 4.83967 9.66039C5.18138 10.0021 5.7354 10.0021 6.07711 9.66039L12.7501 2.98744V5.83333C12.7501 6.31658 13.1418 6.70833 13.6251 6.70833C14.1083 6.70833 14.5001 6.31658 14.5001 5.83333V0.875C14.5001 0.391751 14.1083 0 13.6251 0H8.66672Z"
			fill="var(--color-primary)"
		/>
	</svg>
)

export default function CompletePage() {
	const searchParams = useSearchParams()
	const sessionId = searchParams.get('session_id')

	// Use TanStack Query for session status
	const {
		data: sessionData,
		isLoading,
		error: sessionError
	} = useSessionStatus(sessionId)

	// Derived state based on query results
	const getDisplayState = () => {
		if (!sessionId) {
			return {
				text: 'Invalid session - missing session ID',
				status: 'error',
				icon: <ErrorIcon />
			}
		}

		if (sessionError) {
			return {
				text: 'Error retrieving payment status',
				status: 'error',
				icon: <ErrorIcon />
			}
		}

		if (sessionData?.status === 'complete') {
			return {
				text: 'Payment succeeded',
				status: 'complete',
				icon: <SuccessIcon />
			}
		} else if (sessionData) {
			return {
				text: 'Something went wrong, please try again.',
				status: 'error',
				icon: <ErrorIcon />
			}
		}

		// Loading state
		return {
			text: '',
			status: '',
			icon: null
		}
	}

	const { text, status, icon } = getDisplayState()
	const loading = isLoading && !!sessionId

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-white">
				<CardLayout
					title="Checking payment status..."
					className="w-full max-w-md"
				>
					<div className="flex flex-col items-center justify-center space-y-4">
						<LoadingDots size="lg" variant="primary" />
						<p className="text-(--color-text-secondary)">
							Checking payment status...
						</p>
					</div>
				</CardLayout>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-50 to-white">
			<div className="container mx-auto px-4 section-compact">
				<div className="max-w-2xl mx-auto">
					{/* Payment Status Display */}
					<CardLayout
						title="Payment Status"
						description={text}
						className="border-(--color-border) shadow-lg"
					>
						<div id="payment-status" className="text-center">
							{/* Status Icon */}
							<div
								id="status-icon"
								className={`size-16 rounded-full flex items-center justify-center mx-auto mb-6 ${status ? getStatusColorClass(status) : ''}`}
							>
								{icon}
							</div>

							{/* Status Text */}
							<h2
								id="status-text"
								className="text-2xl font-bold text-(--color-text-primary) mb-8"
							>
								{text}
							</h2>

							{/* Details Table */}
							<div id="details-table" className="mb-8">
								<div className="bg-(--color-fill-secondary) rounded-lg p-6">
									<table className="w-full">
										<tbody className="space-y-3">
											<tr className="border-b border-(--color-border) last:border-b-0">
												<td className="text-left py-2 text-(--color-text-secondary) font-medium">
													Payment Intent ID
												</td>
												<td
													id="intent-id"
													className="text-right py-2 text-(--color-text-primary) font-mono text-sm"
												>
													{sessionData?.payment_intent_id || 'N/A'}
												</td>
											</tr>
											<tr className="border-b border-(--color-border) last:border-b-0">
												<td className="text-left py-2 text-(--color-text-secondary) font-medium">
													Status
												</td>
												<td
													id="intent-status"
													className="text-right py-2 text-(--color-text-primary) capitalize"
												>
													{sessionData?.status || 'Unknown'}
												</td>
											</tr>
											<tr className="border-b border-(--color-border) last:border-b-0">
												<td className="text-left py-2 text-(--color-text-secondary) font-medium">
													Payment Status
												</td>
												<td
													id="session-status"
													className="text-right py-2 text-(--color-text-primary) capitalize"
												>
													{sessionData?.payment_status || 'Unknown'}
												</td>
											</tr>
											<tr className="border-b border-(--color-border) last:border-b-0">
												<td className="text-left py-2 text-(--color-text-secondary) font-medium">
													Payment Intent Status
												</td>
												<td
													id="payment-intent-status"
													className="text-right py-2 text-(--color-text-primary) capitalize"
												>
													{sessionData?.payment_intent_status || 'Unknown'}
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
								{sessionData?.payment_intent_id && (
									<a
										href={`https://dashboard.stripe.com/payments/${sessionData.payment_intent_id}`}
										id="view-details"
										rel="noopener noreferrer"
										target="_blank"
										className="inline-flex items-center gap-2 text-(--color-primary) hover:text-(--color-primary-hover) transition-colors"
									>
										View details
										<ExternalLinkIcon />
									</a>
								)}

								<Link href="/pricing/checkout" id="retry-button">
									<Button variant="outline" className="h-11">
										Test another
									</Button>
								</Link>
							</div>
						</div>
					</CardLayout>

					{/* Success Message */}
					{sessionData?.status === 'complete' && (
						<div className="text-center mt-8">
							<p className="text-(--color-text-secondary)">
								Welcome to TenantFlow! Your subscription is now active.
							</p>
							<Link href="/dashboard" className="inline-block mt-4">
								<Button className="h-11 px-8">Go to Dashboard</Button>
							</Link>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
