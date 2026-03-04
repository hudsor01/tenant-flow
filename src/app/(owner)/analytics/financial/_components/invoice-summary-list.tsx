'use client'

import { BlurFade } from '#components/ui/blur-fade'
import { Badge } from '#components/ui/badge'
import { formatCurrency } from '#lib/formatters/currency'

interface InvoiceStatusRow {
	status: string
	count: number
	amount: number
}

interface InvoiceSummaryListProps {
	invoiceSummary: InvoiceStatusRow[]
}

export function InvoiceSummaryList({ invoiceSummary }: InvoiceSummaryListProps) {
	return (
		<div className="space-y-4">
			{invoiceSummary.map((status, index) => (
				<BlurFade key={status.status} delay={1.3 + index * 0.05} inView>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-sm">{status.status}</span>
							<Badge variant="outline">{status.count}</Badge>
						</div>
						<p className="text-sm text-muted-foreground">
							{formatCurrency(status.amount)}
						</p>
					</div>
				</BlurFade>
			))}
		</div>
	)
}
