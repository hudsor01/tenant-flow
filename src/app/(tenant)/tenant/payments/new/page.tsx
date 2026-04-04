'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Separator } from '#components/ui/separator'
import { Skeleton } from '#components/ui/skeleton'
import { AlertTriangle, CheckCircle2, CreditCard, Loader2 } from 'lucide-react'
import { formatCents } from '#lib/utils/currency'
import { tenantPaymentQueries, useRentCheckoutMutation } from '#hooks/api/use-tenant-payments'

export default function PayRentPage() {
	const router = useRouter()
	const checkoutMutation = useRentCheckoutMutation()

	// Fetch amount due (includes charges_enabled and rent_due_id)
	const {
		data: amountDue,
		isLoading: isLoadingAmount,
		error: amountError
	} = useQuery(tenantPaymentQueries.amountDue())

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

	// No active lease or error state
	if (amountError) {
		const isNoLease =
			amountError instanceof Error &&
			amountError.message.includes('No active lease')
		return (
			<div className="container mx-auto max-w-2xl py-12">
				<Card>
					<CardHeader>
						<CardTitle
							className={
								isNoLease
									? 'flex items-center gap-2'
									: 'text-destructive flex items-center gap-2'
							}
						>
							<AlertTriangle className="size-5" />
							{isNoLease
								? 'No Active Lease'
								: 'Unable to Load Payment Details'}
						</CardTitle>
						<CardDescription>
							{isNoLease
								? 'You do not have an active lease yet. Contact your property manager to get set up.'
								: 'There was an error loading your payment information. Please try again later.'}
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

	// Charges not enabled — owner hasn't completed Stripe onboarding
	if (amountDue && !amountDue.charges_enabled) {
		return (
			<div className="container mx-auto max-w-2xl py-12">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<AlertTriangle className="size-5" />
							Payments Not Available
						</CardTitle>
						<CardDescription>
							Your property owner has not completed their payment setup. Please
							contact your landlord.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		)
	}

	// No rent_due record — nothing currently due
	if (!amountDue?.rent_due_id) {
		return (
			<div className="container mx-auto max-w-2xl py-12">
				<Card>
					<CardHeader className="text-center">
						<CardTitle>No Rent Currently Due</CardTitle>
						<CardDescription>
							No rent currently due. Check back on your payment date.
						</CardDescription>
					</CardHeader>
					<CardFooter className="justify-center">
						<Button
							variant="outline"
							onClick={() => router.push('/tenant')}
						>
							Back to Dashboard
						</Button>
					</CardFooter>
				</Card>
			</div>
		)
	}

	const handlePayWithStripe = () => {
		if (!amountDue.rent_due_id) return
		checkoutMutation.mutate(amountDue.rent_due_id)
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
						{amountDue.breakdown.map(item => (
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
								{formatCents(amountDue.total_due_cents)}
							</span>
						</div>
					</div>

					{/* Late Fee Warning */}
					{amountDue.days_late > 0 && (
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
				</CardContent>
				<CardFooter className="flex-col gap-4">
					<Button
						className="w-full gap-2"
						size="lg"
						onClick={handlePayWithStripe}
						disabled={checkoutMutation.isPending}
					>
						{checkoutMutation.isPending ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Redirecting to Stripe...
							</>
						) : (
							<>
								<CreditCard className="size-5" />
								Pay {formatCents(amountDue.total_due_cents)} with Stripe
							</>
						)}
					</Button>
					<p className="text-xs text-center text-muted-foreground">
						You will be redirected to Stripe to complete your payment securely.
					</p>
				</CardFooter>
			</Card>
		</div>
	)
}
