'use client'

import { CreditCard, ShieldCheck, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '#components/ui/alert-dialog'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import {
	useDeletePaymentMethod,
	usePaymentMethods,
	useSetDefaultPaymentMethod
} from '#hooks/api/use-payment-methods'
import type { PaymentMethodResponse } from '@repo/shared/types/core'

function formatMethodLabel(type: string) {
	switch (type) {
		case 'card':
			return 'Card'
		case 'us_bank_account':
			return 'Bank Account'
		default:
			return 'Payment Method'
	}
}

/**
 * Enhanced payment method display with Stripe's official formatting and icons
 */
function PaymentMethodDisplay({ method }: { method: PaymentMethodResponse }) {
	// Helper function to format payment methods consistently using Stripe patterns
	const formatPaymentMethodDetails = (pm: PaymentMethodResponse) => {
		if (pm.type === 'card') {
			const brand = pm.brand || 'card'
			return {
				icon: `https://js.stripe.com/v3/fingerprinted/img/payment-methods/${brand}-dark.svg`,
				displayName: brand.charAt(0).toUpperCase() + brand.slice(1),
				lastFour: `•••• ${pm.last4}`,
				expiryDate: null, // Card expiry not included in current response
				description: `${brand.charAt(0).toUpperCase() + brand.slice(1)} ending in ${pm.last4}`,
				accessibleLabel: `${brand.charAt(0).toUpperCase() + brand.slice(1)} card ending in ${pm.last4}`,
				accountType: null
			}
		}
		
		if (pm.type === 'us_bank_account') {
			return {
				icon: 'https://js.stripe.com/v3/fingerprinted/img/payment-methods/ach-debit-dark.svg',
				displayName: 'Bank Account',
				lastFour: `•••• ${pm.last4}`,
				accountType: null, // Account type not included in current response
				bankName: pm.bankName,
				expiryDate: null,
				description: pm.bankName
					? `${pm.bankName} ending in ${pm.last4}`.trim()
					: `Bank account ending in ${pm.last4}`,
				accessibleLabel: pm.bankName
					? `Bank account at ${pm.bankName} ending in ${pm.last4}`
					: `Bank account ending in ${pm.last4}`
			}
		}

		// Default case for other payment methods
		const typeStr = String(pm.type)
		return {
			icon: `https://js.stripe.com/v3/fingerprinted/img/payment-methods/${pm.type}-dark.svg`,
			displayName: typeStr
				.split('_')
				.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' '),
			description: typeStr
				.split('_')
				.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' '),
			accessibleLabel: `${typeStr
				.split('_')
				.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ')} payment method`,
			expiryDate: null,
			accountType: null
		}
	}

	const details = formatPaymentMethodDetails(method)

	return (
		<div
			className="flex items-center gap-3"
			role="img"
			aria-label={details.accessibleLabel}
		>
			<img
				src={details.icon}
				alt={`${details.displayName} icon`}
				className="size-6 object-contain"
				width="24"
				height="16"
				loading="lazy"
			/>
			<div className="flex flex-col gap-1 min-w-0 flex-1">
				<span className="font-medium text-sm truncate">
					{details.description}
				</span>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					{details.expiryDate && <span>Expires {details.expiryDate}</span>}
					{details.accountType && <span>{details.accountType}</span>}
					{(details.expiryDate || details.accountType) && <span>•</span>}
					<span>Added {new Date(method.createdAt).toLocaleDateString()}</span>
				</div>
			</div>
			{method.isDefault && (
				<span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
					Default
				</span>
			)}
		</div>
	)
}

export function TenantPaymentMethods() {
	const { data: paymentMethods = [], isLoading, isError } = usePaymentMethods()
	const setDefault = useSetDefaultPaymentMethod()
	const deleteMethod = useDeletePaymentMethod()

	const sortedMethods = useMemo(
		() =>
			[...paymentMethods].sort(
				(a, b) => Number(b.isDefault) - Number(a.isDefault)
			),
		[paymentMethods]
	)

	if (isLoading) {
		return (
			<div className="animate-pulse text-muted-foreground">
				Loading payment methods...
			</div>
		)
	}

	if (isError) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Your payment methods</CardTitle>
					<CardDescription>
						Securely manage saved cards and bank accounts.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
						We couldn&rsquo;t load your payment methods. Please try again
						shortly.
					</div>
				</CardContent>
			</Card>
		)
	}

	if (!sortedMethods.length) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Your payment methods</CardTitle>
					<CardDescription>
						Add a payment method to enable autopay.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon" />
							<EmptyTitle>No payment methods saved</EmptyTitle>
							<EmptyDescription>
								Add a card or bank account to pay rent automatically each month.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Badge variant="outline" className="gap-2 text-sm">
								<ShieldCheck className="size-4" />
								Stripe Secure Payments
							</Badge>
						</EmptyContent>
					</Empty>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CreditCard className="size-5 text-primary" />
					Your saved payment methods
				</CardTitle>
				<CardDescription>
					Choose a default payment method for automatic rent payments.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Method</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-40 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedMethods.map(method => (
								<TableRow key={method.id}>
									<TableCell>
										<PaymentMethodDisplay method={method} />
									</TableCell>
									<TableCell>{formatMethodLabel(method.type)}</TableCell>
									<TableCell>
										{method.isDefault ? (
											<Badge variant="secondary">Default</Badge>
										) : (
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													setDefault.mutate(method.id, {
														onSuccess: () =>
															toast.success('Default payment method updated'),
														onError: () =>
															toast.error('Failed to set default method')
													})
												}
											>
												Make default
											</Button>
										)}
									</TableCell>
									<TableCell className="flex items-center justify-end gap-1 text-right">
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													variant="ghost"
													size="icon-sm"
													className="text-destructive hover:text-destructive"
												>
													<Trash2 className="size-4" />
													<span className="sr-only">Delete payment method</span>
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Remove payment method
													</AlertDialogTitle>
													<AlertDialogDescription>
														This will remove the payment method from your
														account.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction
														onClick={() =>
															deleteMethod.mutate(method.id, {
																onSuccess: () =>
																	toast.success('Payment method removed'),
																onError: () =>
																	toast.error('Failed to remove payment method')
															})
														}
														className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
													>
														Delete
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	)
}
