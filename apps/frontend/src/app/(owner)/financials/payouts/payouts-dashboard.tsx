'use client'

import { Spinner } from '#components/ui/loading-spinner'
import { CardLayout } from '#components/ui/card-layout'
import { DollarSign, ArrowDownRight, Clock, CheckCircle, XCircle } from 'lucide-react'
import {
	useConnectedAccountBalance,
	useConnectedAccountPayouts,
	useConnectedAccountTransfers
} from '#hooks/api/use-stripe-connect'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
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
				<p className="text-muted">
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
	const { data, isLoading, error } = useConnectedAccountPayouts({ limit: 10 })

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
				<p className="text-muted">
					Connect your Stripe account to view payout history.
				</p>
			</CardLayout>
		)
	}

	if (!data?.payouts?.length) {
		return (
			<CardLayout title="Payout History" description="No payouts yet">
				<p className="text-muted">
					Your payout history will appear here once you receive rent payments.
				</p>
			</CardLayout>
		)
	}

	return (
		<CardLayout title="Payout History" description="Recent payouts to your bank account">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>Amount</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Arrival</TableHead>
						<TableHead>Method</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.payouts.map(payout => (
						<TableRow key={payout.id}>
							<TableCell>{formatDate(payout.created)}</TableCell>
							<TableCell className="font-medium">
								{formatCurrency(payout.amount / 100)}
							</TableCell>
							<TableCell>{getPayoutStatusBadge(payout.status)}</TableCell>
							<TableCell>{formatDate(payout.arrival_date)}</TableCell>
							<TableCell className="capitalize">{payout.method}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</CardLayout>
	)
}

function TransfersTable() {
	const { data, isLoading, error } = useConnectedAccountTransfers({ limit: 10 })

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
				<p className="text-muted">
					Connect your Stripe account to view rent payments.
				</p>
			</CardLayout>
		)
	}

	if (!data?.transfers?.length) {
		return (
			<CardLayout title="Rent Payments Received" description="No rent payments yet">
				<p className="text-muted">
					Rent payments from tenants will appear here.
				</p>
			</CardLayout>
		)
	}

	return (
		<CardLayout title="Rent Payments Received" description="Rent collected from tenants">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>Amount</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>Tenant</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.transfers.map(transfer => (
						<TableRow key={transfer.id}>
							<TableCell>{formatDate(transfer.created)}</TableCell>
							<TableCell className="font-medium text-success">
								+{formatCurrency(transfer.amount / 100)}
							</TableCell>
							<TableCell>{transfer.description || 'Rent payment'}</TableCell>
							<TableCell>
								{transfer.metadata?.tenant_id
									? `Tenant ID: ${transfer.metadata.tenant_id.slice(0, 8)}...`
									: '-'}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
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
