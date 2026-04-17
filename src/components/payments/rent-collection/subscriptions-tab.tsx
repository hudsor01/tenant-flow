'use client'

import { useEffect, useState } from 'react'
import {
	ChevronLeft,
	ChevronRight,
	Search,
	X
} from 'lucide-react'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { SubscriptionsTable, SubscriptionsEmptyStates } from './subscriptions-tab-table'

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
	actioningId: string | null
}

export function SubscriptionsTab({
	subscriptions,
	getPaymentMethodInfo,
	onPause,
	onResume,
	actioningId
}: SubscriptionsTabProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<string>('all')
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 10

	const filteredSubscriptions = (() => {
		return subscriptions.filter(sub => {
			if (searchQuery) {
				const query = searchQuery.toLowerCase()
				const tenantId = sub.tenantId ?? ''
				const leaseId = sub.leaseId ?? ''
				if (!tenantId.toLowerCase().includes(query) && !leaseId.toLowerCase().includes(query)) return false
			}
			if (statusFilter !== 'all' && sub.status !== statusFilter) return false
			return true
		})
	})()

	const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage)
	const paginatedSubscriptions = filteredSubscriptions.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	)

	useEffect(() => { setCurrentPage(1) }, [searchQuery, statusFilter])

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
					<Input placeholder="Search subscriptions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
				</div>
				<div className="flex items-center gap-3 sm:ml-auto w-full sm:w-auto">
					{(searchQuery || statusFilter !== 'all') && (
						<button onClick={clearFilters} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
							<X className="h-3 w-3" />
							Clear
						</button>
					)}
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="paused">Paused</SelectItem>
							<SelectItem value="cancelled">Canceled</SelectItem>
						</SelectContent>
					</Select>
					<span className="text-sm text-muted-foreground whitespace-nowrap">
						{filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? 's' : ''}
					</span>
				</div>
			</div>

			<SubscriptionsTable
				subscriptions={paginatedSubscriptions}
				getPaymentMethodInfo={getPaymentMethodInfo}
				onPause={onPause}
				onResume={onResume}
				actioningId={actioningId}
			/>

			<SubscriptionsEmptyStates
				filteredCount={filteredSubscriptions.length}
				totalCount={subscriptions.length}
				onClearFilters={clearFilters}
			/>

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
						{Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
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
