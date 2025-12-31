'use client'

import { Badge } from '#components/ui/badge'
import { cn } from '#lib/utils'
import type { UnitStatus } from '@repo/shared/types/core'
import {
	AlertTriangle,
	Calendar,
	Home,
	Users
} from 'lucide-react'
import type * as React from 'react'

/**
 * Enhanced status configuration with icons and semantic meaning
 * Keys match DB enum values (lowercase)
 */
export const statusConfig: Record<
	UnitStatus,
	{
		variant: 'default' | 'secondary' | 'destructive' | 'outline'
		label: string
		icon: React.ComponentType<{ className?: string }>
		className: string
		priority: number
	}
> = {
	occupied: {
		variant: 'default',
		label: 'Occupied',
		icon: Users,
		className:
			'bg-accent/10 text-accent-foreground border-accent/20 dark:bg-accent/20 dark:text-accent dark:border-accent/80',
		priority: 1
	},
	available: {
		variant: 'secondary',
		label: 'Available',
		icon: Home,
		className:
			'bg-primary/10 text-primary-foreground border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/80',
		priority: 2
	},
	maintenance: {
		variant: 'destructive',
		label: 'Maintenance',
		icon: AlertTriangle,
		className:
			'bg-destructive/10 text-destructive-foreground border-destructive/20 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/80',
		priority: 4
	},
	reserved: {
		variant: 'outline',
		label: 'Reserved',
		icon: Calendar,
		className:
			'bg-muted/10 text-muted-foreground border-muted/20 dark:bg-muted/20 dark:text-muted dark:border-muted/80',
		priority: 3
	}
}

interface UnitStatusBadgeProps {
	status: UnitStatus
	className?: string
}

export function UnitStatusBadge({ status, className }: UnitStatusBadgeProps) {
	const config = statusConfig[status]
	const IconComponent = config.icon

	return (
		<Badge
			variant={config.variant}
			className={cn(
				'flex items-center gap-1.5 px-3 py-1 font-medium text-xs rounded-full border transition-all',
				config.className,
				'hover:shadow-sm hover:scale-105',
				className
			)}
		>
			<IconComponent className="size-3" />
			{config.label}
		</Badge>
	)
}
