'use client'

import { useMemo } from 'react'
import { CreditCard, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, EmptyMedia } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
	useDeletePaymentMethod,
	usePaymentMethods,
	useSetDefaultPaymentMethod
} from '@/hooks/api/use-payment-methods'

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

export function TenantPaymentMethods() {
	const { data: paymentMethods = [], isLoading, isError } = usePaymentMethods()
	const setDefault = useSetDefaultPaymentMethod()
	const deleteMethod = useDeletePaymentMethod()

	const sortedMethods = useMemo(
		() => [...paymentMethods].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
		[paymentMethods]
	)

	if (isLoading) {
		return <div className="animate-pulse text-muted-foreground">Loading payment methods...</div>
	}

	if (isError) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Your payment methods</CardTitle>
					<CardDescription>Securely manage saved cards and bank accounts.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
						We couldn&rsquo;t load your payment methods. Please try again shortly.
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
					<CardDescription>Add a payment method to enable autopay.</CardDescription>
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
				<CardDescription>Choose a default payment method for automatic rent payments.</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Method</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-[160px] text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedMethods.map(method => (
								<TableRow key={method.id}>
									<TableCell>
										<div className="flex flex-col gap-1">
											<span className="font-medium">
												{method.brand ? `${method.brand} ending in ${method.last4}` : method.bankName}
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
														onSuccess: () => toast.success('Default payment method updated'),
														onError: () => toast.error('Failed to set default method')
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
													<AlertDialogTitle>Remove payment method</AlertDialogTitle>
													<AlertDialogDescription>
														This will remove the payment method from your account.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction
														onClick={() =>
															deleteMethod.mutate(method.id, {
																onSuccess: () => toast.success('Payment method removed'),
																onError: () => toast.error('Failed to remove payment method')
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
