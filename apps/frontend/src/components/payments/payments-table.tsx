'use client'

import { Zap, Eye, Send } from 'lucide-react'
import type { PaymentItem } from '@repo/shared/types/sections/payments'
import { formatCurrency, formatDate, getStatusConfig, getInitials } from './payment-utils'

interface PaymentsTableProps {
	payments: PaymentItem[]
	onView: ((id: string) => void) | undefined
	onSendReminder: ((id: string) => void) | undefined
}

export function PaymentsTable({
	payments,
	onView,
	onSendReminder
}: PaymentsTableProps) {
	return (
		<div className="bg-card border border-border rounded-lg overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead className="bg-muted/50 border-b border-border">
						<tr>
							<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Tenant
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
								Property
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Due
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
								Paid
							</th>
							<th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Amount
							</th>
							<th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
								Fees
							</th>
							<th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
								Net
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Status
							</th>
							<th className="px-4 py-3"></th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{payments.map(payment => {
							const statusConfig = getStatusConfig(payment.status)
							const StatusIcon = statusConfig.icon

							return (
								<tr
									key={payment.id}
									className="hover:bg-muted/50 transition-colors"
								>
									<td className="px-4 py-4">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
												<span className="text-xs font-medium text-primary">
													{getInitials(payment.tenantName)}
												</span>
											</div>
											<div>
												<p className="font-medium text-foreground text-sm">
													{payment.tenantName}
												</p>
												<p className="text-xs text-muted-foreground sm:hidden">
													{payment.propertyName}
												</p>
											</div>
										</div>
									</td>
									<td className="px-4 py-4 text-sm text-foreground hidden sm:table-cell">
										<span>{payment.propertyName}</span>
										<span className="text-muted-foreground">
											{' '}
											· {payment.unitNumber}
										</span>
									</td>
									<td className="px-4 py-4 text-sm text-foreground">
										{formatDate(payment.dueDate)}
									</td>
									<td className="px-4 py-4 text-sm text-foreground hidden md:table-cell">
										{payment.paidDate ? formatDate(payment.paidDate) : '-'}
									</td>
									<td className="px-4 py-4 text-right">
										<div>
											<span className="font-medium text-foreground">
												{formatCurrency(payment.amount)}
											</span>
											{payment.lateFee > 0 && (
												<p className="text-xs text-destructive">
													+{formatCurrency(payment.lateFee)} late
												</p>
											)}
										</div>
									</td>
									<td className="px-4 py-4 text-right text-sm text-muted-foreground hidden lg:table-cell">
										{payment.platformFee > 0
											? `-${formatCurrency(payment.platformFee)}`
											: '-'}
									</td>
									<td className="px-4 py-4 text-right hidden lg:table-cell">
										<span className="font-medium text-foreground">
											{payment.netAmount > 0
												? formatCurrency(payment.netAmount)
												: '-'}
										</span>
									</td>
									<td className="px-4 py-4">
										<div className="flex items-center gap-2">
											<span
												className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}
											>
												<StatusIcon className="w-3 h-3" />
												{statusConfig.label}
											</span>
											{payment.isAutopay && (
												<Zap
													className="w-3.5 h-3.5 text-primary"
													aria-label="Autopay enabled"
												/>
											)}
										</div>
									</td>
									<td className="px-4 py-4">
										<div className="flex items-center gap-1">
											<button
												onClick={() => onView?.(payment.id)}
												className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
												title="View details"
												aria-label="View payment details"
											>
												<Eye className="w-4 h-4" />
											</button>
											{(payment.status === 'failed' ||
												payment.status === 'pending') && (
												<button
													onClick={() => onSendReminder?.(payment.id)}
													className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
													title="Send reminder"
													aria-label="Send payment reminder"
												>
													<Send className="w-4 h-4" />
												</button>
											)}
										</div>
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>

			{payments.length === 0 && (
				<div className="text-center py-12">
					<p className="text-muted-foreground">No payments match your filters</p>
				</div>
			)}
		</div>
	)
}
