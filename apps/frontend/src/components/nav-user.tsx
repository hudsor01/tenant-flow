'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Bell, CreditCard, LogOut, MoreVertical, User } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '@/components/ui/sidebar'

interface NavUserProps extends React.ComponentProps<'div'> {
	user: {
		name: string
		email: string
		avatar: string
	}
}

export const NavUser = React.forwardRef<HTMLDivElement, NavUserProps>(
	({ user, className, ...props }, ref) => {
		const { isMobile } = useSidebar()

		return (
			<div ref={ref} className={cn('', className)} {...props}>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size="lg"
									className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-colors"
								>
									<Avatar className="h-8 w-8 rounded-lg grayscale hover:grayscale-0 transition-fast">
										<AvatarImage src={user.avatar} alt={user.name} />
										<AvatarFallback className="rounded-lg">CN</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">{user.name}</span>
										<span className="text-muted-foreground truncate text-xs">
											{user.email}
										</span>
									</div>
									<MoreVertical className="ml-auto size-4" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border-border/50 shadow-lg"
								side={isMobile ? 'bottom' : 'right'}
								align="end"
								sideOffset={4}
							>
								<DropdownMenuLabel className="p-0 font-normal">
									<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
										<Avatar className="h-8 w-8 rounded-lg">
											<AvatarImage src={user.avatar} alt={user.name} />
											<AvatarFallback className="rounded-lg">CN</AvatarFallback>
										</Avatar>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-medium">{user.name}</span>
											<span className="text-muted-foreground truncate text-xs">
												{user.email}
											</span>
										</div>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem className="gap-2 hover:bg-accent/50 transition-colors">
										<User className="size-4" />
										Account
									</DropdownMenuItem>
									<DropdownMenuItem className="gap-2 hover:bg-accent/50 transition-colors">
										<CreditCard className="size-4" />
										Billing
									</DropdownMenuItem>
									<DropdownMenuItem className="gap-2 hover:bg-accent/50 transition-colors">
										<Bell className="size-4" />
										Notifications
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem className="gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors">
									<LogOut className="size-4" />
									Log out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</div>
		)
	}
)
NavUser.displayName = 'NavUser'
