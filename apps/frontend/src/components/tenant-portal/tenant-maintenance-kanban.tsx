'use client'

/**
 * Tenant Maintenance Kanban — Read-Only
 *
 * Read-only kanban board for the tenant portal maintenance view.
 * Tenants can see their maintenance request statuses but cannot
 * drag to change status (read-only per CONTEXT.md locked decision).
 *
 * CONTEXT.md locked decision: Tenant portal maintenance kanban is read-only
 * (no drag-to-change-status for tenants). Only owners can modify status.
 */

import { Badge } from '#components/ui/badge'
import type { MaintenanceRequest } from '#shared/types/core'

const TENANT_KANBAN_COLUMNS = [
	{ id: 'open', label: 'Open', description: 'Awaiting review' },
	{ id: 'assigned', label: 'Assigned', description: 'Vendor assigned' },
	{ id: 'in_progress', label: 'In Progress', description: 'Work started' },
	{ id: 'needs_reassignment', label: 'Needs Reassignment', description: 'New vendor needed' },
	{ id: 'on_hold', label: 'On Hold', description: 'Paused' },
	{ id: 'completed', label: 'Completed', description: 'Work finished' },
	{ id: 'cancelled', label: 'Cancelled', description: 'Request cancelled' },
] as const

type KanbanColumnId = typeof TENANT_KANBAN_COLUMNS[number]['id']

function getPriorityBadgeVariant(priority: string): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (priority) {
		case 'urgent':
			return 'destructive'
		case 'high':
			return 'destructive'
		case 'medium':
			return 'default'
		case 'normal':
			return 'secondary'
		case 'low':
			return 'outline'
		default:
			return 'secondary'
	}
}

function formatDate(dateString: string): string {
	const date = new Date(dateString)
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface TenantKanbanCardProps {
	request: MaintenanceRequest
}

function TenantKanbanCard({ request }: TenantKanbanCardProps) {
	return (
		<div className="bg-card border border-border rounded-lg p-3 space-y-2">
			<p className="text-sm font-medium text-foreground leading-snug">{request.title}</p>
			<div className="flex flex-wrap items-center gap-1.5">
				<Badge variant={getPriorityBadgeVariant(request.priority)} className="text-xs capitalize">
					{request.priority}
				</Badge>
				<Badge variant="outline" className="text-xs capitalize">
					{request.status.replace(/_/g, ' ')}
				</Badge>
			</div>
			<p className="text-xs text-muted-foreground">
				{request.created_at ? formatDate(request.created_at) : ''}
			</p>
		</div>
	)
}

interface KanbanColumnProps {
	columnId: KanbanColumnId
	label: string
	description: string
	requests: MaintenanceRequest[]
}

function KanbanColumn({ label, description, requests }: KanbanColumnProps) {
	return (
		<div className="flex flex-col min-w-[220px] w-[220px] bg-muted/30 rounded-lg">
			{/* Column Header */}
			<div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
				<div className="flex-1 min-w-0">
					<h3 className="text-sm font-medium text-foreground truncate">{label}</h3>
					<p className="text-xs text-muted-foreground truncate">{description}</p>
				</div>
				<span className="shrink-0 px-1.5 py-0.5 bg-muted rounded-full text-xs font-medium text-muted-foreground">
					{requests.length}
				</span>
			</div>

			{/* Cards */}
			<div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-80">
				{requests.length === 0 ? (
					<p className="text-xs text-muted-foreground text-center py-4">No requests</p>
				) : (
					requests.map(request => (
						<TenantKanbanCard key={request.id} request={request} />
					))
				)}
			</div>
		</div>
	)
}

interface TenantMaintenanceKanbanProps {
	requests: MaintenanceRequest[]
}

export function TenantMaintenanceKanban({ requests }: TenantMaintenanceKanbanProps) {
	// Group requests by status
	const requestsByStatus = requests.reduce(
		(acc, request) => {
			const status = request.status as KanbanColumnId
			if (!acc[status]) acc[status] = []
			acc[status].push(request)
			return acc
		},
		{} as Record<KanbanColumnId, MaintenanceRequest[]>
	)

	// Show all 7 columns but hide columns with 0 requests except open/in_progress/completed
	const visibleColumns = TENANT_KANBAN_COLUMNS.filter(col => {
		const count = requestsByStatus[col.id]?.length ?? 0
		if (['open', 'in_progress', 'completed'].includes(col.id)) return true
		return count > 0
	})

	if (requests.length === 0) {
		return (
			<div className="text-center py-8">
				<p className="text-sm text-muted-foreground">No maintenance requests yet.</p>
				<p className="text-xs text-muted-foreground mt-1">
					Submit a request if you need something repaired or serviced.
				</p>
			</div>
		)
	}

	return (
		<div className="overflow-x-auto pb-4 -mx-6 px-6">
			<div className="flex gap-3 min-w-max">
				{visibleColumns.map(col => (
					<KanbanColumn
						key={col.id}
						columnId={col.id}
						label={col.label}
						description={col.description}
						requests={requestsByStatus[col.id] ?? []}
					/>
				))}
			</div>
		</div>
	)
}
