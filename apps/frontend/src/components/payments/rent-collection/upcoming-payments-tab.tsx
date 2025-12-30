'use client'

import { format } from 'date-fns'
import { Calendar, Zap } from 'lucide-react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { formatCents } from '#lib/formatters/currency'

interface UpcomingPayment {
	id: string
	tenantName: string
	propertyName: string
	unitNumber: string
	amount: number
	dueDate: string
	autopayEnabled: boolean
}

interface UpcomingPaymentsTabProps {
	payments: UpcomingPayment[]
}

export function UpcomingPaymentsTab({ payments }: UpcomingPaymentsTabProps) {
	return (
		<div className="bg-card border border-border rounded-lg overflow-hidden">
			<div className="px-4 py-3 border-b border-border">
				<h3 className="font-medium text-foreground">
					Upcoming Payments (Next 30 Days)
				</h3>
				<p className="text-sm text-muted-foreground">
					{payments.length} expected payments
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
					{payments.map(payment => (
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
			{payments.length === 0 && (
				<div className="text-center py-12">
					<Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
					<p className="text-muted-foreground">
						No upcoming payments in the next 30 days
					</p>
				</div>
			)}
		</div>
	)
}
