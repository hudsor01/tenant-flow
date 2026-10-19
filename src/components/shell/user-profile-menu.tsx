"use client";

import Link from "next/link";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";

interface UserProfileMenuProps {
	userInitials: string;
	userName: string;
	userEmail: string;
	profileHref: string;
	settingsHref: string;
	onSignOut: () => void;
}

export function UserProfileMenu({
	userInitials,
	userName,
	userEmail,
	profileHref,
	settingsHref,
	onSignOut,
}: UserProfileMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				{/* WCAG 2.5.3 Label in Name (axe `label-content-name-mismatch`,
				    default-on since axe-core 4.14): the visible initials must be
				    part of the accessible name. The old aria-label="User menu"
				    omitted them, so a voice-control user saying "JS" could not
				    open this. The label now STARTS with the visible text and
				    appends the purpose -- an explicit label is used rather than
				    sr-only text because the accessible-name algorithm trims a
				    text node's leading whitespace, which produced "JSuser menu". */}
				<button
					className="relative flex items-center justify-center min-h-11 min-w-11 rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
					aria-label={`${userInitials} user menu`}
				>
					<span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary-text text-sm font-medium hover:bg-primary/20 transition-colors">
						{userInitials}
					</span>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="font-normal">
					<span className="block text-sm font-medium">{userName}</span>
					<span className="block text-xs text-muted-foreground truncate">
						{userEmail}
					</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href={profileHref}>Profile</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href={settingsHref}>Settings</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={onSignOut}>Sign out</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
