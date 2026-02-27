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
} from '#components/ui/dialog'
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
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import type { PaymentMethodResponse } from '@repo/shared/types/core'
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

	const columns: ColumnDef<PaymentMethodResponse>[] = useMemo(
		() => [
			{
				accessorKey: 'brand',
				header: 'Method',
				meta: {
					label: 'Method',
					variant: 'text',
					placeholder: 'Search method...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => {
					const method = row.original
					return (
						<div className="flex flex-col gap-1">
							<span className="font-medium">
								{method.brand
									? `${method.brand} ending in ${method.last4}`
									: method.bankName}
							</span>
							<span className="text-caption text-muted-foreground">
								Added {new Date(method.createdAt).toLocaleDateString()}
							</span>
						</div>
					)
				}
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
					return (
						<div className="flex items-center justify-end gap-1">
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
											This payment method will be removed and can no longer be
											used for rent.
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
						</div>
					)
				}
			}
		],
		[setDefault, deleteMethod]
	)

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
			<DataTable table={table}>
				<DataTableToolbar table={table} />
			</DataTable>
		</CardLayout>
	)
}
