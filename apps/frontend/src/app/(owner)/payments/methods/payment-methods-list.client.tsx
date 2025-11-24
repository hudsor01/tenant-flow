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
import { CardLayout } from '#components/ui/card-layout'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
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

export function PaymentMethodsList() {
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
			<CardLayout
				title="Payment methods"
				description="Manage saved payment instruments for rent collection."
			>
				<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
					Unable to load payment methods. Please try again later.
				</div>
			</CardLayout>
		)
	}

	if (!sortedMethods.length) {
		return (
			<CardLayout
				title="Payment methods"
				description="No payment methods saved yet."
			>
				<Empty>
					<EmptyHeader>
						<CreditCard className="mx-auto mb-2 size-10 text-muted-foreground" />
						<EmptyTitle>No payment methods</EmptyTitle>
						<EmptyDescription>
							Add a payment method to process rent automatically and securely.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Badge variant="outline" className="gap-2 text-sm">
							<ShieldCheck className="size-4" />
							Stripe Secure Payments
						</Badge>
					</EmptyContent>
				</Empty>
			</CardLayout>
		)
	}

	return (
		<CardLayout
			title="Saved payment methods"
			description="Set a default payment method and manage saved accounts."
		>
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
									<div className="flex flex-col gap-1">
										<span className="font-medium">
											{method.brand
												? `${method.brand} ending in ${method.last4}`
												: method.bankName}
										</span>
										<span className="text-xs text-muted-foreground">
											Added {new Date(method.createdAt).toLocaleDateString()}
										</span>
									</div>
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
													This payment method will be removed and can no longer
													be used for rent.
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
		</CardLayout>
	)
}
