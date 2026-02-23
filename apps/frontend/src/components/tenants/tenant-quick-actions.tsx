'use client'

import { UserPlus, Mail, Download, BarChart3 } from 'lucide-react'

interface TenantQuickActionsProps {
	onInvite: () => void
}

export function TenantQuickActions({ onInvite }: TenantQuickActionsProps) {
	return (
		<div className="flex items-center gap-3 mb-6">
			<button
				onClick={onInvite}
				className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
			>
				<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
					<UserPlus className="w-4 h-4" />
				</div>
				<div className="text-left">
					<div className="text-sm font-medium">Invite Tenant</div>
					<div className="text-xs text-muted-foreground">Send invitation</div>
				</div>
			</button>
			<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
				<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
					<Mail className="w-4 h-4" />
				</div>
				<div className="text-left">
					<div className="text-sm font-medium">Message All</div>
					<div className="text-xs text-muted-foreground">Bulk email</div>
				</div>
			</button>
			<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
				<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
					<Download className="w-4 h-4" />
				</div>
				<div className="text-left">
					<div className="text-sm font-medium">Export</div>
					<div className="text-xs text-muted-foreground">Download data</div>
				</div>
			</button>
			<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
				<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
					<BarChart3 className="w-4 h-4" />
				</div>
				<div className="text-left">
					<div className="text-sm font-medium">Analytics</div>
					<div className="text-xs text-muted-foreground">View insights</div>
				</div>
			</button>
		</div>
	)
}
