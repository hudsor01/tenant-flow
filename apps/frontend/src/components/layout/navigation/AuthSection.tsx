'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrentUserAvatar } from '@/components/profile/sections/current-user-avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/app/actions/auth'
import { Bell, Inbox, LayoutDashboard, Settings, LogOut } from 'lucide-react'
import Link from 'next/link'
import type { User } from '@repo/shared'

interface AuthSectionProps {
	user: User | null
	unreadNotifications: number
	context: 'public' | 'authenticated' | 'tenant-portal'
}

export function AuthSection({ user, unreadNotifications, context }: AuthSectionProps) {
	const handleLogout = () => void signOut()

	if (!user) {
		return (
			<div className="flex items-center gap-4">
				<Link href="/auth" className="transition-colors hover:text-primary">
					Sign In
				</Link>
				<Button asChild variant="outline" size="sm" className="rounded-full">
					<Link href="/auth#register">Get Started</Link>
				</Button>
			</div>
		)
	}

	return (
		<div className="flex items-center gap-4">
			{/* Notifications */}
			<Button variant="ghost" size="icon" className="relative" asChild>
				<Link href="/notifications">
					<Bell className="h-5 w-5" />
					{unreadNotifications > 0 && (
						<Badge
							variant="destructive"
							className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0"
						>
							{unreadNotifications > 9 ? '9+' : unreadNotifications}
						</Badge>
					)}
				</Link>
			</Button>

			{/* User Menu */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="rounded-full">
						<CurrentUserAvatar />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					<DropdownMenuLabel>
						<div className="flex flex-col space-y-1">
							<p className="text-sm font-medium leading-none">{user.name}</p>
							<p className="text-xs leading-none text-muted-foreground">
								{user.email}
							</p>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem asChild>
						<Link href="/dashboard" className="cursor-pointer">
							<LayoutDashboard className="mr-2 h-4 w-4" />
							Dashboard
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href="/inbox" className="cursor-pointer">
							<Inbox className="mr-2 h-4 w-4" />
							Inbox
							{unreadNotifications > 0 && (
								<Badge variant="secondary" className="ml-auto">
									{unreadNotifications}
								</Badge>
							)}
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href="/settings" className="cursor-pointer">
							<Settings className="mr-2 h-4 w-4" />
							Settings
						</Link>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
						<LogOut className="mr-2 h-4 w-4" />
						Sign Out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}