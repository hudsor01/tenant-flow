'use client'

import { format } from 'date-fns'
import {
	Clock,
	CreditCard,
	DollarSign,
	Eye,
	MoreVertical,
	Pause,
	Play,
	XCircle,
	Zap
} from 'lucide-react'
import { Button } from '#components/ui/button'
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

interface SubscriptionsTableProps {
	subscriptions: Subscription[]
	getPaymentMethodInfo: (paymentMethodId: string) => PaymentMethodInfo | null
	onPause: (id: string) => Promise<void>
	onResume: (id: string) => Promise<void>
	onCancel: (id: string) => Promise<void>
	actioningId: string | null
}

export function SubscriptionsTable({
	subscriptions,
	getPaymentMethodInfo,
	onPause,
	onResume,
	onCancel,
	actioningId
}: SubscriptionsTableProps) {
	return (
		<Table>
			<TableHeader className="bg-muted/50">
				<TableRow className="hover:bg-transparent">
					<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tenant</TableHead>
					<TableHead className="hidden sm:table-cell text-xs font-medium text-muted-foreground uppercase tracking-wider">Lease</TableHead>
					<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</TableHead>
					<TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Method</TableHead>
					<TableHead className="hidden lg:table-cell text-xs font-medium text-muted-foreground uppercase tracking-wider">Next Charge</TableHead>
					<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
					<TableHead></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{subscriptions.map(sub => {
					const paymentInfo = sub.paymentMethodId ? getPaymentMethodInfo(sub.paymentMethodId) : null
					return (
						<TableRow key={sub.id} className="group">
							<TableCell>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
										<span className="text-xs font-medium text-primary">{sub.tenantId.slice(0, 2).toUpperCase()}</span>
									</div>
									<div>
										<p className="font-medium text-foreground text-sm">{sub.tenantId.slice(0, 8)}...</p>
										<p className="text-xs text-muted-foreground sm:hidden">{sub.leaseId.slice(0, 8)}...</p>
									</div>
								</div>
							</TableCell>
							<TableCell className="hidden sm:table-cell text-sm">{sub.leaseId.slice(0, 8)}...</TableCell>
							<TableCell className="tabular-nums font-medium">{formatCents(sub.amount ?? 0)}/mo</TableCell>
							<TableCell className="hidden md:table-cell">
								{paymentInfo ? (
									<div className="flex items-center gap-2 text-sm">
										<CreditCard className="w-4 h-4 text-muted-foreground" />
										<span>{paymentInfo.type} ••{paymentInfo.last4}</span>
									</div>
								) : (
									<span className="text-muted-foreground text-sm">-</span>
								)}
							</TableCell>
							<TableCell className="hidden lg:table-cell text-sm">
								{sub.nextChargeDate ? format(new Date(sub.nextChargeDate), 'MMM d, yyyy') : '-'}
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2">
									{getStatusBadge(sub.status as SubscriptionStatus)}
									{sub.status === 'active' && (
										<span title="Autopay enabled"><Zap className="w-3.5 h-3.5 text-primary" /></span>
									)}
								</div>
							</TableCell>
							<TableCell>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="sm" disabled={actioningId === sub.id} className="h-8 w-8 p-0">
											{actioningId === sub.id ? (<Clock className="h-4 w-4 animate-spin" />) : (<MoreVertical className="h-4 w-4" />)}
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
										<DropdownMenuSeparator />
										{sub.status === 'active' && (
											<DropdownMenuItem onClick={() => sub.id && onPause(sub.id)}><Pause className="mr-2 h-4 w-4" />Pause Subscription</DropdownMenuItem>
										)}
										{sub.status === 'paused' && (
											<DropdownMenuItem onClick={() => sub.id && onResume(sub.id)}><Play className="mr-2 h-4 w-4" />Resume Subscription</DropdownMenuItem>
										)}
										{sub.status !== 'cancelled' && (
											<DropdownMenuItem onClick={() => sub.id && onCancel(sub.id)} className="text-destructive focus:text-destructive">
												<XCircle className="mr-2 h-4 w-4" />Cancel Subscription
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
	)
}

export function SubscriptionsEmptyStates({
	filteredCount,
	totalCount,
	onClearFilters
}: {
	filteredCount: number
	totalCount: number
	onClearFilters: () => void
}) {
	if (filteredCount === 0 && totalCount > 0) {
		return (
			<div className="text-center py-12">
				<p className="text-muted-foreground">No subscriptions match your filters</p>
				<button onClick={onClearFilters} className="mt-3 text-sm text-primary hover:underline">Clear filters</button>
			</div>
		)
	}

	if (totalCount === 0) {
		return (
			<div className="text-center py-12">
				<div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-6">
					<DollarSign className="w-8 h-8 text-primary" />
				</div>
				<h2 className="text-xl font-semibold text-foreground mb-3">No subscriptions yet</h2>
				<p className="text-muted-foreground">Create subscriptions for tenants to enable automatic rent collection.</p>
			</div>
		)
	}

	return null
}
