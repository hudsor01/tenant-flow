'use client'

import { NavUser } from '#components/dashboard/nav-user'
import { Button } from '#components/ui/button'
import { ModeToggle } from '#components/ui/theme-switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '#components/ui/tooltip'
import { useUnreadNotificationsCount } from '#hooks/api/use-notifications'
import { cn } from '#lib/utils'
import { ArrowLeft, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

type SiteHeaderProps = React.ComponentProps<'header'>

export const SiteHeader = React.forwardRef<HTMLElement, SiteHeaderProps>(
	({ className, ...props }, ref) => {
		const router = useRouter()

		return (
			<header
				ref={ref}
				className={cn(
					'flex h-16 shrink-0 items-center gap-2 border-b px-6',
					className
				)}
				{...props}
			>
				<Button variant="ghost" size="icon" onClick={() => router.back()}>
					<ArrowLeft className="size-5" />
				</Button>
				{/* Theme Toggle & User Avatar */}
				<div className="ml-auto flex items-center gap-2">
					<NotificationsBell onClick={() => router.push('/dashboard/settings?tab=notifications')} />
					<ModeToggle />
					<NavUser />
				</div>
			</header>
		)
	}
)
SiteHeader.displayName = 'SiteHeader'

function NotificationsBell({ onClick }: { onClick?: () => void }) {
	const { data, isLoading } = useUnreadNotificationsCount()
	const unreadCount = data?.total ?? 0
	const hasUnread = unreadCount > 0
	const badgeLabel = unreadCount > 99 ? '99+' : unreadCount.toString()

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative"
					aria-label={hasUnread ? `${unreadCount} unread notifications` : 'Notifications'}
					onClick={onClick}
				>
					<Bell className="size-5" />
					{isLoading ? (
						<span className="absolute -right-1 -top-1 inline-flex size-5 animate-pulse rounded-full bg-muted-foreground/30" />
					) : null}
					{hasUnread ? (
						<span className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold leading-none text-destructive-foreground shadow-sm">
							{badgeLabel}
						</span>
					) : null}
				</Button>
			</TooltipTrigger>
			<TooltipContent sideOffset={8}>
				{hasUnread ? `${unreadCount} unread notifications` : 'Notifications'}
			</TooltipContent>
		</Tooltip>
	)
}
