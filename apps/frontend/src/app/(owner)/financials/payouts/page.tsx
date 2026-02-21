'use client'

import { useState } from 'react'
import { Download, Wallet } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
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
import { exportToCsv, type CsvColumnMapping } from '#lib/export-utils'
import { PayoutsLoadingSkeleton } from './_components/payouts-loading-skeleton'
import { PayoutsSummaryStats } from './_components/payouts-summary-stats'
import { PayoutHistoryTable } from './_components/payout-history-table'
import { TransfersTable } from './_components/transfers-table'

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

	const availableUSD =
		balance?.available.find(b => b.currency === 'usd')?.amount ?? 0
	const pendingUSD =
		balance?.pending.find(b => b.currency === 'usd')?.amount ?? 0
	const payouts = payoutsData?.payouts ?? []
	const transfers = transfersData?.transfers ?? []

	const paidCount = payouts.filter(p => p.status === 'paid').length
	const inTransitCount = payouts.filter(
		p => p.status === 'in_transit' || p.status === 'pending'
	).length
	const totalPaidOut = payouts
		.filter(p => p.status === 'paid')
		.reduce((sum, p) => sum + p.amount, 0)

	const handlePayoutClick = (payout: Payout) => {
		setSelectedPayout(payout)
		setPayoutModalOpen(true)
	}

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

	if (isLoading) {
		return <PayoutsLoadingSkeleton />
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

			<PayoutsSummaryStats
				availableUSD={availableUSD}
				pendingUSD={pendingUSD}
				totalPaidOut={totalPaidOut}
				paidCount={paidCount}
				inTransitCount={inTransitCount}
			/>

			<PayoutHistoryTable
				payouts={payouts}
				onPayoutClick={handlePayoutClick}
				onExport={handleExportPayouts}
			/>

			<TransfersTable
				transfers={transfers}
				onExport={handleExportTransfers}
			/>

			<PayoutDetailsModal
				payout={selectedPayout}
				open={payoutModalOpen}
				onOpenChange={setPayoutModalOpen}
			/>
		</div>
	)
}
