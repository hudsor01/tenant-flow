'use client'

import * as React from 'react'
import { format } from 'date-fns'
import {
	AlertTriangle,
	Calendar,
	CheckCircle,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock,
	CreditCard,
	DollarSign,
	Download,
	Eye,
	FileText,
	MoreVertical,
	Pause,
	Percent,
	Play,
	Plus,
	RefreshCw,
	Search,
	Send,
	TrendingUp,
	X,
	XCircle,
	Zap
} from 'lucide-react'

import { Input } from '#components/ui/input'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { Skeleton } from '#components/ui/skeleton'
import { Button } from '#components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '#components/ui/collapsible'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { Label } from '#components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#components/ui/tabs'
import type { PaymentMethodResponse } from '@repo/shared/types/core'

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
import {
	usePaymentAnalytics,
	useUpcomingPayments,
	useOverduePayments,
	useRecordManualPayment,
	useExportPayments
} from '#hooks/api/use-payments'
import { formatCents } from '#lib/formatters/currency'
import { toast } from 'sonner'

type SubscriptionStatus = 'active' | 'paused' | 'canceled'

function getStatusBadge(status: SubscriptionStatus) {
	const styles: Record<SubscriptionStatus, string> = {
		active:
			'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
		paused:
			'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
		canceled:
			'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
	}
	const labels: Record<SubscriptionStatus, string> = {
		active: 'Active',
		paused: 'Paused',
		canceled: 'Canceled'
	}
	return (
		<span
			className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}
		>
			{status === 'active' && <CheckCircle className="w-3 h-3" />}
			{status === 'paused' && <Pause className="w-3 h-3" />}
			{status === 'canceled' && <XCircle className="w-3 h-3" />}
			{labels[status]}
		</span>
	)
}

type PaymentStatusType =
	| 'succeeded'
	| 'pending'
	| 'processing'
	| 'failed'
	| 'canceled'

function getPaymentStatusConfig(status: string) {
	const statusMap: Record<
		PaymentStatusType,
		{
			className: string
			label: string
			Icon: typeof CheckCircle
		}
	> = {
		succeeded: {
			className:
				'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
			label: 'Paid',
			Icon: CheckCircle
		},
		pending: {
			className:
				'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
			label: 'Pending',
			Icon: Clock
		},
		processing: {
			className:
				'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
			label: 'Processing',
			Icon: Clock
		},
		failed: {
			className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
			label: 'Failed',
			Icon: XCircle
		},
		canceled: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Canceled',
			Icon: XCircle
		}
	}
	const defaultConfig = {
		className:
			'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
		label: 'Pending',
		Icon: Clock
	}
	return statusMap[status as PaymentStatusType] ?? defaultConfig
}

function getPaymentStatusBadge(status: string) {
	const config = getPaymentStatusConfig(status)
	const StatusIcon = config.Icon
	return (
		<span
			className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${config.className}`}
		>
			<StatusIcon className="w-3 h-3" />
			{config.label}
		</span>
	)
}

// Record Manual Payment Dialog
function RecordPaymentDialog() {
	const [open, setOpen] = React.useState(false)
	const [formData, setFormData] = React.useState({
		lease_id: '',
		tenant_id: '',
		amount: '',
		payment_method: 'cash' as 'cash' | 'check' | 'money_order' | 'other',
		paid_date: format(new Date(), 'yyyy-MM-dd'),
		notes: ''
	})

	const recordPayment = useRecordManualPayment()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		try {
			await recordPayment.mutateAsync({
				...formData,
				amount: parseFloat(formData.amount)
			})
			toast.success('Payment recorded successfully')
			setOpen(false)
			setFormData({
				lease_id: '',
				tenant_id: '',
				amount: '',
				payment_method: 'cash',
				paid_date: format(new Date(), 'yyyy-MM-dd'),
				notes: ''
			})
		} catch {
			toast.error('Failed to record payment')
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="default" className="gap-2">
					<Plus className="h-4 w-4" />
					Record Payment
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Record Manual Payment</DialogTitle>
					<DialogDescription>
						Record a payment received via cash, check, or money order.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="lease_id">Lease ID</Label>
							<Input
								id="lease_id"
								placeholder="Enter lease ID"
								value={formData.lease_id}
								onChange={e =>
									setFormData(prev => ({ ...prev, lease_id: e.target.value }))
								}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="tenant_id">Tenant ID</Label>
							<Input
								id="tenant_id"
								placeholder="Enter tenant ID"
								value={formData.tenant_id}
								onChange={e =>
									setFormData(prev => ({ ...prev, tenant_id: e.target.value }))
								}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="amount">Amount</Label>
							<div className="relative">
								<DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									id="amount"
									type="number"
									step="0.01"
									min="0"
									placeholder="0.00"
									value={formData.amount}
									onChange={e =>
										setFormData(prev => ({ ...prev, amount: e.target.value }))
									}
									className="pl-9"
									required
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="payment_method">Payment Method</Label>
							<Select
								value={formData.payment_method}
								onValueChange={value =>
									setFormData(prev => ({
										...prev,
										payment_method: value as typeof formData.payment_method
									}))
								}
							>
								<SelectTrigger id="payment_method">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="cash">Cash</SelectItem>
									<SelectItem value="check">Check</SelectItem>
									<SelectItem value="money_order">Money Order</SelectItem>
									<SelectItem value="other">Other</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="paid_date">Payment Date</Label>
							<Input
								id="paid_date"
								type="date"
								value={formData.paid_date}
								onChange={e =>
									setFormData(prev => ({ ...prev, paid_date: e.target.value }))
								}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="notes">Notes (optional)</Label>
							<Input
								id="notes"
								placeholder="Add any notes..."
								value={formData.notes}
								onChange={e =>
									setFormData(prev => ({ ...prev, notes: e.target.value }))
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={recordPayment.isPending}>
							{recordPayment.isPending ? (
								<>
									<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
									Recording...
								</>
							) : (
								'Record Payment'
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

export default function RentCollectionPage() {
	const { data: subscriptions, isLoading } = useSubscriptions()
	const { data: paymentMethods } = usePaymentMethods()
	const { data: paymentHistory } = usePaymentHistory()
	const { data: failedAttempts } = useFailedPaymentAttempts()
	const { data: analytics } = usePaymentAnalytics()
	const { data: upcomingPayments } = useUpcomingPayments()
	const { data: overduePayments } = useOverduePayments()
	const pauseSubscription = usePauseSubscription()
	const resumeSubscription = useResumeSubscription()
	const cancelSubscription = useCancelSubscription()
	const exportPayments = useExportPayments()

	const [searchQuery, setSearchQuery] = React.useState('')
	const [statusFilter, setStatusFilter] = React.useState<string>('all')
	const [currentPage, setCurrentPage] = React.useState(1)
	const [actioningId, setActioningId] = React.useState<string | null>(null)
	const [failedOpen, setFailedOpen] = React.useState(true)
	const [overdueOpen, setOverdueOpen] = React.useState(true)
	const [activeTab, setActiveTab] = React.useState('subscriptions')
	const itemsPerPage = 10

	const handlePause = React.useCallback(
		async (id: string) => {
			setActioningId(id)
			try {
				await pauseSubscription.mutateAsync(id)
			} finally {
				setActioningId(null)
			}
		},
		[pauseSubscription]
	)

	const handleResume = React.useCallback(
		async (id: string) => {
			setActioningId(id)
			try {
				await resumeSubscription.mutateAsync(id)
			} finally {
				setActioningId(null)
			}
		},
		[resumeSubscription]
	)

	const handleCancel = React.useCallback(
		async (id: string) => {
			setActioningId(id)
			try {
				await cancelSubscription.mutateAsync(id)
			} finally {
				setActioningId(null)
			}
		},
		[cancelSubscription]
	)

	const handleExport = React.useCallback(async () => {
		try {
			await exportPayments.mutateAsync(
				statusFilter !== 'all' ? { status: statusFilter } : {}
			)
			toast.success('Payments exported successfully')
		} catch {
			toast.error('Failed to export payments')
		}
	}, [exportPayments, statusFilter])

	const getPaymentMethodInfo = React.useCallback(
		(paymentMethodId: string) => {
			const paymentMethod = paymentMethods?.find(
				(pm: PaymentMethodResponse) => pm.id === paymentMethodId
			)
			if (!paymentMethod) return null

			return {
				type: paymentMethod.type === 'card' ? 'Card' : 'Bank',
				last4: paymentMethod.last4,
				brand: paymentMethod.brand
			}
		},
		[paymentMethods]
	)

	// Calculate stats from analytics or subscriptions
	const activeSubscriptions =
		subscriptions?.filter(s => s.status === 'active') || []

	const totalMonthlyRevenue = activeSubscriptions.reduce(
		(sum, sub) => sum + (sub.amount || 0),
		0
	)
	const platformFees = Math.round(totalMonthlyRevenue * 0.029)

	// Use analytics data if available
	const collectionRate = analytics?.collectionRate ?? 0
	const onTimeRate = analytics?.onTimePaymentRate ?? 0
	const totalCollected = analytics?.totalCollected ?? 0
	const totalPending = analytics?.totalPending ?? 0
	const totalOverdue = analytics?.totalOverdue ?? 0

	// Filter subscriptions
	const filteredSubscriptions = React.useMemo(() => {
		return (subscriptions || []).filter(sub => {
			if (searchQuery) {
				const query = searchQuery.toLowerCase()
				if (
					!sub.tenantId.toLowerCase().includes(query) &&
					!sub.leaseId.toLowerCase().includes(query)
				) {
					return false
				}
			}
			if (statusFilter !== 'all' && sub.status !== statusFilter) {
				return false
			}
			return true
		})
	}, [subscriptions, searchQuery, statusFilter])

	// Pagination
	const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage)
	const paginatedSubscriptions = filteredSubscriptions.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	)

	// Reset page when filters change
	React.useEffect(() => {
		setCurrentPage(1)
	}, [searchQuery, statusFilter])

	const clearFilters = () => {
		setSearchQuery('')
		setStatusFilter('all')
	}

	if (isLoading) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				{/* Header skeleton */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-48 mb-2" />
						<Skeleton className="h-4 w-72" />
					</div>
					<Skeleton className="h-10 w-24" />
				</div>
				{/* Stats skeleton */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					{[1, 2, 3, 4].map(i => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
				{/* Table skeleton */}
				<div className="bg-card border border-border rounded-lg p-4 space-y-3">
					{[1, 2, 3, 4, 5].map(i => (
						<Skeleton key={i} className="h-12 w-full" />
					))}
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
						<h1 className="typography-h1">Rent Collection</h1>
						<p className="text-muted-foreground">
							Manage payments, subscriptions, and collection analytics
						</p>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={handleExport}
							disabled={exportPayments.isPending}
							className="gap-2"
						>
							{exportPayments.isPending ? (
								<RefreshCw className="h-4 w-4 animate-spin" />
							) : (
								<Download className="h-4 w-4" />
							)}
							Export
						</Button>
						<RecordPaymentDialog />
					</div>
				</div>
			</BlurFade>

			{/* Enhanced Stats - Using Analytics Data */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<BlurFade delay={0.15} inView>
					<Stat className="relative overflow-hidden">
						{totalCollected > 0 && (
							<BorderBeam
								size={80}
								duration={8}
								colorFrom="hsl(142 71% 45%)"
								colorTo="hsl(142 71% 45% / 0.3)"
							/>
						)}
						<StatLabel>Collected (MTD)</StatLabel>
						<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
							${Math.floor(totalCollected / 100).toLocaleString()}
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<TrendingUp />
						</StatIndicator>
						<StatDescription>
							{collectionRate > 0 ? `${collectionRate}% rate` : 'this month'}
						</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						{totalPending > 0 && (
							<BorderBeam
								size={80}
								duration={8}
								colorFrom="hsl(45 93% 47%)"
								colorTo="hsl(45 93% 47% / 0.3)"
							/>
						)}
						<StatLabel>Pending</StatLabel>
						<StatValue className="flex items-baseline text-amber-600 dark:text-amber-400">
							${Math.floor(totalPending / 100).toLocaleString()}
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Clock />
						</StatIndicator>
						<StatDescription>
							{upcomingPayments?.length ?? 0} upcoming
						</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						{totalOverdue > 0 && (
							<BorderBeam
								size={80}
								duration={4}
								colorFrom="hsl(0 84% 60%)"
								colorTo="hsl(0 84% 60% / 0.3)"
							/>
						)}
						<StatLabel>Overdue</StatLabel>
						<StatValue className="flex items-baseline text-red-600 dark:text-red-400">
							${Math.floor(totalOverdue / 100).toLocaleString()}
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<AlertTriangle />
						</StatIndicator>
						<StatDescription>
							{overduePayments?.length ?? 0} late
						</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>On-Time Rate</StatLabel>
						<StatValue className="flex items-baseline">
							<NumberTicker value={onTimeRate} duration={800} />%
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Percent />
						</StatIndicator>
						<StatDescription>
							{activeSubscriptions.length} autopay active
						</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Fee Summary */}
			<BlurFade delay={0.35} inView>
				<div className="bg-card border border-border rounded-lg p-4 mb-6">
					<div className="flex flex-wrap items-center gap-6 text-sm">
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Monthly Revenue:</span>
							<span className="font-medium text-foreground">
								{formatCents(totalMonthlyRevenue)}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Est. Platform Fees:</span>
							<span className="font-medium text-foreground">
								-{formatCents(platformFees)}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Net Monthly:</span>
							<span className="font-medium text-foreground">
								{formatCents(totalMonthlyRevenue - platformFees)}
							</span>
						</div>
					</div>
				</div>
			</BlurFade>

			{/* Overdue Payments Alert */}
			{(overduePayments?.length ?? 0) > 0 && (
				<BlurFade delay={0.4} inView>
					<Collapsible
						open={overdueOpen}
						onOpenChange={setOverdueOpen}
						className="mb-6"
					>
						<CollapsibleTrigger className="w-full">
							<div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-destructive/15 transition-colors">
								<div className="flex items-center gap-3">
									<AlertTriangle className="w-5 h-5 text-destructive" />
									<span className="font-medium text-foreground">
										{overduePayments?.length} Overdue Payment
										{overduePayments?.length !== 1 ? 's' : ''} Need Attention
									</span>
								</div>
								<ChevronDown
									className={`w-4 h-4 text-muted-foreground transition-transform ${overdueOpen ? 'rotate-180' : ''}`}
								/>
							</div>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<div className="mt-2 bg-card border border-border rounded-lg overflow-hidden">
								<Table>
									<TableHeader className="bg-muted/50">
										<TableRow className="hover:bg-transparent">
											<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Tenant
											</TableHead>
											<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Property
											</TableHead>
											<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Amount
											</TableHead>
											<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Days Overdue
											</TableHead>
											<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Late Fee
											</TableHead>
											<TableHead></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{overduePayments?.slice(0, 5).map(payment => (
											<TableRow key={payment.id}>
												<TableCell className="font-medium text-sm">
													{payment.tenantName}
												</TableCell>
												<TableCell className="text-sm">
													{payment.propertyName} - {payment.unitNumber}
												</TableCell>
												<TableCell className="tabular-nums font-medium text-destructive">
													{formatCents(payment.amount)}
												</TableCell>
												<TableCell className="text-sm">
													<span className="text-destructive font-medium">
														{payment.daysOverdue} days
													</span>
												</TableCell>
												<TableCell className="text-sm">
													{payment.lateFeeApplied ? (
														<span className="text-amber-600">
															{formatCents(payment.lateFeeAmount)}
														</span>
													) : (
														<span className="text-muted-foreground">
															Not applied
														</span>
													)}
												</TableCell>
												<TableCell>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="sm"
																className="h-8 w-8 p-0"
															>
																<MoreVertical className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem>
																<Send className="mr-2 h-4 w-4" />
																Send Reminder
															</DropdownMenuItem>
															{!payment.lateFeeApplied && (
																<DropdownMenuItem>
																	<DollarSign className="mr-2 h-4 w-4" />
																	Apply Late Fee
																</DropdownMenuItem>
															)}
															{payment.lateFeeApplied && (
																<DropdownMenuItem>
																	<X className="mr-2 h-4 w-4" />
																	Waive Late Fee
																</DropdownMenuItem>
															)}
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</CollapsibleContent>
					</Collapsible>
				</BlurFade>
			)}

			{/* Failed Payments Alert (if any) */}
			{(failedAttempts?.length ?? 0) > 0 && (
				<BlurFade delay={0.4} inView>
					<Collapsible
						open={failedOpen}
						onOpenChange={setFailedOpen}
						className="mb-6"
					>
						<CollapsibleTrigger className="w-full">
							<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
								<div className="flex items-center gap-3">
									<XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
									<span className="font-medium text-foreground">
										{failedAttempts?.length} Failed Payment Attempt
										{failedAttempts?.length !== 1 ? 's' : ''}
									</span>
								</div>
								<ChevronDown
									className={`w-4 h-4 text-muted-foreground transition-transform ${failedOpen ? 'rotate-180' : ''}`}
								/>
							</div>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<div className="mt-2 bg-card border border-border rounded-lg overflow-hidden">
								<Table>
									<TableHeader className="bg-muted/50">
										<TableRow className="hover:bg-transparent">
											<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Date
											</TableHead>
											<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Tenant
											</TableHead>
											<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Amount
											</TableHead>
											<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Attempt
											</TableHead>
											<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Reason
											</TableHead>
											<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Next Retry
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{failedAttempts?.slice(0, 5).map(attempt => (
											<TableRow key={attempt.id}>
												<TableCell className="text-sm">
													{format(new Date(attempt.created_at), 'MMM d, yyyy')}
												</TableCell>
												<TableCell className="font-medium text-sm">
													{attempt.tenant_id.slice(0, 8)}...
												</TableCell>
												<TableCell className="tabular-nums">
													{formatCents(attempt.amount)}
												</TableCell>
												<TableCell className="text-sm">
													#{attempt.attemptNumber}
												</TableCell>
												<TableCell className="text-sm text-destructive max-w-xs truncate">
													{attempt.failureReason}
												</TableCell>
												<TableCell className="text-sm">
													{attempt.nextRetryDate
														? format(new Date(attempt.nextRetryDate), 'MMM d')
														: 'No retry'}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</CollapsibleContent>
					</Collapsible>
				</BlurFade>
			)}

			{/* Tabs for different views */}
			<BlurFade delay={0.45} inView>
				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="space-y-4"
				>
					<TabsList className="grid w-full grid-cols-3 max-w-md">
						<TabsTrigger value="subscriptions" className="gap-2">
							<Zap className="h-4 w-4" />
							Autopay
						</TabsTrigger>
						<TabsTrigger value="upcoming" className="gap-2">
							<Calendar className="h-4 w-4" />
							Upcoming
						</TabsTrigger>
						<TabsTrigger value="history" className="gap-2">
							<FileText className="h-4 w-4" />
							History
						</TabsTrigger>
					</TabsList>

					{/* Subscriptions Tab */}
					<TabsContent value="subscriptions">
						<div className="bg-card border border-border rounded-lg overflow-hidden">
							{/* Toolbar */}
							<div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row items-start sm:items-center gap-3">
								<div className="relative w-full sm:w-64">
									<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										placeholder="Search subscriptions..."
										value={searchQuery}
										onChange={e => setSearchQuery(e.target.value)}
										className="pl-9 h-9"
									/>
								</div>

								<div className="flex items-center gap-3 sm:ml-auto w-full sm:w-auto">
									{(searchQuery || statusFilter !== 'all') && (
										<button
											onClick={clearFilters}
											className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
										>
											<X className="h-3 w-3" />
											Clear
										</button>
									)}

									<Select value={statusFilter} onValueChange={setStatusFilter}>
										<SelectTrigger className="w-[140px] h-9">
											<SelectValue placeholder="Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Status</SelectItem>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="paused">Paused</SelectItem>
											<SelectItem value="canceled">Canceled</SelectItem>
										</SelectContent>
									</Select>

									<span className="text-sm text-muted-foreground whitespace-nowrap">
										{filteredSubscriptions.length} subscription
										{filteredSubscriptions.length !== 1 ? 's' : ''}
									</span>
								</div>
							</div>

							{/* Table */}
							<Table>
								<TableHeader className="bg-muted/50">
									<TableRow className="hover:bg-transparent">
										<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Tenant
										</TableHead>
										<TableHead className="hidden sm:table-cell text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Lease
										</TableHead>
										<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Amount
										</TableHead>
										<TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Payment Method
										</TableHead>
										<TableHead className="hidden lg:table-cell text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Next Charge
										</TableHead>
										<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Status
										</TableHead>
										<TableHead></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paginatedSubscriptions.map(sub => {
										const paymentInfo = sub.paymentMethodId
											? getPaymentMethodInfo(sub.paymentMethodId)
											: null

										return (
											<TableRow key={sub.id} className="group">
												<TableCell>
													<div className="flex items-center gap-3">
														<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
															<span className="text-xs font-medium text-primary">
																{sub.tenantId.slice(0, 2).toUpperCase()}
															</span>
														</div>
														<div>
															<p className="font-medium text-foreground text-sm">
																{sub.tenantId.slice(0, 8)}...
															</p>
															<p className="text-xs text-muted-foreground sm:hidden">
																{sub.leaseId.slice(0, 8)}...
															</p>
														</div>
													</div>
												</TableCell>
												<TableCell className="hidden sm:table-cell text-sm">
													{sub.leaseId.slice(0, 8)}...
												</TableCell>
												<TableCell className="tabular-nums font-medium">
													{formatCents(sub.amount ?? 0)}/mo
												</TableCell>
												<TableCell className="hidden md:table-cell">
													{paymentInfo ? (
														<div className="flex items-center gap-2 text-sm">
															<CreditCard className="w-4 h-4 text-muted-foreground" />
															<span>
																{paymentInfo.type} ••{paymentInfo.last4}
															</span>
														</div>
													) : (
														<span className="text-muted-foreground text-sm">
															-
														</span>
													)}
												</TableCell>
												<TableCell className="hidden lg:table-cell text-sm">
													{sub.nextChargeDate
														? format(
																new Date(sub.nextChargeDate),
																'MMM d, yyyy'
															)
														: '-'}
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														{getStatusBadge(sub.status as SubscriptionStatus)}
														{sub.status === 'active' && (
															<span title="Autopay enabled">
																<Zap className="w-3.5 h-3.5 text-primary" />
															</span>
														)}
													</div>
												</TableCell>
												<TableCell>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="sm"
																disabled={actioningId === sub.id}
																className="h-8 w-8 p-0"
															>
																{actioningId === sub.id ? (
																	<Clock className="h-4 w-4 animate-spin" />
																) : (
																	<MoreVertical className="h-4 w-4" />
																)}
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem>
																<Eye className="mr-2 h-4 w-4" />
																View Details
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															{sub.status === 'active' && (
																<DropdownMenuItem
																	onClick={() => sub.id && handlePause(sub.id)}
																>
																	<Pause className="mr-2 h-4 w-4" />
																	Pause Subscription
																</DropdownMenuItem>
															)}
															{sub.status === 'paused' && (
																<DropdownMenuItem
																	onClick={() => sub.id && handleResume(sub.id)}
																>
																	<Play className="mr-2 h-4 w-4" />
																	Resume Subscription
																</DropdownMenuItem>
															)}
															{sub.status !== 'canceled' && (
																<DropdownMenuItem
																	onClick={() => sub.id && handleCancel(sub.id)}
																	className="text-destructive focus:text-destructive"
																>
																	<XCircle className="mr-2 h-4 w-4" />
																	Cancel Subscription
																</DropdownMenuItem>
															)}
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>

							{/* Empty state */}
							{filteredSubscriptions.length === 0 &&
								(subscriptions?.length ?? 0) > 0 && (
									<div className="text-center py-12">
										<p className="text-muted-foreground">
											No subscriptions match your filters
										</p>
										<button
											onClick={clearFilters}
											className="mt-3 text-sm text-primary hover:underline"
										>
											Clear filters
										</button>
									</div>
								)}

							{(subscriptions?.length ?? 0) === 0 && (
								<div className="text-center py-12">
									<div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-6">
										<DollarSign className="w-8 h-8 text-primary" />
									</div>
									<h2 className="text-xl font-semibold text-foreground mb-3">
										No subscriptions yet
									</h2>
									<p className="text-muted-foreground">
										Create subscriptions for tenants to enable automatic rent
										collection.
									</p>
								</div>
							)}

							{/* Pagination */}
							{filteredSubscriptions.length > 0 && totalPages > 1 && (
								<div className="px-4 py-3 border-t border-border flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										Showing {(currentPage - 1) * itemsPerPage + 1}-
										{Math.min(
											currentPage * itemsPerPage,
											filteredSubscriptions.length
										)}{' '}
										of {filteredSubscriptions.length}
									</span>
									<div className="flex items-center gap-1">
										<button
											onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
											disabled={currentPage === 1}
											className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											<ChevronLeft className="w-4 h-4" />
										</button>
										{Array.from(
											{ length: Math.min(totalPages, 5) },
											(_, i) => i + 1
										).map(page => (
											<button
												key={page}
												onClick={() => setCurrentPage(page)}
												className={`min-w-8 h-8 px-2 text-sm font-medium rounded-lg transition-colors ${
													page === currentPage
														? 'bg-primary text-primary-foreground'
														: 'hover:bg-muted text-muted-foreground'
												}`}
											>
												{page}
											</button>
										))}
										<button
											onClick={() =>
												setCurrentPage(p => Math.min(totalPages, p + 1))
											}
											disabled={currentPage === totalPages}
											className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											<ChevronRight className="w-4 h-4" />
										</button>
									</div>
								</div>
							)}
						</div>
					</TabsContent>

					{/* Upcoming Payments Tab */}
					<TabsContent value="upcoming">
						<div className="bg-card border border-border rounded-lg overflow-hidden">
							<div className="px-4 py-3 border-b border-border">
								<h3 className="font-medium text-foreground">
									Upcoming Payments (Next 30 Days)
								</h3>
								<p className="text-sm text-muted-foreground">
									{upcomingPayments?.length ?? 0} expected payments
								</p>
							</div>
							<Table>
								<TableHeader className="bg-muted/50">
									<TableRow className="hover:bg-transparent">
										<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Tenant
										</TableHead>
										<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Property
										</TableHead>
										<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Amount
										</TableHead>
										<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Due Date
										</TableHead>
										<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Autopay
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{upcomingPayments?.map(payment => (
										<TableRow key={payment.id}>
											<TableCell className="font-medium text-sm">
												{payment.tenantName}
											</TableCell>
											<TableCell className="text-sm">
												{payment.propertyName} - {payment.unitNumber}
											</TableCell>
											<TableCell className="tabular-nums font-medium">
												{formatCents(payment.amount)}
											</TableCell>
											<TableCell className="text-sm">
												{format(new Date(payment.dueDate), 'MMM d, yyyy')}
											</TableCell>
											<TableCell>
												{payment.autopayEnabled ? (
													<span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
														<Zap className="w-3 h-3" />
														Enabled
													</span>
												) : (
													<span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
														Not setup
													</span>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							{(upcomingPayments?.length ?? 0) === 0 && (
								<div className="text-center py-12">
									<Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
									<p className="text-muted-foreground">
										No upcoming payments in the next 30 days
									</p>
								</div>
							)}
						</div>
					</TabsContent>

					{/* Payment History Tab */}
					<TabsContent value="history">
						<div className="bg-card border border-border rounded-lg overflow-hidden">
							<div className="px-4 py-3 border-b border-border">
								<h3 className="font-medium text-foreground">Payment History</h3>
								<p className="text-sm text-muted-foreground">
									{paymentHistory?.length ?? 0} total payments
								</p>
							</div>
							<Table>
								<TableHeader className="bg-muted/50">
									<TableRow className="hover:bg-transparent">
										<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Date
										</TableHead>
										<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Tenant
										</TableHead>
										<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Amount
										</TableHead>
										<TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Description
										</TableHead>
										<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Status
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paymentHistory?.slice(0, 20).map(payment => (
										<TableRow key={payment.id}>
											<TableCell className="text-sm">
												{format(new Date(payment.created_at), 'MMM d, yyyy')}
											</TableCell>
											<TableCell className="font-medium text-sm">
												{payment.tenant_id.slice(0, 8)}...
											</TableCell>
											<TableCell className="tabular-nums">
												{formatCents(payment.amount)}
											</TableCell>
											<TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
												{payment.description || 'Rent payment'}
											</TableCell>
											<TableCell>
												{getPaymentStatusBadge(payment.status)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							{(paymentHistory?.length ?? 0) === 0 && (
								<div className="text-center py-12">
									<FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
									<p className="text-muted-foreground">
										No payment history yet
									</p>
								</div>
							)}
						</div>
					</TabsContent>
				</Tabs>
			</BlurFade>
		</div>
	)
}
