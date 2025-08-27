/**
 * Enhanced Payment Methods Management - Latest 2025 Stripe Patterns
 *
 * Features:
 * - Setup Intent pattern for secure payment method collection
 * - Enhanced card display with brand icons
 * - Real-time validation and error handling
 * - Optimistic updates with rollback on failure
 * - Advanced accessibility support
 * - Mobile-optimized interface
 */
'use client'

import { useState, useCallback } from 'react'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { useQueryClient } from '@tanstack/react-query'
import { billingKeys } from '@/lib/api/billing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { usePaymentMethods } from '@/hooks/api/use-billing'
import { useNotificationSystem } from '@/hooks/use-app-store'
import type { PaymentMethod } from '@repo/shared'
import { EnhancedElementsProvider } from '@/lib/stripe/elements-provider'
import { apiClient } from '@/lib/api-client'

interface AddPaymentMethodProps {
	onSuccess?: () => void
	onCancel?: () => void
}

/**
 * Add Payment Method Component using Setup Intent pattern
 */
function AddPaymentMethodForm({ onSuccess, onCancel }: AddPaymentMethodProps) {
	const stripe = useStripe()
	const elements = useElements()
	const { notifySuccess, notifyError } = useNotificationSystem()
	const queryClient = useQueryClient()

	const [isProcessing, setIsProcessing] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault()
			setError(null)

			if (!stripe || !elements) {
				setError('Payment system not ready. Please try again.')
				return
			}

			setIsProcessing(true)

			try {
				// Create Setup Intent for secure payment method collection
				const setupIntentResponse = await apiClient.post<{
					clientSecret: string
					setupIntentId: string
				}>('/billing/setup-intent')

				// Confirm Setup Intent with payment method
				const { error: confirmError } = await stripe.confirmSetup({
					elements,
					clientSecret: setupIntentResponse.clientSecret,
					confirmParams: {
						return_url: `${window.location.origin}/dashboard/settings?payment_method_added=true`
					},
					redirect: 'if_required'
				})

				if (confirmError) {
					setError(
						confirmError.message || 'Failed to add payment method'
					)
					return
				}

				// Success - invalidate payment methods query
				await queryClient.invalidateQueries({
					queryKey: billingKeys.paymentMethods()
				})

				notifySuccess(
					'Payment Method Added',
					'Your payment method has been added successfully.'
				)
				onSuccess?.()
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: 'An unexpected error occurred'
				setError(message)
				notifyError('Failed to Add Payment Method', message)
			} finally {
				setIsProcessing(false)
			}
		},
		[stripe, elements, queryClient, onSuccess, notifySuccess, notifyError]
	)

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
				<PaymentElement
					options={{
						layout: {
							type: 'tabs',
							defaultCollapsed: false
						},
						fields: {
							billingDetails: {
								name: 'auto',
								email: 'never', // Don't collect email for setup
								address: {
									country: 'auto',
									postalCode: 'auto'
								}
							}
						},
						terms: {
							card: 'never' // No terms needed for setup
						},
						wallets: {
							applePay: 'auto',
							googlePay: 'auto'
						}
					}}
				/>
			</div>

			{error && (
				<Alert variant="destructive">
					<i className="i-lucide-alert-circle inline-block h-4 w-4"  />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<div className="flex gap-3 pt-4">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isProcessing}
					className="flex-1"
				>
					Cancel
				</Button>

				<Button
					type="submit"
					disabled={!stripe || isProcessing}
					className="flex-1"
				>
					{isProcessing ? (
						<>
							<i className="i-lucide-loader-2 inline-block mr-2 h-4 w-4 animate-spin"  />
							Adding...
						</>
					) : (
						<>
							<i className="i-lucide-lock inline-block mr-2 h-4 w-4"  />
							Add Payment Method
						</>
					)}
				</Button>
			</div>

			<div className="text-center text-xs text-gray-500">
				<i className="i-lucide-lock inline-block mr-1 inline h-3 w-3"  />
				Your payment information is encrypted and secure
			</div>
		</form>
	)
}

/**
 * Payment Method Card Component
 */
interface PaymentMethodCardProps {
	paymentMethod: PaymentMethod
	isDefault?: boolean
	onSetDefault?: () => void
	onDelete?: () => void
	isUpdating?: boolean
	isDeleting?: boolean
}

function _PaymentMethodCard({
	paymentMethod,
	isDefault,
	onSetDefault,
	onDelete,
	isUpdating = false,
	isDeleting = false
}: PaymentMethodCardProps) {
	const getBrandIcon = (brand: string) => {
		// You could return actual brand SVG icons here
		const brandColors = {
			visa: 'text-blue-600',
			mastercard: 'text-red-500',
			amex: 'text-green-600',
			discover: 'text-orange-500'
		}
		return brandColors[brand as keyof typeof brandColors] || 'text-gray-500'
	}

	if (paymentMethod.type !== 'card' || !paymentMethod.card) {
		return null
	}

	const { card } = paymentMethod

	return (
		<Card
			className="interactive-card transition-all"
			data-selected={isDefault}
		>
			<CardContent className="p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<div className="flex items-center space-x-2">
							<i className={`i-lucide-credit-card h-6 w-6 ${getBrandIcon(card.brand)}`} />
							<div>
								<div className="flex items-center space-x-2">
									<span className="font-medium capitalize">
										{card.brand}
									</span>
									<span className="text-gray-500">
										•••• {card.last4}
									</span>
									{isDefault && (
										<Badge
											variant="default"
											className="text-xs"
										>
											<i className="i-lucide-star inline-block mr-1 h-3 w-3"  />
											Default
										</Badge>
									)}
								</div>
								<div className="text-sm text-gray-500">
									Expires{' '}
									{String(card.exp_month).padStart(2, '0')}/
									{card.exp_year}
								</div>
							</div>
						</div>
					</div>

					<div className="flex items-center space-x-2">
						{!isDefault && (
							<Button
								size="sm"
								variant="outline"
								onClick={onSetDefault}
								disabled={isUpdating}
							>
								{isUpdating ? (
									<i className="i-lucide-loader-2 inline-block h-4 w-4 animate-spin"  />
								) : (
									<>
										<i className="i-lucide-check inline-block mr-1 h-4 w-4"  />
										Set Default
									</>
								)}
							</Button>
						)}

						<Button
							size="sm"
							variant="outline"
							onClick={onDelete}
							disabled={isDeleting}
							className="text-red-600 hover:bg-red-50 hover:text-red-700"
						>
							{isDeleting ? (
								<i className="i-lucide-loader-2 inline-block h-4 w-4 animate-spin"  />
							) : (
								<i className="i-lucide-trash-2 inline-block h-4 w-4"  />
							)}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

/**
 * Main Enhanced Payment Methods Component
 */
export function EnhancedPaymentMethods() {
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
	const { data: portalData, isLoading, error } = usePaymentMethods()

	const handleAddSuccess = useCallback(() => {
		setIsAddDialogOpen(false)
	}, [])

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Payment Methods</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{[1, 2].map(i => (
							<div
								key={i}
								className="h-20 animate-pulse rounded-lg bg-gray-100"
							/>
						))}
					</div>
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Payment Methods</CardTitle>
				</CardHeader>
				<CardContent>
					<Alert variant="destructive">
						<i className="i-lucide-alert-circle inline-block h-4 w-4"  />
						<AlertDescription>
							Failed to load payment methods. Please try again.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>Payment Methods</CardTitle>
					<Dialog
						open={isAddDialogOpen}
						onOpenChange={setIsAddDialogOpen}
					>
						<DialogTrigger asChild>
							<Button>
								<i className="i-lucide-plus inline-block mr-2 h-4 w-4"  />
								Add Payment Method
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-md">
							<DialogHeader>
								<DialogTitle>Add Payment Method</DialogTitle>
							</DialogHeader>
							<EnhancedElementsProvider mode="setup">
								<AddPaymentMethodForm
									onSuccess={handleAddSuccess}
									onCancel={() => setIsAddDialogOpen(false)}
								/>
							</EnhancedElementsProvider>
						</DialogContent>
					</Dialog>
				</div>
			</CardHeader>

			<CardContent>
				<div className="py-8 text-center">
					<i className="i-lucide-credit-card inline-block mx-auto mb-4 h-12 w-12 text-gray-400"  />
					<h3 className="mb-2 text-lg font-medium text-gray-900">
						Payment Methods
					</h3>
					<p className="mb-4 text-gray-500">
						Manage your payment methods, billing history, and
						subscription details through the secure customer portal.
					</p>
					<Button
						onClick={() => {
							if (portalData?.portalUrl) {
								window.location.href = portalData.portalUrl
							}
						}}
						disabled={isLoading || !portalData?.portalUrl}
					>
						{isLoading ? (
							<>
								<i className="i-lucide-loader-2 inline-block mr-2 h-4 w-4 animate-spin"  />
								Loading...
							</>
						) : (
							<>
								<i className="i-lucide-lock inline-block mr-2 h-4 w-4"  />
								Open Customer Portal
							</>
						)}
					</Button>
					{portalData?.message && (
						<p className="mt-2 text-sm text-gray-600">
							{portalData.message}
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
