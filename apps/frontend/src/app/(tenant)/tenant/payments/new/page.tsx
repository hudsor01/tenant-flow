'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Badge } from '#components/ui/badge'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Separator } from '#components/ui/separator'
import { Skeleton } from '#components/ui/skeleton'
import { AlertTriangle, CheckCircle2, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCents } from '@repo/shared/lib/format'
import { apiRequest } from '#lib/api-request'
import {
	tenantPortalQueries,
	type PayRentRequest
} from '#hooks/api/queries/tenant-portal-queries'

interface PaymentMethod {
	id: string
	type: string
	card?: {
		brand: string
		last4: string
		exp_month: number
		exp_year: number
	}
	is_default: boolean
}

export default function PayRentPage() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const [selectedMethod, setSelectedMethod] = useState<string>('')

	// Fetch amount due
	const {
		data: amountDue,
		isLoading: isLoadingAmount,
		error: amountError
	} = useQuery(tenantPortalQueries.amountDue())

	// Fetch payment methods
	const { data: methodsData, isLoading: isLoadingMethods } = useQuery({
		queryKey: ['payment-methods'],
		queryFn: async () =>
			apiRequest<{ methods: PaymentMethod[] }>(
				'/api/v1/stripe/tenant-payment-methods'
			)
	})

	// Pay rent mutation
	const payMutation = useMutation({
		mutationFn: async (data: PayRentRequest) =>
			apiRequest<{ success: boolean }>('/api/v1/tenants/payments/pay-rent', {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onSuccess: () => {
			toast.success('Payment submitted successfully!')
			queryClient.invalidateQueries({ queryKey: tenantPortalQueries.all() })
			router.push('/tenant/payments/history')
		},
		onError: error => {
			toast.error(error instanceof Error ? error.message : 'Payment failed')
		}
	})

	const handleSubmitPayment = () => {
		if (!selectedMethod || !amountDue) return

		payMutation.mutate({
			payment_method_id: selectedMethod,
			amount_cents: amountDue.total_due_cents
		})
	}

	const paymentMethods = methodsData?.methods ?? []

	// Loading state
	if (isLoadingAmount) {
		return (
			<div className="container mx-auto max-w-2xl py-12">
				<Card>
					<CardHeader>
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-64" />
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-12 w-full" />
					</CardContent>
				</Card>
			</div>
		)
	}

	// Error state
	if (amountError) {
		return (
			<div className="container mx-auto max-w-2xl py-12">
				<Card>
					<CardHeader>
						<CardTitle className="text-destructive flex items-center gap-2">
							<AlertTriangle className="size-5" />
							Unable to Load Payment Details
						</CardTitle>
						<CardDescription>
							There was an error loading your payment information. Please try
							again later.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		)
	}

	// Already paid state
	if (amountDue?.already_paid) {
		return (
			<div className="container mx-auto max-w-2xl py-12">
				<Card>
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 rounded-full bg-success/20 p-3 w-fit">
							<CheckCircle2 className="size-8 text-success" />
						</div>
						<CardTitle>Rent Paid</CardTitle>
						<CardDescription>
							Your rent has already been paid for the current period.
						</CardDescription>
					</CardHeader>
					<CardFooter className="justify-center">
						<Button
							variant="outline"
							onClick={() => router.push('/tenant/payments/history')}
						>
							View Payment History
						</Button>
					</CardFooter>
				</Card>
			</div>
		)
	}

	return (
		<div className="container mx-auto max-w-2xl py-12">
			<Card>
				<CardHeader>
					<CardTitle>Pay Rent</CardTitle>
					<CardDescription>
						Complete your rent payment for the current billing period.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Payment Breakdown */}
					<div className="rounded-lg border p-4 space-y-3">
						<h3 className="font-semibold">Payment Breakdown</h3>
						{amountDue?.breakdown.map(item => (
							<div
								key={item.description}
								className="flex justify-between text-sm"
							>
								<span className="text-muted-foreground">
									{item.description}
								</span>
								<span>{formatCents(item.amount_cents)}</span>
							</div>
						))}
						<Separator />
						<div className="flex justify-between font-semibold">
							<span>Total Due</span>
							<span className="text-lg">
								{formatCents(amountDue?.total_due_cents ?? 0)}
							</span>
						</div>
					</div>

					{/* Late Fee Warning */}
					{amountDue && amountDue.days_late > 0 && (
						<div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
							<div className="flex items-center gap-2 text-warning">
								<AlertTriangle className="size-4" />
								<span className="font-medium">
									Payment is {amountDue.days_late} days late
								</span>
							</div>
							<p className="mt-1 text-sm text-warning">
								A late fee of {formatCents(amountDue.late_fee_cents)} has been
								added to your payment.
							</p>
						</div>
					)}

					{/* Payment Method Selection */}
					<div className="space-y-2">
						<label className="typography-small">Payment Method</label>
						{isLoadingMethods ? (
							<Skeleton className="h-10 w-full" />
						) : paymentMethods.length === 0 ? (
							<div className="rounded-lg border border-dashed p-4 text-center">
								<CreditCard className="mx-auto size-8 text-muted-foreground" />
								<p className="mt-2 text-muted">No payment methods on file</p>
								<Button
									variant="link"
									size="sm"
									onClick={() =>
										router.push('/tenant/settings/payment-methods')
									}
								>
									Add a payment method
								</Button>
							</div>
						) : (
							<Select value={selectedMethod} onValueChange={setSelectedMethod}>
								<SelectTrigger>
									<SelectValue placeholder="Select a payment method" />
								</SelectTrigger>
								<SelectContent>
									{paymentMethods.map(method => (
										<SelectItem key={method.id} value={method.id}>
											<div className="flex items-center gap-2">
												<CreditCard className="size-4" />
												<span className="capitalize">{method.card?.brand}</span>
												<span>ending in {method.card?.last4}</span>
												{method.is_default && (
													<Badge variant="secondary" className="ml-2">
														Default
													</Badge>
												)}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>
				</CardContent>
				<CardFooter className="flex-col gap-4">
					<Button
						className="w-full"
						size="lg"
						onClick={handleSubmitPayment}
						disabled={!selectedMethod || payMutation.isPending}
					>
						{payMutation.isPending ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Processing...
							</>
						) : (
							`Pay ${formatCents(amountDue?.total_due_cents ?? 0)}`
						)}
					</Button>
					<p className="text-xs text-center text-muted-foreground">
						By clicking Pay, you authorize this payment to your property
						manager.
					</p>
				</CardFooter>
			</Card>
		</div>
	)
}
