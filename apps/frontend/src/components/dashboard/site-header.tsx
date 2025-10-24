import { NavUser } from '@/components/dashboard/nav-user'
import { cn } from '@/lib/utils'
import * as React from 'react'

type SiteHeaderProps = React.ComponentProps<'header'>

export const SiteHeader = React.forwardRef<HTMLElement, SiteHeaderProps>(
	({ className, ...props }, ref) => {
		return (
			<header
				ref={ref}
				className={cn(
					'flex h-16 shrink-0 items-center gap-2 border-b px-6',
					className
				)}
				{...props}
			>
					{/* User Avatar */}
				<div className="ml-auto flex items-center gap-2">
					<NavUser />
				</div>
			</header>
		)
	}
)
SiteHeader.displayName = 'SiteHeader'
