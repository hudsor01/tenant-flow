'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	Bell,
	Search,
	User,
	Settings,
	LogOut,
	Command,
	Menu,
	Building
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { useCommandPalette } from '@/hooks/use-command-palette'
<<<<<<< HEAD
// Dashboard sidebar removed - using layout-based sidebar
=======
import { DashboardSidebar } from './dashboard-sidebar'
>>>>>>> origin/main
import { OfflineIndicator } from '@/components/ui/offline-indicator'
import Link from 'next/link'
import { logoutAction } from '@/lib/actions/auth-actions'
import { useTransition } from 'react'
import { toast } from 'sonner'

interface NavigationProps {
	className?: string
}

export function Navigation({ className }: NavigationProps) {
	const { user } = useAuth()
	const { open: openCommandPalette } = useCommandPalette()
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
	const [isLoggingOut, startTransition] = useTransition()

	const handleLogout = () => {
		startTransition(async () => {
			try {
				await logoutAction()
				// Server action will handle redirect
<<<<<<< HEAD
			} catch {
=======
			} catch (error) {
>>>>>>> origin/main
				toast.error('Failed to sign out')
			}
		})
	}

	const handleSearchClick = () => {
		openCommandPalette()
	}

	return (
		<>
			<header
				className={`bg-card flex items-center justify-between border-b p-3 sm:p-4 ${className || ''}`}
			>
				{/* Mobile Menu Button & Logo */}
				<div className="flex items-center gap-3 md:hidden">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setIsMobileSidebarOpen(true)}
						className="h-8 w-8 p-0"
						aria-label="Open navigation menu"
					>
						<Menu className="h-5 w-5" />
					</Button>
					<Link
						href="/dashboard"
						className="flex items-center gap-2 transition-all hover:scale-105"
					>
						<Building className="text-primary h-6 w-6" />
						<span className="text-lg font-bold">TenantFlow</span>
					</Link>
				</div>

				{/* Desktop Search - Command Palette Trigger */}
				<div className="hidden max-w-md flex-1 items-center gap-4 md:flex">
					<div className="relative flex-1">
<<<<<<< HEAD
						<Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
=======
						<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
>>>>>>> origin/main
						<Input
							placeholder="Search properties, tenants... (⌘K)"
							className="cursor-pointer pl-10"
							readOnly
							onClick={handleSearchClick}
							onFocus={handleSearchClick}
						/>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleSearchClick}
						className="hidden items-center gap-2 lg:flex"
					>
						<Command className="h-4 w-4" />
						<span className="text-muted-foreground text-xs">
							⌘K
						</span>
					</Button>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-2 sm:gap-4">
					{/* Mobile Search Button */}
					<Button
						variant="ghost"
						size="sm"
						onClick={handleSearchClick}
						className="h-8 w-8 p-0 md:hidden"
						aria-label="Search"
					>
						<Search className="h-4 w-4" />
					</Button>

					{/* Offline Indicator */}
					<OfflineIndicator />

					{/* Notifications */}
					<Button
						variant="ghost"
						size="sm"
						className="h-8 w-8 p-0"
						aria-label="Notifications"
					>
						<Bell className="h-4 w-4 sm:h-5 sm:w-5" />
					</Button>

					{/* User Menu */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								className="relative h-8 w-8 rounded-full"
								aria-label="User menu"
							>
								<Avatar className="h-8 w-8">
									<AvatarImage
										src={user?.avatarUrl || undefined}
										alt={user?.name || user?.email}
									/>
									<AvatarFallback>
										{user?.name
											? user.name.charAt(0).toUpperCase()
											: user?.email
													?.charAt(0)
													.toUpperCase() || 'U'}
									</AvatarFallback>
								</Avatar>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-56"
							align="end"
							forceMount
						>
							<DropdownMenuLabel className="font-normal">
								<div className="flex flex-col space-y-1">
<<<<<<< HEAD
									<p className="text-sm font-medium leading-none">
=======
									<p className="text-sm leading-none font-medium">
>>>>>>> origin/main
										{user?.name || 'User'}
									</p>
									<p className="text-muted-foreground text-xs leading-none">
										{user?.email}
									</p>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link
									href="/profile"
									className="cursor-pointer"
								>
									<User className="mr-2 h-4 w-4" />
									<span>Profile</span>
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link
									href="/settings"
									className="cursor-pointer"
								>
									<Settings className="mr-2 h-4 w-4" />
									<span>Settings</span>
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="cursor-pointer"
								onClick={handleLogout}
								disabled={isLoggingOut}
							>
								<LogOut className="mr-2 h-4 w-4" />
								<span>
									{isLoggingOut
										? 'Signing out...'
										: 'Sign out'}
								</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

<<<<<<< HEAD
			{/* Mobile Sidebar - replaced with simpler navigation */}
			{isMobileSidebarOpen && (
				<div className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden">
					<div className="h-full w-64 bg-white p-4">
						<button
							onClick={() => setIsMobileSidebarOpen(false)}
							className="mb-4"
						>
							Close
						</button>
						<p className="text-gray-500">Navigation menu</p>
					</div>
				</div>
			)}
=======
			{/* Mobile Sidebar */}
			<DashboardSidebar
				isOpen={isMobileSidebarOpen}
				onClose={() => setIsMobileSidebarOpen(false)}
				isMobile={true}
			/>
>>>>>>> origin/main
		</>
	)
}
