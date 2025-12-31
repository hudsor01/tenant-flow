'use client'

import { format } from 'date-fns'
import { ChevronDown, XCircle } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '#components/ui/collapsible'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { formatCents } from '#lib/formatters/currency'

interface FailedAttempt {
	id: string
	created_at: string
	tenant_id: string
	amount: number
	attemptNumber: number
	failureReason: string
	nextRetryDate?: string
}

interface FailedPaymentsAlertProps {
	attempts: FailedAttempt[]
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function FailedPaymentsAlert({
	attempts,
	open,
	onOpenChange
}: FailedPaymentsAlertProps) {
	if (attempts.length === 0) return null

	return (
		<BlurFade delay={0.4} inView>
			<Collapsible open={open} onOpenChange={onOpenChange} className="mb-6">
				<CollapsibleTrigger className="w-full">
					<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
						<div className="flex items-center gap-3">
							<XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
							<span className="font-medium text-foreground">
								{attempts.length} Failed Payment Attempt
								{attempts.length !== 1 ? 's' : ''}
							</span>
						</div>
						<ChevronDown
							className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
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
								{attempts.slice(0, 5).map(attempt => (
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
	)
}
