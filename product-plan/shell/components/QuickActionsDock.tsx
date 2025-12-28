'use client'

import { Plus, FileText, Wrench, DollarSign, Bell } from 'lucide-react'

export interface QuickAction {
	id: string
	label: string
	icon: React.ReactNode
	onClick?: () => void
}

export interface QuickActionsDockProps {
	actions?: QuickAction[]
	onAction?: (actionId: string) => void
}

const defaultActions: QuickAction[] = [
	{
		id: 'add-property',
		label: 'Add Property',
		icon: <Plus className="w-5 h-5" />
	},
	{
		id: 'new-lease',
		label: 'New Lease',
		icon: <FileText className="w-5 h-5" />
	},
	{
		id: 'maintenance',
		label: 'Maintenance',
		icon: <Wrench className="w-5 h-5" />
	},
	{
		id: 'record-payment',
		label: 'Record Payment',
		icon: <DollarSign className="w-5 h-5" />
	},
	{
		id: 'notifications',
		label: 'Notifications',
		icon: <Bell className="w-5 h-5" />
	}
]

export function QuickActionsDock({
	actions = defaultActions,
	onAction
}: QuickActionsDockProps) {
	return (
		<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:left-[calc(50%+7rem)]">
			<div className="flex items-center gap-2 px-4 py-3 bg-card/80 backdrop-blur-md border border-border rounded-2xl shadow-lg">
				{actions.map(action => (
					<button
						key={action.id}
						onClick={() => {
							action.onClick?.()
							onAction?.(action.id)
						}}
						className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-muted/50 hover:bg-primary/10 hover:scale-110 transition-all duration-200 ease-out"
						title={action.label}
					>
						<span className="text-muted-foreground group-hover:text-primary transition-colors">
							{action.icon}
						</span>
						{/* Tooltip */}
						<span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium bg-foreground text-background rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
							{action.label}
						</span>
					</button>
				))}
			</div>
		</div>
	)
}
