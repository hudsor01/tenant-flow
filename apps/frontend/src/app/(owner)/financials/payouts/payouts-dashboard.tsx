'use client'

import { Spinner } from '#components/ui/loading-spinner'
import { CardLayout } from '#components/ui/card-layout'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { DollarSign, ArrowDownRight, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useMemo } from 'react'
import {
	useConnectedAccountBalance,
	useConnectedAccountPayouts,
	useConnectedAccountTransfers,
	type Payout,
	type Transfer
} from '#hooks/api/use-stripe-connect'
import { Badge } from '#components/ui/badge'
import { formatCurrency } from '#lib/formatters/currency'
import { formatDate } from '#lib/formatters/date'

function getPayoutStatusBadge(status: string) {
	switch (status) {
		case 'paid':
			return <Badge variant="default" className="bg-success"><CheckCircle className="mr-1 size-3" />Paid</Badge>
		case 'pending':
			return <Badge variant="secondary"><Clock className="mr-1 size-3" />Pending</Badge>
		case 'in_transit':
			return <Badge variant="secondary"><ArrowDownRight className="mr-1 size-3" />In Transit</Badge>
		case 'canceled':
		case 'failed':
			return <Badge variant="destructive"><XCircle className="mr-1 size-3" />{status}</Badge>
		default:
			return <Badge variant="outline">{status}</Badge>
	}
}

function BalanceCard() {
	const { data: balance, isLoading, error } = useConnectedAccountBalance()

	if (isLoading) {
		return (
			<CardLayout title="Account Balance" description="Loading...">
				<div className="flex-center py-8">
					<Spinner className="size-8 animate-spin text-muted-foreground" />
				</div>
			</CardLayout>
		)
	}

	if (error || !balance) {
		return (
			<CardLayout title="Account Balance" description="Unable to load balance">
				<p className="text-muted-foreground">
					Connect your Stripe account to view balance.
				</p>
			</CardLayout>
		)
	}

	// Get USD balance (primary)
	const availableUSD = balance.available.find(b => b.currency === 'usd')?.amount ?? 0
	const pendingUSD = balance.pending.find(b => b.currency === 'usd')?.amount ?? 0

	return (
		<div className="grid gap-4 md:grid-cols-2">
			<CardLayout
				title="Available Balance"
				description="Funds ready for payout"
			>
				<div className="flex items-center gap-2">
					<DollarSign className="size-8 text-success" />
					<span className="typography-h2">
						{formatCurrency(availableUSD / 100)}
					</span>
				</div>
			</CardLayout>
			<CardLayout
				title="Pending Balance"
				description="Processing to available"
			>
				<div className="flex items-center gap-2">
					<Clock className="size-8 text-warning" />
					<span className="typography-h2">
						{formatCurrency(pendingUSD / 100)}
					</span>
				</div>
			</CardLayout>
		</div>
	)
}

function PayoutsTable() {
	const { data, isLoading, error } = useConnectedAccountPayouts({ limit: 100 })

	const payoutColumns: ColumnDef<Payout>[] = useMemo(
		() => [
			{
				accessorKey: 'created',
				header: 'Date',
				cell: ({ row }) => formatDate(row.original.created)
			},
			{
				accessorKey: 'amount',
				header: 'Amount',
				cell: ({ row }) => (
					<span className="font-medium">
						{formatCurrency(row.original.amount / 100)}
					</span>
				)
			},
			{
				accessorKey: 'status',
				header: 'Status',
				meta: {
					label: 'Status',
					variant: 'select',
					options: [
						{ label: 'Paid', value: 'paid' },
						{ label: 'Pending', value: 'pending' },
						{ label: 'In Transit', value: 'in_transit' },
						{ label: 'Canceled', value: 'canceled' },
						{ label: 'Failed', value: 'failed' }
					]
				},
				enableColumnFilter: true,
				cell: ({ row }) => getPayoutStatusBadge(row.original.status)
			},
			{
				accessorKey: 'arrival_date',
				header: 'Arrival',
				cell: ({ row }) => formatDate(row.original.arrival_date)
			},
			{
				accessorKey: 'method',
				header: 'Method',
				meta: {
					label: 'Method',
					variant: 'select',
					options: [
						{ label: 'Standard', value: 'standard' },
						{ label: 'Instant', value: 'instant' }
					]
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<span className="capitalize">{row.original.method}</span>
				)
			}
		],
		[]
	)

	const { table } = useDataTable({
		data: data?.payouts ?? [],
		columns: payoutColumns,
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
			<CardLayout title="Payout History" description="Loading...">
				<div className="flex-center py-8">
					<Spinner className="size-8 animate-spin text-muted-foreground" />
				</div>
			</CardLayout>
		)
	}

	if (error) {
		return (
			<CardLayout title="Payout History" description="Unable to load payouts">
				<p className="text-muted-foreground">
					Connect your Stripe account to view payout history.
				</p>
			</CardLayout>
		)
	}

	if (!data?.payouts?.length) {
		return (
			<CardLayout title="Payout History" description="No payouts yet">
				<p className="text-muted-foreground">
					Your payout history will appear here once you receive rent payments.
				</p>
			</CardLayout>
		)
	}

	return (
		<CardLayout title="Payout History" description="Recent payouts to your bank account">
			<DataTable table={table}>
				<DataTableToolbar table={table} />
			</DataTable>
		</CardLayout>
	)
}

function TransfersTable() {
	const { data, isLoading, error } = useConnectedAccountTransfers({ limit: 100 })

	const transferColumns: ColumnDef<Transfer>[] = useMemo(
		() => [
			{
				accessorKey: 'created',
				header: 'Date',
				cell: ({ row }) => formatDate(row.original.created)
			},
			{
				accessorKey: 'amount',
				header: 'Amount',
				cell: ({ row }) => (
					<span className="font-medium text-success">
						+{formatCurrency(row.original.amount / 100)}
					</span>
				)
			},
			{
				accessorKey: 'description',
				header: 'Description',
				meta: {
					label: 'Description',
					variant: 'text',
					placeholder: 'Search description...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => row.original.description || 'Rent payment'
			},
			{
				id: 'tenant',
				header: 'Tenant',
				cell: ({ row }) =>
					row.original.metadata?.tenant_id
						? `Tenant ID: ${row.original.metadata.tenant_id.slice(0, 8)}...`
						: '-'
			}
		],
		[]
	)

	const { table } = useDataTable({
		data: data?.transfers ?? [],
		columns: transferColumns,
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
			<CardLayout title="Rent Payments Received" description="Loading...">
				<div className="flex-center py-8">
					<Spinner className="size-8 animate-spin text-muted-foreground" />
				</div>
			</CardLayout>
		)
	}

	if (error) {
		return (
			<CardLayout title="Rent Payments Received" description="Unable to load transfers">
				<p className="text-muted-foreground">
					Connect your Stripe account to view rent payments.
				</p>
			</CardLayout>
		)
	}

	if (!data?.transfers?.length) {
		return (
			<CardLayout title="Rent Payments Received" description="No rent payments yet">
				<p className="text-muted-foreground">
					Rent payments from tenants will appear here.
				</p>
			</CardLayout>
		)
	}

	return (
		<CardLayout title="Rent Payments Received" description="Rent collected from tenants">
			<DataTable table={table}>
				<DataTableToolbar table={table} />
			</DataTable>
		</CardLayout>
	)
}

export function PayoutsDashboard() {
	return (
		<div className="space-y-8">
			<BalanceCard />
			<PayoutsTable />
			<TransfersTable />
		</div>
	)
}
