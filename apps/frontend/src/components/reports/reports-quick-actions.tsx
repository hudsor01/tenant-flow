'use client'

import { DollarSign, FileText, Calendar, Download } from 'lucide-react'

interface ReportsQuickActionsProps {
	onGenerateReport: ((typeId: string) => void) | undefined
}

export function ReportsQuickActions({
	onGenerateReport
}: ReportsQuickActionsProps) {
	return (
		<div className="flex items-center gap-3 mb-6">
			<button
				onClick={() => onGenerateReport?.('financial-summary')}
				className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
			>
				<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
					<DollarSign className="w-4 h-4" />
				</div>
				<div className="text-left">
					<div className="text-sm font-medium">Financial Summary</div>
					<div className="text-xs text-muted-foreground">Quick generate</div>
				</div>
			</button>
			<button
				onClick={() => onGenerateReport?.('rent-roll')}
				className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
			>
				<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
					<FileText className="w-4 h-4" />
				</div>
				<div className="text-left">
					<div className="text-sm font-medium">Rent Roll</div>
					<div className="text-xs text-muted-foreground">Current snapshot</div>
				</div>
			</button>
			<button
				onClick={() => onGenerateReport?.('lease-expiry')}
				className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
			>
				<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
					<Calendar className="w-4 h-4" />
				</div>
				<div className="text-left">
					<div className="text-sm font-medium">Lease Expiries</div>
					<div className="text-xs text-muted-foreground">Next 90 days</div>
				</div>
			</button>
			<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
				<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
					<Download className="w-4 h-4" />
				</div>
				<div className="text-left">
					<div className="text-sm font-medium">Export All</div>
					<div className="text-xs text-muted-foreground">Download archive</div>
				</div>
			</button>
		</div>
	)
}
