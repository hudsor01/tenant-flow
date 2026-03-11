'use client'

import { CreditCard, ShieldCheck, Trash2 } from 'lucide-react'

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
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import {
	useDeletePaymentMethod,
	useSetDefaultPaymentMethod,
	paymentMethodsQueries
} from '#hooks/api/use-payment-methods'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { PaymentMethodResponse } from '#types/core'
import { PaymentMethodDisplay } from './payment-method-display'

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
	const { data: paymentMethods = [] } = useSuspenseQuery(paymentMethodsQueries.list())
	const setDefault = useSetDefaultPaymentMethod()
	const deleteMethod = useDeletePaymentMethod()

	const sortedMethods = [...paymentMethods].sort(
				(a, b) => Number(b.isDefault) - Number(a.isDefault)
			)

	const columns: ColumnDef<PaymentMethodResponse>[] = [
			{
				accessorKey: 'brand',
				header: 'Method',
				meta: {
					label: 'Method',
					variant: 'text',
					placeholder: 'Search method...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => <PaymentMethodDisplay method={row.original} />
			},
			{
				accessorKey: 'type',
				header: 'Type',
				meta: {
					label: 'Type',
					variant: 'select',
					options: [
						{ label: 'Card', value: 'card' },
						{ label: 'Bank Account', value: 'us_bank_account' }
					]
				},
				enableColumnFilter: true,
				cell: ({ row }) => formatMethodLabel(row.original.type)
			},
			{
				accessorKey: 'isDefault',
				header: 'Status',
				meta: {
					label: 'Status',
					variant: 'select',
					options: [
						{ label: 'Default', value: 'true' },
						{ label: 'Not Default', value: 'false' }
					]
				},
				enableColumnFilter: true,
				cell: ({ row }) => {
					const method = row.original
					return method.isDefault ? (
						<Badge variant="secondary">Default</Badge>
					) : (
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setDefault.mutate(method.id, {
									onSuccess: () =>
										toast.success('Default payment method updated'),
									onError: () => toast.error('Failed to set default method')
								})
							}
						>
							Make default
						</Button>
					)
				}
			},
			{
				id: 'actions',
				cell: ({ row }) => {
					const method = row.original
					const isLastMethod = sortedMethods.length <= 1

					if (isLastMethod) {
						return (
							<span className="text-xs text-muted-foreground">
								Add another method before removing
							</span>
						)
					}

					return (
						<div className="flex items-center justify-end gap-1">
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 min-h-8 min-w-8 text-destructive hover:text-destructive"
									>
										<Trash2 className="size-4" />
										<span className="sr-only">Delete payment method</span>
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Remove payment method</AlertDialogTitle>
										<AlertDialogDescription>
											This will remove the payment method from your account
											and detach it from Stripe.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={() =>
												deleteMethod.mutate(method.id, {
													onSuccess: () =>
														toast.success('Payment method removed'),
													onError: (err) =>
														toast.error(
															err instanceof Error
																? err.message
																: 'Failed to remove payment method'
														)
												})
											}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											Delete
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					)
				}
			}
		]

	const { table } = useDataTable({
		data: sortedMethods,
		columns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 10
			}
		}
	})

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
				<DataTable table={table}>
					<DataTableToolbar table={table} />
				</DataTable>
			</CardContent>
		</Card>
	)
}
