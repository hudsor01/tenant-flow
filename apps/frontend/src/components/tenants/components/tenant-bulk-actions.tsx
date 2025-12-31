'use client'

interface TenantBulkActionsProps {
	selectedCount: number
	onClearSelection: () => void
}

export function TenantBulkActions({
	selectedCount,
	onClearSelection
}: TenantBulkActionsProps) {
	if (selectedCount === 0) return null

	return (
		<div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
			<span className="text-sm font-medium text-foreground">
				{selectedCount} selected
			</span>
			<div className="flex items-center gap-2">
				<button className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-sm hover:bg-muted transition-colors">
					Send Message
				</button>
				<button className="px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 rounded-sm transition-colors">
					Delete
				</button>
				<button
					onClick={onClearSelection}
					className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					Clear
				</button>
			</div>
		</div>
	)
}
