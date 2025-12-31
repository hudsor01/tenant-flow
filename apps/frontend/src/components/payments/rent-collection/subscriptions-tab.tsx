'use client'

import * as React from 'react'
import { format } from 'date-fns'
import {
	ChevronLeft,
	ChevronRight,
	Clock,
	CreditCard,
	DollarSign,
	Eye,
	MoreVertical,
	Pause,
	Play,
	Search,
	X,
	XCircle,
	Zap
} from 'lucide-react'
import { Input } from '#components/ui/input'
import { Button } from '#components/ui/button'
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import { formatCents } from '#lib/formatters/currency'
import { getStatusBadge, type SubscriptionStatus } from './status-utils'

interface Subscription {
	id: string
	tenantId: string
	leaseId: string
	amount?: number | undefined
	status: string
	paymentMethodId?: string | undefined
	nextChargeDate?: string | undefined
}

interface PaymentMethodInfo {
	type: string
	last4: string | null
	brand?: string | null | undefined
}

interface SubscriptionsTabProps {
	subscriptions: Subscription[]
	getPaymentMethodInfo: (paymentMethodId: string) => PaymentMethodInfo | null
	onPause: (id: string) => Promise<void>
	onResume: (id: string) => Promise<void>
	onCancel: (id: string) => Promise<void>
	actioningId: string | null
}

export function SubscriptionsTab({
	subscriptions,
	getPaymentMethodInfo,
	onPause,
	onResume,
	onCancel,
	actioningId
}: SubscriptionsTabProps) {
	const [searchQuery, setSearchQuery] = React.useState('')
	const [statusFilter, setStatusFilter] = React.useState<string>('all')
	const [currentPage, setCurrentPage] = React.useState(1)
	const itemsPerPage = 10

	// Filter subscriptions
	const filteredSubscriptions = React.useMemo(() => {
		return subscriptions.filter(sub => {
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

	return (
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
							<SelectItem value="cancelled">Canceled</SelectItem>
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
										<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
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
										<span className="text-muted-foreground text-sm">-</span>
									)}
								</TableCell>
								<TableCell className="hidden lg:table-cell text-sm">
									{sub.nextChargeDate
										? format(new Date(sub.nextChargeDate), 'MMM d, yyyy')
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
													onClick={() => sub.id && onPause(sub.id)}
												>
													<Pause className="mr-2 h-4 w-4" />
													Pause Subscription
												</DropdownMenuItem>
											)}
											{sub.status === 'paused' && (
												<DropdownMenuItem
													onClick={() => sub.id && onResume(sub.id)}
												>
													<Play className="mr-2 h-4 w-4" />
													Resume Subscription
												</DropdownMenuItem>
											)}
											{sub.status !== 'cancelled' && (
												<DropdownMenuItem
													onClick={() => sub.id && onCancel(sub.id)}
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
			{filteredSubscriptions.length === 0 && subscriptions.length > 0 && (
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

			{subscriptions.length === 0 && (
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
						{Math.min(currentPage * itemsPerPage, filteredSubscriptions.length)}{' '}
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
						{Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(
							page => (
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
							)
						)}
						<button
							onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
							className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
