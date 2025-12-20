'use client'

import { format } from 'date-fns'
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle,
	CreditCard,
	DollarSign,
	History,
	MoreVertical,
	Pause,
	Play,
	XCircle
} from 'lucide-react'

import { Spinner } from '#components/ui/loading-spinner'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { PaymentMethodResponse } from '@repo/shared/types/core'
import type { RentSubscriptionResponse } from '@repo/shared/types/api-contracts'
import type { ColumnDef } from '@tanstack/react-table'
import { useState, useMemo, useCallback } from 'react'

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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#components/ui/tabs'

import {
	useFailedPaymentAttempts,
	usePaymentHistory
} from '#hooks/api/use-payment-history'
import { usePaymentMethods } from '#hooks/api/use-payment-methods'
import {
	useCancelSubscription,
	usePauseSubscription,
	useResumeSubscription,
	useSubscriptions
} from '#hooks/api/use-subscriptions'
import type { PaymentHistoryItem, FailedPaymentAttempt } from '#hooks/api/queries/payment-history-queries'

export default function RentCollectionPage() {
	return <RentCollectionContent />
}

function RentCollectionContent() {
	const { data: subscriptions, isLoading } = useSubscriptions()
	const { data: paymentMethods } = usePaymentMethods()
	const { data: paymentHistory } = usePaymentHistory()
	const { data: failedAttempts } = useFailedPaymentAttempts()
	const pauseSubscription = usePauseSubscription()
	const resumeSubscription = useResumeSubscription()
	const cancelSubscription = useCancelSubscription()

	const [actioningId, setActioningId] = useState<string | null>(null)

	const handlePause = useCallback(async (id: string) => {
		setActioningId(id)
		try {
			await pauseSubscription.mutateAsync(id)
		} finally {
			setActioningId(null)
		}
	}, [pauseSubscription])

	const handleResume = useCallback(async (id: string) => {
		setActioningId(id)
		try {
			await resumeSubscription.mutateAsync(id)
		} finally {
			setActioningId(null)
		}
	}, [resumeSubscription])

	const handleCancel = useCallback(async (id: string) => {
		setActioningId(id)
		try {
			await cancelSubscription.mutateAsync(id)
		} finally {
			setActioningId(null)
		}
	}, [cancelSubscription])

	const activeSubscriptions =
		subscriptions?.filter(s => s.status === 'active') || []
	const pausedSubscriptions =
		subscriptions?.filter(s => s.status === 'paused') || []
	const canceledSubscriptions =
		subscriptions?.filter(s => s.status === 'canceled') || []

	const totalMonthlyRevenue = activeSubscriptions.reduce(
		(sum, sub) => sum + (sub.amount || 0),
		0
	)

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'active':
				return <Badge variant="default">Active</Badge>
			case 'paused':
				return <Badge variant="outline">Paused</Badge>
			case 'canceled':
				return <Badge variant="destructive">Canceled</Badge>
			default:
				return <Badge variant="outline">{status}</Badge>
		}
	}

	const getPaymentMethodInfo = useCallback((paymentMethodId: string) => {
		const paymentMethod = paymentMethods?.find(
			(pm: PaymentMethodResponse) => pm.id === paymentMethodId
		)
		if (!paymentMethod) return null

		return {
			type: paymentMethod.type === 'card' ? 'Card' : 'Bank Account',
			last4: paymentMethod.last4,
			brand: paymentMethod.brand
		}
	}, [paymentMethods])

	// Active Subscriptions Columns
	const activeColumns: ColumnDef<RentSubscriptionResponse>[] = useMemo(
		() => [
			{
				accessorKey: 'tenantId',
				header: 'Tenant',
				meta: {
					label: 'Tenant ID',
					variant: 'text',
					placeholder: 'Search tenant...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<span className="font-medium">{row.original.tenantId}</span>
				)
			},
			{
				accessorKey: 'leaseId',
				header: 'Property / Unit',
				meta: {
					label: 'Lease ID',
					variant: 'text'
				},
				enableColumnFilter: true
			},
			{
				accessorKey: 'amount',
				header: 'Amount',
				cell: ({ row }) =>
					`$${((row.original.amount ?? 0) / 100).toFixed(2)}/mo`
			},
			{
				id: 'paymentMethod',
				header: 'Payment Method',
				cell: ({ row }) => {
					const paymentMethodInfo = row.original.paymentMethodId
						? getPaymentMethodInfo(row.original.paymentMethodId)
						: null

					return paymentMethodInfo ? (
						<div className="flex items-center gap-2">
							<CreditCard className="size-4" />
							<span className="text-sm">
								{paymentMethodInfo.type} ending in {paymentMethodInfo.last4}
							</span>
						</div>
					) : (
						<span className="text-muted-foreground">No payment method</span>
					)
				}
			},
			{
				accessorKey: 'nextChargeDate',
				header: 'Next Charge',
				cell: ({ row }) =>
					row.original.nextChargeDate
						? format(new Date(row.original.nextChargeDate), 'MMM d, yyyy')
						: 'N/A'
			},
			{
				accessorKey: 'status',
				header: 'Status',
				cell: ({ row }) =>
					row.original.status ? getStatusBadge(row.original.status) : 'Unknown'
			},
			{
				id: 'actions',
				cell: ({ row }) => {
					const sub = row.original
					return (
						<div className="text-right">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										disabled={actioningId === sub.id}
									>
										{actioningId === sub.id ? (
											<Spinner className="size-4 animate-spin" />
										) : (
											<MoreVertical className="size-4" />
										)}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuLabel>Actions</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => sub.id && handlePause(sub.id)}
									>
										<Pause className="mr-2 size-4" />
										Pause Subscription
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => sub.id && handleCancel(sub.id)}
										className="text-destructive"
									>
										<XCircle className="mr-2 size-4" />
										Cancel Subscription
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					)
				}
			}
		],
		[actioningId, getPaymentMethodInfo, handlePause, handleCancel]
	)

	// Paused Subscriptions Columns
	const pausedColumns: ColumnDef<RentSubscriptionResponse>[] = useMemo(
		() => [
			{
				accessorKey: 'tenantId',
				header: 'Tenant',
				meta: {
					label: 'Tenant ID',
					variant: 'text',
					placeholder: 'Search tenant...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<span className="font-medium">{row.original.tenantId}</span>
				)
			},
			{
				accessorKey: 'leaseId',
				header: 'Property / Unit',
				meta: {
					label: 'Lease ID',
					variant: 'text'
				},
				enableColumnFilter: true
			},
			{
				accessorKey: 'amount',
				header: 'Amount',
				cell: ({ row }) =>
					`$${((row.original.amount ?? 0) / 100).toFixed(2)}/mo`
			},
			{
				id: 'paymentMethod',
				header: 'Payment Method',
				cell: ({ row }) => {
					const paymentMethodInfo = row.original.paymentMethodId
						? getPaymentMethodInfo(row.original.paymentMethodId)
						: null

					return paymentMethodInfo ? (
						<div className="flex items-center gap-2">
							<CreditCard className="size-4" />
							<span className="text-sm">
								{paymentMethodInfo.type} ending in {paymentMethodInfo.last4}
							</span>
						</div>
					) : (
						<span className="text-muted-foreground">No payment method</span>
					)
				}
			},
			{
				accessorKey: 'updatedAt',
				header: 'Paused On',
				cell: ({ row }) =>
					row.original.updatedAt
						? format(new Date(row.original.updatedAt), 'MMM d, yyyy')
						: 'N/A'
			},
			{
				accessorKey: 'status',
				header: 'Status',
				cell: ({ row }) =>
					row.original.status ? getStatusBadge(row.original.status) : 'Unknown'
			},
			{
				id: 'actions',
				cell: ({ row }) => {
					const sub = row.original
					return (
						<div className="text-right">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										disabled={actioningId === sub.id}
									>
										{actioningId === sub.id ? (
											<Spinner className="size-4 animate-spin" />
										) : (
											<MoreVertical className="size-4" />
										)}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuLabel>Actions</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => sub.id && handleResume(sub.id)}
									>
										<Play className="mr-2 size-4" />
										Resume Subscription
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => sub.id && handleCancel(sub.id)}
										className="text-destructive"
									>
										<XCircle className="mr-2 size-4" />
										Cancel Subscription
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					)
				}
			}
		],
		[actioningId, getPaymentMethodInfo, handleResume, handleCancel]
	)

	// Canceled Subscriptions Columns
	const canceledColumns: ColumnDef<RentSubscriptionResponse>[] = useMemo(
		() => [
			{
				accessorKey: 'tenantId',
				header: 'Tenant',
				meta: {
					label: 'Tenant ID',
					variant: 'text',
					placeholder: 'Search tenant...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<span className="font-medium">{row.original.tenantId}</span>
				)
			},
			{
				accessorKey: 'leaseId',
				header: 'Property / Unit',
				meta: {
					label: 'Lease ID',
					variant: 'text'
				},
				enableColumnFilter: true
			},
			{
				accessorKey: 'amount',
				header: 'Amount',
				cell: ({ row }) =>
					`$${((row.original.amount ?? 0) / 100).toFixed(2)}/mo`
			},
			{
				id: 'paymentMethod',
				header: 'Payment Method',
				cell: ({ row }) => {
					const paymentMethodInfo = row.original.paymentMethodId
						? getPaymentMethodInfo(row.original.paymentMethodId)
						: null

					return paymentMethodInfo ? (
						<div className="flex items-center gap-2">
							<CreditCard className="size-4" />
							<span className="text-sm">
								{paymentMethodInfo.type} ending in {paymentMethodInfo.last4}
							</span>
						</div>
					) : (
						<span className="text-muted-foreground">No payment method</span>
					)
				}
			},
			{
				accessorKey: 'updatedAt',
				header: 'Canceled On',
				cell: ({ row }) =>
					row.original.updatedAt
						? format(new Date(row.original.updatedAt), 'MMM d, yyyy')
						: 'N/A'
			},
			{
				accessorKey: 'status',
				header: 'Status',
				cell: ({ row }) =>
					row.original.status ? getStatusBadge(row.original.status) : 'Unknown'
			}
		],
		[getPaymentMethodInfo]
	)

	// Payment History Columns
	const paymentHistoryColumns: ColumnDef<PaymentHistoryItem>[] = useMemo(
		() => [
			{
				accessorKey: 'created_at',
				header: 'Date',
				cell: ({ row }) =>
					format(new Date(row.original.created_at), 'MMM d, yyyy')
			},
			{
				accessorKey: 'subscriptionId',
				header: 'Subscription',
				meta: {
					label: 'Subscription ID',
					variant: 'text'
				},
				enableColumnFilter: true
			},
			{
				accessorKey: 'tenant_id',
				header: 'Tenant',
				meta: {
					label: 'Tenant ID',
					variant: 'text'
				},
				enableColumnFilter: true
			},
			{
				accessorKey: 'amount',
				header: 'Amount',
				cell: ({ row }) => `$${(row.original.amount / 100).toFixed(2)}`
			},
			{
				accessorKey: 'status',
				header: 'Status',
				meta: {
					label: 'Status',
					variant: 'select',
					options: [
						{ label: 'Successful', value: 'true' },
						{ label: 'Failed', value: 'false' }
					]
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<Badge
						variant={row.original.isSuccessful ? 'default' : 'destructive'}
					>
						{row.original.status}
					</Badge>
				)
			},
			{
				accessorKey: 'description',
				header: 'Description',
				cell: ({ row }) => (
					<span className="max-w-xs truncate">
						{row.original.description || 'Rent payment'}
					</span>
				)
			}
		],
		[]
	)

	// Failed Attempts Columns
	const failedAttemptsColumns: ColumnDef<FailedPaymentAttempt>[] = useMemo(
		() => [
			{
				accessorKey: 'created_at',
				header: 'Date',
				cell: ({ row }) =>
					format(new Date(row.original.created_at), 'MMM d, yyyy')
			},
			{
				accessorKey: 'subscriptionId',
				header: 'Subscription',
				meta: {
					label: 'Subscription ID',
					variant: 'text'
				},
				enableColumnFilter: true
			},
			{
				accessorKey: 'tenant_id',
				header: 'Tenant',
				meta: {
					label: 'Tenant ID',
					variant: 'text'
				},
				enableColumnFilter: true
			},
			{
				accessorKey: 'amount',
				header: 'Amount',
				cell: ({ row }) => `$${(row.original.amount / 100).toFixed(2)}`
			},
			{
				accessorKey: 'attemptNumber',
				header: 'Attempt #'
			},
			{
				accessorKey: 'failureReason',
				header: 'Reason',
				cell: ({ row }) => (
					<span className="max-w-xs text-sm text-destructive">
						{row.original.failureReason}
					</span>
				)
			},
			{
				accessorKey: 'nextRetryDate',
				header: 'Next Retry',
				cell: ({ row }) =>
					row.original.nextRetryDate
						? format(new Date(row.original.nextRetryDate), 'MMM d')
						: 'No retry'
			}
		],
		[]
	)

	// DataTable instances
	const { table: activeTable } = useDataTable({
		data: activeSubscriptions,
		columns: activeColumns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 10
			}
		}
	})

	const { table: pausedTable } = useDataTable({
		data: pausedSubscriptions,
		columns: pausedColumns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 10
			}
		}
	})

	const { table: canceledTable } = useDataTable({
		data: canceledSubscriptions,
		columns: canceledColumns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 10
			}
		}
	})

	const { table: paymentHistoryTable } = useDataTable({
		data: (paymentHistory || []).slice(0, 10),
		columns: paymentHistoryColumns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 10
			}
		}
	})

	const { table: failedAttemptsTable } = useDataTable({
		data: (failedAttempts || []).slice(0, 10),
		columns: failedAttemptsColumns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 10
			}
		}
	})

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
			<div className="flex-between">
				<div>
					<h1 className="typography-h2 text-foreground">Rent Collection</h1>
					<p className="text-muted-foreground mt-1">
						Manage tenant autopay subscriptions and payment history
					</p>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="typography-small">Monthly Revenue</CardTitle>
						<DollarSign className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="typography-h3">
							${(totalMonthlyRevenue / 100).toFixed(2)}
						</div>
						<p className="text-caption">
							From {activeSubscriptions.length} active subscriptions
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="typography-small">
							Active Subscriptions
						</CardTitle>
						<CheckCircle className="size-4 text-success" />
					</CardHeader>
					<CardContent>
						<div className="typography-h3">{activeSubscriptions.length}</div>
						<p className="text-caption">Auto-collecting rent</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="typography-small">
							Paused Subscriptions
						</CardTitle>
						<Pause className="size-4 text-warning" />
					</CardHeader>
					<CardContent>
						<div className="typography-h3">{pausedSubscriptions.length}</div>
						<p className="text-caption">Temporarily on hold</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="typography-small">Failed Payments</CardTitle>
						<AlertTriangle className="size-4 text-destructive" />
					</CardHeader>
					<CardContent>
						<div className="typography-h3">{failedAttempts?.length || 0}</div>
						<p className="text-caption">Need attention</p>
					</CardContent>
				</Card>
			</div>

			{/* Subscriptions Table */}
			<Card>
				<CardHeader>
					<CardTitle>Tenant Subscriptions</CardTitle>
					<CardDescription>
						Manage automatic rent collection for all tenants
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="active" className="space-y-4">
						<TabsList>
							<TabsTrigger value="active" className="flex items-center gap-2">
								Active ({activeSubscriptions.length})
							</TabsTrigger>
							<TabsTrigger value="paused" className="flex items-center gap-2">
								Paused ({pausedSubscriptions.length})
							</TabsTrigger>
							<TabsTrigger value="canceled" className="flex items-center gap-2">
								Canceled ({canceledSubscriptions.length})
							</TabsTrigger>
						</TabsList>

						<TabsContent value="active">
							{isLoading ? (
								<div className="flex-center py-8">
									<Spinner className="size-8 animate-spin text-muted-foreground" />
								</div>
							) : activeSubscriptions.length === 0 ? (
								<div className="rounded-lg border p-8 text-center">
									<AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
									<p className="text-muted-foreground">
										No active subscriptions
									</p>
									<p className="text-muted-foreground mt-2">
										Create subscriptions for tenants to enable autopay
									</p>
								</div>
							) : (
								<DataTable table={activeTable}>
									<DataTableToolbar table={activeTable} />
								</DataTable>
							)}
						</TabsContent>

						<TabsContent value="paused">
							{pausedSubscriptions.length === 0 ? (
								<div className="rounded-lg border p-8 text-center">
									<p className="text-muted-foreground">
										No paused subscriptions
									</p>
								</div>
							) : (
								<DataTable table={pausedTable}>
									<DataTableToolbar table={pausedTable} />
								</DataTable>
							)}
						</TabsContent>

						<TabsContent value="canceled">
							{canceledSubscriptions.length === 0 ? (
								<div className="rounded-lg border p-8 text-center">
									<p className="text-muted-foreground">
										No canceled subscriptions
									</p>
								</div>
							) : (
								<DataTable table={canceledTable}>
									<DataTableToolbar table={canceledTable} />
								</DataTable>
							)}
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			{/* Payment History Section */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<History className="size-5" />
						Payment History & Failed Attempts
					</CardTitle>
					<CardDescription>
						View recent payment activity and failed payment attempts across all
						subscriptions
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="recent-payments" className="space-y-4">
						<TabsList>
							<TabsTrigger value="recent-payments">
								Recent Payments ({paymentHistory?.length || 0})
							</TabsTrigger>
							<TabsTrigger
								value="failed-attempts"
								className="flex items-center gap-2"
							>
								<AlertTriangle className="size-4" />
								Failed Attempts ({failedAttempts?.length || 0})
							</TabsTrigger>
						</TabsList>

						<TabsContent value="recent-payments">
							{!paymentHistory || paymentHistory.length === 0 ? (
								<div className="rounded-lg border p-8 text-center">
									<p className="text-muted-foreground">
										No payment history available
									</p>
								</div>
							) : (
								<DataTable table={paymentHistoryTable}>
									<DataTableToolbar table={paymentHistoryTable} />
								</DataTable>
							)}
						</TabsContent>

						<TabsContent value="failed-attempts">
							{!failedAttempts || failedAttempts.length === 0 ? (
								<div className="rounded-lg border p-8 text-center">
									<p className="text-muted-foreground">
										No failed payment attempts
									</p>
								</div>
							) : (
								<DataTable table={failedAttemptsTable}>
									<DataTableToolbar table={failedAttemptsTable} />
								</DataTable>
							)}
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	)
}
