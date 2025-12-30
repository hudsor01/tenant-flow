'use client'

import { AlertTriangle, ChevronDown, DollarSign, MoreVertical, Send, X } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '#components/ui/collapsible'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { formatCents } from '#lib/formatters/currency'

interface OverduePayment {
	id: string
	tenantName: string
	propertyName: string
	unitNumber: string
	amount: number
	daysOverdue: number
	lateFeeApplied: boolean
	lateFeeAmount: number
}

interface OverduePaymentsAlertProps {
	payments: OverduePayment[]
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function OverduePaymentsAlert({
	payments,
	open,
	onOpenChange
}: OverduePaymentsAlertProps) {
	if (payments.length === 0) return null

	return (
		<BlurFade delay={0.4} inView>
			<Collapsible open={open} onOpenChange={onOpenChange} className="mb-6">
				<CollapsibleTrigger className="w-full">
					<div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-destructive/15 transition-colors">
						<div className="flex items-center gap-3">
							<AlertTriangle className="w-5 h-5 text-destructive" />
							<span className="font-medium text-foreground">
								{payments.length} Overdue Payment
								{payments.length !== 1 ? 's' : ''} Need Attention
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
								{payments.slice(0, 5).map(payment => (
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
													<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
	)
}
