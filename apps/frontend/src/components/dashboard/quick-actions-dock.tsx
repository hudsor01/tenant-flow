'use client'

import { Dock, DockIcon } from '#components/ui/dock'
import { Tooltip, TooltipContent, TooltipTrigger } from '#components/ui/tooltip'
import { cn } from '#lib/utils'
import { Bell, DollarSign, FileText, Plus, Wrench } from 'lucide-react'
import Link from 'next/link'

interface QuickAction {
	id: string
	label: string
	icon: React.ComponentType<{ className?: string }>
	href: string
}

/**
 * Default quick actions for the floating dock.
 * Per spec: Plus (Add Property), FileText (New Lease), Wrench (Maintenance),
 * DollarSign (Record Payment), Bell (Notifications)
 */
const defaultActions: QuickAction[] = [
	{ id: 'add-property', label: 'Add Property', icon: Plus, href: '/properties/new' },
	{ id: 'new-lease', label: 'New Lease', icon: FileText, href: '/leases/new' },
	{ id: 'maintenance', label: 'Maintenance Request', icon: Wrench, href: '/maintenance/new' },
	{ id: 'record-payment', label: 'Record Payment', icon: DollarSign, href: '/rent-collection' },
	{ id: 'notifications', label: 'Notifications', icon: Bell, href: '/dashboard/settings?tab=notifications' },
]

export interface QuickActionsDockProps {
	actions?: QuickAction[]
	className?: string
}

/**
 * QuickActionsDock - Floating dock with quick actions
 *
 * Features:
 * - MacOS-style floating dock with magnification effect
 * - Positioned at bottom center of viewport (offset for sidebar)
 * - One-click access to frequent actions
 * - Icons magnify on hover for visual feedback
 * - Hidden on mobile (< lg breakpoint)
 */
export function QuickActionsDock({ actions = defaultActions, className }: QuickActionsDockProps) {
	return (
		<div
			className={cn(
				'fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 lg:block lg:left-[calc(50%+7rem)]',
				className,
			)}
			data-testid="quick-actions-dock"
		>
			<Dock
				iconSize={40}
				iconMagnification={56}
				iconDistance={100}
				className="bg-card/80 border-border shadow-lg backdrop-blur-md"
			>
				{actions.map((action) => (
					<Tooltip key={action.id}>
						<TooltipTrigger asChild>
							<Link href={action.href} aria-label={action.label}>
								<DockIcon className="bg-muted/50 hover:bg-primary/10">
									<action.icon className="text-muted-foreground group-hover:text-primary h-5 w-5 transition-colors" />
								</DockIcon>
							</Link>
						</TooltipTrigger>
						<TooltipContent side="top" sideOffset={8}>
							{action.label}
						</TooltipContent>
					</Tooltip>
				))}
			</Dock>
		</div>
	)
}
