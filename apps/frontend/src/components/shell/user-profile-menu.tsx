'use client'

import Link from 'next/link'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'

interface UserProfileMenuProps {
	userInitials: string
	userName: string
	userEmail: string
	profileHref: string
	settingsHref: string
	onSignOut: () => void
}

export function UserProfileMenu({
	userInitials,
	userName,
	userEmail,
	profileHref,
	settingsHref,
	onSignOut
}: UserProfileMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					className="relative flex items-center justify-center -m-1.5 p-1.5 rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
					aria-label="User menu"
				>
					<span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
						{userInitials}
					</span>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="font-normal">
					<p className="text-sm font-medium">{userName}</p>
					<p className="text-xs text-muted-foreground truncate">{userEmail}</p>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href={profileHref}>Profile</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href={settingsHref}>Settings</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={onSignOut}>
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
