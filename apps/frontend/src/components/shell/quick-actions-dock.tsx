'use client'

import { Plus, FileText, Wrench, DollarSign, Bell, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

export interface QuickAction {
	id: string
	label: string
	icon: LucideIcon
	href: string
}

export interface QuickActionsDockProps {
	actions?: QuickAction[]
	className?: string
}

const defaultActions: QuickAction[] = [
	{ id: 'add-property', label: 'Add Property', icon: Plus, href: '/properties/new' },
	{ id: 'new-lease', label: 'New Lease', icon: FileText, href: '/leases/new' },
	{ id: 'maintenance', label: 'Maintenance', icon: Wrench, href: '/maintenance/new' },
	{ id: 'record-payment', label: 'Record Payment', icon: DollarSign, href: '/rent-collection' },
	{ id: 'notifications', label: 'Notifications', icon: Bell, href: '/dashboard/settings?tab=notifications' }
]

export function QuickActionsDock({
	actions = defaultActions,
	className = ''
}: QuickActionsDockProps) {
	return (
		<div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden lg:block lg:left-[calc(50%+7rem)] ${className}`}>
			<div className="flex items-center gap-2 px-4 py-3 bg-card/80 backdrop-blur-md border border-border rounded-2xl shadow-lg">
				{actions.map(action => {
					const Icon = action.icon
					return (
						<Link
							key={action.id}
							href={action.href}
							className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-muted/50 hover:bg-primary/10 hover:scale-110 transition-all duration-200 ease-out"
							aria-label={action.label}
						>
							<Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
							{/* Tooltip */}
							<span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium bg-foreground text-background rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
								{action.label}
							</span>
						</Link>
					)
				})}
			</div>
		</div>
	)
}
