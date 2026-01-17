'use client'

import { useMemo, useState } from 'react'
import {
	DollarSign,
	Wallet,
	Clock,
	Download,
	CheckCircle,
	ArrowDownRight,
	XCircle,
	Building2,
	User,
	Home,
	CreditCard,
	Landmark
} from 'lucide-react'
import { Skeleton } from '#components/ui/skeleton'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'
import { NumberTicker } from '#components/ui/number-ticker'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import {
	useConnectedAccountBalance,
	useConnectedAccountPayouts,
	useConnectedAccountTransfers,
	type Payout,
	type Transfer
} from '#hooks/api/use-stripe-connect'
import { formatCurrency } from '#lib/formatters/currency'
import { formatDate } from '#lib/formatters/date'
import { PayoutDetailsModal } from '#components/connect/payout-details-modal'
import { Badge } from '#components/ui/badge'
import { exportToCsv, type CsvColumnMapping } from '#lib/export-utils'

function getPayoutStatusBadge(status: string) {
	switch (status) {
		case 'paid':
			return (
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
					<CheckCircle className="w-3.5 h-3.5" />
					Paid
				</span>
			)
		case 'pending':
			return (
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
					<Clock className="w-3.5 h-3.5" />
					Pending
				</span>
			)
		case 'in_transit':
			return (
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
					<ArrowDownRight className="w-3.5 h-3.5" />
					In Transit
				</span>
			)
		case 'cancelled':
		case 'failed':
			return (
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
					<XCircle className="w-3.5 h-3.5" />
					{status.charAt(0).toUpperCase() + status.slice(1)}
				</span>
			)
		default:
			return (
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
					{status}
				</span>
			)
	}
}

export default function PayoutsPage() {
	const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
	const [payoutModalOpen, setPayoutModalOpen] = useState(false)

	const { data: balance, isLoading: balanceLoading } =
		useConnectedAccountBalance()
	const {
		data: payoutsData,
		isLoading: payoutsLoading,
		error: payoutsError,
		refetch
	} = useConnectedAccountPayouts({ limit: 100 })
	const { data: transfersData, isLoading: transfersLoading } =
		useConnectedAccountTransfers({ limit: 100 })

	const isLoading = balanceLoading || payoutsLoading || transfersLoading

	const handlePayoutClick = (payout: Payout) => {
		setSelectedPayout(payout)
		setPayoutModalOpen(true)
	}

	// Export column definitions
	const payoutExportColumns: CsvColumnMapping<Payout>[] = [
		{
			header: 'Date',
			accessor: row => formatDate(row.created)
		},
		{
			header: 'Amount',
			accessor: row => formatCurrency(row.amount / 100)
		},
		{
			header: 'Status',
			accessor: row => row.status.charAt(0).toUpperCase() + row.status.slice(1)
		},
		{
			header: 'Arrival Date',
			accessor: row => formatDate(row.arrival_date)
		},
		{
			header: 'Method',
			accessor: row => row.method.charAt(0).toUpperCase() + row.method.slice(1)
		}
	]

	const transferExportColumns: CsvColumnMapping<Transfer>[] = [
		{
			header: 'Date',
			accessor: row => formatDate(row.created)
		},
		{
			header: 'Amount',
			accessor: row => formatCurrency(row.amount / 100)
		},
		{
			header: 'Tenant',
			accessor: row => row.metadata?.tenant_name || row.metadata?.tenant_id || ''
		},
		{
			header: 'Property',
			accessor: row => row.metadata?.property_name || ''
		},
		{
			header: 'Unit',
			accessor: row => row.metadata?.unit_name || ''
		},
		{
			header: 'Payment Method',
			accessor: row => {
				const type = row.metadata?.payment_type
				if (type === 'us_bank_account' || type === 'ach') return 'Bank'
				if (type === 'card') return 'Card'
				return ''
			}
		},
		{
			header: 'Description',
			accessor: row => row.description || 'Rent payment'
		}
	]

	const handleExportPayouts = () => {
		if (payouts.length > 0) {
			exportToCsv(payouts, payoutExportColumns, 'payouts')
		}
	}

	const handleExportTransfers = () => {
		if (transfers.length > 0) {
			exportToCsv(transfers, transferExportColumns, 'rent-payments')
		}
	}

	// Get USD balance (primary)
	const availableUSD =
		balance?.available.find(b => b.currency === 'usd')?.amount ?? 0
	const pendingUSD =
		balance?.pending.find(b => b.currency === 'usd')?.amount ?? 0
	const payouts = payoutsData?.payouts ?? []
	const transfers = transfersData?.transfers ?? []

	// Calculate stats
	const paidCount = payouts.filter(p => p.status === 'paid').length
	const inTransitCount = payouts.filter(
		p => p.status === 'in_transit' || p.status === 'pending'
	).length
	const totalPaidOut = payouts
		.filter(p => p.status === 'paid')
		.reduce((sum, p) => sum + p.amount, 0)

	const payoutColumns: ColumnDef<Payout>[] = useMemo(
		() => [
			{
				accessorKey: 'created',
				header: 'Date',
				cell: ({ row }) => (
					<button
						onClick={() => handlePayoutClick(row.original)}
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
						onClick={() => handlePayoutClick(row.original)}
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
		[]
	)

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
					<span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
						+{formatCurrency(row.original.amount / 100)}
					</span>
				)
			},
			{
				id: 'tenant',
				header: 'Tenant',
				cell: ({ row }) => {
					const metadata = row.original.metadata
					const tenantName = metadata?.tenant_name
					const tenantId = metadata?.tenant_id

					if (tenantName) {
						return (
							<div className="flex items-center gap-2">
								<User className="size-4 text-muted-foreground" />
								<span>{tenantName}</span>
							</div>
						)
					}
					if (tenantId) {
						return (
							<div className="flex items-center gap-2 text-muted-foreground">
								<User className="size-4" />
								<span className="font-mono text-xs">
									{tenantId.slice(0, 8)}...
								</span>
							</div>
						)
					}
					return <span className="text-muted-foreground">-</span>
				}
			},
			{
				id: 'property',
				header: 'Property',
				cell: ({ row }) => {
					const metadata = row.original.metadata
					const propertyName = metadata?.property_name
					const unitName = metadata?.unit_name

					if (propertyName || unitName) {
						return (
							<div className="flex items-center gap-2">
								<Home className="size-4 text-muted-foreground" />
								<span>
									{propertyName}
									{unitName && ` · ${unitName}`}
								</span>
							</div>
						)
					}
					return <span className="text-muted-foreground">-</span>
				}
			},
			{
				id: 'payment_method',
				header: 'Method',
				cell: ({ row }) => {
					const metadata = row.original.metadata
					const paymentType = metadata?.payment_type

					if (paymentType === 'us_bank_account' || paymentType === 'ach') {
						return (
							<Badge variant="outline" className="gap-1 text-xs">
								<Landmark className="size-3" />
								Bank
							</Badge>
						)
					}
					if (paymentType === 'card') {
						return (
							<Badge variant="outline" className="gap-1 text-xs">
								<CreditCard className="size-3" />
								Card
							</Badge>
						)
					}
					return <span className="text-muted-foreground text-xs">-</span>
				}
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
				cell: ({ row }) => (
					<span className="text-sm text-muted-foreground">
						{row.original.description || 'Rent payment'}
					</span>
				)
			}
		],
		[]
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

	const { table: transfersTable } = useDataTable({
		data: transfers,
		columns: transferColumns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: { pageIndex: 0, pageSize: 10 }
		}
	})

	if (isLoading) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				{/* Header skeleton */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-32 mb-2" />
						<Skeleton className="h-4 w-64" />
					</div>
					<Skeleton className="h-10 w-24" />
				</div>
				{/* Stats skeleton */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					{[1, 2, 3, 4].map(i => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
				{/* Tables skeleton */}
				<div className="space-y-6">
					<Skeleton className="h-80 rounded-lg" />
					<Skeleton className="h-80 rounded-lg" />
				</div>
			</div>
		)
	}

	if (payoutsError && !balance) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="max-w-md mx-auto text-center py-16">
					<div className="w-16 h-16 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-6">
						<Wallet className="w-8 h-8 text-destructive" />
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-3">
						Failed to Load Payouts
					</h2>
					<p className="text-muted-foreground mb-6">
						Connect your Stripe account to view balance and payout history.
					</p>
					<button
						onClick={() => void refetch()}
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Payouts</h1>
						<p className="text-muted-foreground">
							View your account balance and payout history.
						</p>
					</div>
					<button
						onClick={handleExportPayouts}
						disabled={payouts.length === 0}
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted text-foreground font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Download className="w-4 h-4" />
						Export Payouts
					</button>
				</div>
			</BlurFade>

			{/* Summary Stats - Premium Stat Components */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<BlurFade delay={0.15} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="var(--color-success)"
							colorTo="oklch(from var(--color-success) l c h / 0.3)"
						/>
						<StatLabel>Available Balance</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
							<span className="text-lg">$</span>
							<NumberTicker
								value={Math.floor(availableUSD / 100)}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<DollarSign />
						</StatIndicator>
						<StatDescription>ready for payout</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Pending Balance</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-amber-600 dark:text-amber-400">
							<span className="text-lg">$</span>
							<NumberTicker
								value={Math.floor(pendingUSD / 100)}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Clock />
						</StatIndicator>
						<StatDescription>processing</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={12}
							colorFrom="var(--color-primary)"
							colorTo="oklch(from var(--color-primary) l c h / 0.3)"
						/>
						<StatLabel>Total Paid Out</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<span className="text-lg">$</span>
							<NumberTicker
								value={Math.floor(totalPaidOut / 100)}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Wallet />
						</StatIndicator>
						<StatDescription>{paidCount} payouts</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>In Transit</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-blue-600 dark:text-blue-400">
							<NumberTicker value={inTransitCount} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="info">
							<ArrowDownRight />
						</StatIndicator>
						<StatDescription>pending arrival</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Payout History */}
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
								onClick={handleExportPayouts}
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

			{/* Rent Payments Received */}
			<BlurFade delay={0.4} inView>
				<div className="bg-card border border-border rounded-lg overflow-hidden">
					<div className="flex items-start justify-between p-4 border-b border-border">
						<div>
							<h3 className="font-medium text-foreground">
								Rent Payments Received
							</h3>
							<p className="text-sm text-muted-foreground">
								Rent collected from tenants
							</p>
						</div>
						{transfers.length > 0 && (
							<button
								onClick={handleExportTransfers}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors"
							>
								<Download className="w-3.5 h-3.5" />
								Export
							</button>
						)}
					</div>
					{transfers.length === 0 ? (
						<div className="p-8 text-center">
							<div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
								<Building2 className="w-6 h-6 text-muted-foreground" />
							</div>
							<p className="text-sm text-muted-foreground">
								Rent payments from tenants will appear here.
							</p>
						</div>
					) : (
						<div className="p-4">
							<DataTable table={transfersTable}>
								<DataTableToolbar table={transfersTable} />
							</DataTable>
						</div>
					)}
				</div>
			</BlurFade>

			{/* Payout Details Modal */}
			<PayoutDetailsModal
				payout={selectedPayout}
				open={payoutModalOpen}
				onOpenChange={setPayoutModalOpen}
			/>
		</div>
	)
}
