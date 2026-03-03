'use client'

import { useMemo } from 'react'
import { Download, Wallet } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import type { Payout } from '#hooks/api/use-stripe-connect'
import { formatCurrency } from '#lib/formatters/currency'
import { formatDate } from '#lib/formatters/date'
import { getPayoutStatusBadge } from './payout-status-badge'

interface PayoutHistoryTableProps {
	payouts: Payout[]
	onPayoutClick: (payout: Payout) => void
	onExport: () => void
}

export function PayoutHistoryTable({
	payouts,
	onPayoutClick,
	onExport
}: PayoutHistoryTableProps) {
	const payoutColumns: ColumnDef<Payout>[] = useMemo(
		() => [
			{
				accessorKey: 'created',
				header: 'Date',
				cell: ({ row }) => (
					<button
						onClick={() => onPayoutClick(row.original)}
						className="text-left hover:text-primary transition-colors"
					>
						{formatDate(row.original.created)}
					</button>
				)
			},
			{
				accessorKey: 'amount',
				header: 'Amount',
				cell: ({ row }) => (
					<button
						onClick={() => onPayoutClick(row.original)}
						className="font-medium tabular-nums text-left hover:text-primary transition-colors"
					>
						{formatCurrency(row.original.amount / 100)}
					</button>
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
						{ label: 'Canceled', value: 'cancelled' },
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
		[onPayoutClick]
	)

	const { table: payoutsTable } = useDataTable({
		data: payouts,
		columns: payoutColumns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: { pageIndex: 0, pageSize: 10 }
		}
	})

	return (
		<BlurFade delay={0.35} inView>
			<div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
				<div className="flex items-start justify-between p-4 border-b border-border">
					<div>
						<h3 className="font-medium text-foreground">Payout History</h3>
						<p className="text-sm text-muted-foreground">
							Recent payouts to your bank account
						</p>
					</div>
					{payouts.length > 0 && (
						<button
							onClick={onExport}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors"
						>
							<Download className="w-3.5 h-3.5" />
							Export
						</button>
					)}
				</div>
				{payouts.length === 0 ? (
					<div className="p-8 text-center">
						<div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
							<Wallet className="w-6 h-6 text-muted-foreground" />
						</div>
						<p className="text-sm text-muted-foreground">
							Your payout history will appear here once you receive rent
							payments.
						</p>
					</div>
				) : (
					<div className="p-4">
						<DataTable table={payoutsTable}>
							<DataTableToolbar table={payoutsTable} />
						</DataTable>
					</div>
				)}
			</div>
		</BlurFade>
	)
}
