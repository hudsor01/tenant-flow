'use client'

import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { formatCents } from '#lib/formatters/currency'
import { getPaymentStatusBadge } from './status-utils'

interface PaymentHistoryItem {
	id: string
	created_at: string
	tenant_id: string
	amount: number
	description?: string
	status: string
}

interface PaymentHistoryTabProps {
	payments: PaymentHistoryItem[]
}

export function PaymentHistoryTab({ payments }: PaymentHistoryTabProps) {
	return (
		<div className="bg-card border border-border rounded-lg overflow-hidden">
			<div className="px-4 py-3 border-b border-border">
				<h3 className="font-medium text-foreground">Payment History</h3>
				<p className="text-sm text-muted-foreground">
					{payments.length} total payments
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
					{payments.slice(0, 20).map(payment => (
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
							<TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			{payments.length === 0 && (
				<div className="text-center py-12">
					<FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
					<p className="text-muted-foreground">No payment history yet</p>
				</div>
			)}
		</div>
	)
}
