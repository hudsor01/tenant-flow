'use client'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { LoadingDots } from '#components/ui/loading-spinner'
import { subscriptionStatusQueries } from '#hooks/api/query-keys/subscription-verification-keys'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, ExternalLink, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

// Map status to CSS class name (uses classes from globals.css)
const getStatusClass = (status: string): string => {
	const statusMap: Record<string, string> = {
		active: 'status-active',
		PENDING: 'status-pending',
		INACTIVE: 'status-inactive',
		OVERDUE: 'status-overdue',
		complete: 'status-complete',
		error: 'status-error'
	}
	return statusMap[status] || 'status-inactive'
}

export default function CompletePage() {
	const searchParams = useSearchParams()
	const sessionId = searchParams.get('session_id')

	// Use TanStack Query for session status
	const {
		data: sessionData,
		isLoading,
		error: sessionError
	} = useQuery(subscriptionStatusQueries.sessionStatus(sessionId))

	// Derived state based on query results
	const getDisplayState = () => {
		if (!sessionId) {
			return {
				text: 'Invalid session - missing session ID',
				status: 'error',
				icon: <XCircle className="size-6 text-destructive" aria-hidden="true" />
			}
		}

		if (sessionError) {
			return {
				text: 'Error retrieving payment status',
				status: 'error',
				icon: <XCircle className="size-6 text-destructive" aria-hidden="true" />
			}
		}

		if (sessionData?.status === 'complete') {
			return {
				text: 'Payment succeeded',
				status: 'complete',
				icon: <CheckCircle className="size-6 text-success" aria-hidden="true" />
			}
		} else if (sessionData) {
			return {
				text: 'Something went wrong, please try again.',
				status: 'error',
				icon: <XCircle className="size-6 text-destructive" aria-hidden="true" />
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
			<div className="min-h-screen flex-center bg-linear-to-br from-background to-background">
				<CardLayout
					title="Checking payment status..."
					className="w-full max-w-md"
				>
					<div className="flex-col-center space-y-4">
						<LoadingDots size="lg" variant="primary" />
						<p className="text-muted-foreground">
							Checking payment status...
						</p>
					</div>
				</CardLayout>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-linear-to-br from-background to-background">
			<div className="container mx-auto px-4 section-compact">
				<div className="max-w-2xl mx-auto">
					{/* Payment Status Display */}
					<CardLayout
						title="Payment Status"
						description={text}
						className="border-border shadow-lg"
					>
						<div id="payment-status" className="text-center">
							{/* Status Icon */}
							<div
								id="status-icon"
								className={`size-16 rounded-full flex-center mx-auto mb-6 ${status ? getStatusClass(status) : ''}`}
							>
								{icon}
							</div>

							{/* Status Text */}
							<h2
								id="status-text"
								className="typography-h3 text-foreground mb-8"
							>
								{text}
							</h2>

							{/* Details Table */}
							<div id="details-table" className="mb-8">
								<div className="bg-muted rounded-lg p-6">
									<table className="w-full">
										<tbody className="space-y-3">
											<tr className="border-b border-border last:border-b-0">
												<td className="text-left py-2 text-muted-foreground font-medium">
													Payment Intent ID
												</td>
												<td
													id="intent-id"
													className="text-right py-2 text-foreground font-mono text-sm"
												>
													{sessionData?.payment_intent_id || 'N/A'}
												</td>
											</tr>
											<tr className="border-b border-border last:border-b-0">
												<td className="text-left py-2 text-muted-foreground font-medium">
													Status
												</td>
												<td
													id="intent-status"
													className="text-right py-2 text-foreground capitalize"
												>
													{sessionData?.status || 'Unknown'}
												</td>
											</tr>
											<tr className="border-b border-border last:border-b-0">
												<td className="text-left py-2 text-muted-foreground font-medium">
													Payment Status
												</td>
												<td
													id="session-status"
													className="text-right py-2 text-foreground capitalize"
												>
													{sessionData?.payment_status || 'Unknown'}
												</td>
											</tr>
											<tr className="border-b border-border last:border-b-0">
												<td className="text-left py-2 text-muted-foreground font-medium">
													Payment Intent Status
												</td>
												<td
													id="payment-intent-status"
													className="text-right py-2 text-foreground capitalize"
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
										className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
									>
										View details
										<ExternalLink className="size-4" aria-hidden="true" />
									</a>
								)}

								<Link href="/pricing" id="retry-button">
									<Button variant="outline" className="h-11">
										Choose a plan
									</Button>
								</Link>
							</div>
						</div>
					</CardLayout>

					{/* Success Message */}
					{sessionData?.status === 'complete' && (
						<div className="text-center mt-8">
							<p className="text-muted-foreground">
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
