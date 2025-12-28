'use client'

import { useState } from 'react'
import { Menu, X, Bell, MoreVertical, ChevronRight, Sparkles, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MainNav } from './MainNav'
import { QuickActionsDock } from './QuickActionsDock'
import { generateBreadcrumbs } from '#lib/breadcrumbs'
import { useSupabaseUser, useSignOut } from '#hooks/api/use-auth'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'

export interface AppShellProps {
	children: React.ReactNode
	showQuickActionsDock?: boolean
}

export function AppShell({ children, showQuickActionsDock = true }: AppShellProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const pathname = usePathname()
	const breadcrumbs = generateBreadcrumbs(pathname)
	const { data: user } = useSupabaseUser()
	const signOutMutation = useSignOut()

	// Get user initials
	const userName = user?.user_metadata?.full_name || user?.email || 'User'
	const userEmail = user?.email || ''
	const userInitials = userName
		.split(' ')
		.map((n: string) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

	return (
		<div className="min-h-screen bg-background">
			{/* Mobile sidebar overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* Sidebar */}
			<aside
				className={`
					fixed inset-y-0 left-0 z-50 w-56 bg-card
					border-r border-border
					transform transition-transform duration-200 ease-out
					lg:translate-x-0 flex flex-col
					${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
				`}
			>
				{/* Logo */}
				<div className="flex items-center gap-2.5 px-4 py-4">
					<Sparkles className="w-7 h-7 text-primary" />
					<span className="font-semibold text-foreground text-lg tracking-tight">
						TenantFlow
					</span>
					{/* Mobile close button */}
					<button
						className="ml-auto lg:hidden p-1 rounded-md hover:bg-muted"
						onClick={() => setSidebarOpen(false)}
					>
						<X className="w-5 h-5 text-muted-foreground" />
					</button>
				</div>

				{/* Command Palette Trigger */}
				<div className="px-3 pb-4">
					<button
						onClick={() => {
							// TODO: Implement command palette
						}}
						className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-sm rounded-md border border-border transition-colors"
					>
						<Search className="w-4 h-4" />
						<span className="flex-1 text-left">Search...</span>
						<kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-background border border-border rounded">
							<span className="text-xs">&#8984;</span>K
						</kbd>
					</button>
				</div>

				{/* Navigation */}
				<MainNav onNavigate={() => setSidebarOpen(false)} />
			</aside>

			{/* Main content area */}
			<div className="lg:pl-56 flex flex-col min-h-screen">
				{/* Top header */}
				<header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 py-3 bg-card border-b border-border">
					{/* Left side - mobile menu + breadcrumbs */}
					<div className="flex items-center gap-3">
						<button
							className="p-2 rounded-md hover:bg-muted lg:hidden"
							onClick={() => setSidebarOpen(true)}
						>
							<Menu className="w-5 h-5 text-muted-foreground" />
						</button>

						{/* Breadcrumbs */}
						{breadcrumbs.length > 0 && (
							<nav className="hidden sm:flex items-center gap-1 text-sm">
								{breadcrumbs.map((crumb, index) => (
									<div key={index} className="flex items-center gap-1">
										{index > 0 && (
											<ChevronRight className="w-4 h-4 text-muted-foreground" />
										)}
										{crumb.href ? (
											<Link
												href={crumb.href}
												className="text-muted-foreground hover:text-foreground transition-colors"
											>
												{crumb.label}
											</Link>
										) : (
											<span className="text-foreground font-medium">
												{crumb.label}
											</span>
										)}
									</div>
								))}
							</nav>
						)}
					</div>

					{/* Right side - notifications, user */}
					<div className="flex items-center gap-1">
						<Link
							href="/dashboard/settings?tab=notifications"
							className="p-2 rounded-md hover:bg-muted transition-colors"
						>
							<Bell className="w-5 h-5 text-muted-foreground" />
						</Link>

						{/* User profile */}
						{user && (
							<div className="flex items-center gap-2 ml-2 pl-3 border-l border-border">
								<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
									<span className="text-xs font-medium text-muted-foreground">
										{userInitials}
									</span>
								</div>
								<div className="hidden sm:block">
									<p className="text-sm font-medium text-foreground">
										{userName}
									</p>
									{userEmail && (
										<p className="text-xs text-muted-foreground truncate max-w-32">
											{userEmail}
										</p>
									)}
								</div>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<button className="p-1 hover:bg-muted rounded transition-colors">
											<MoreVertical className="w-4 h-4 text-muted-foreground" />
										</button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-48">
										<DropdownMenuItem asChild>
											<Link href="/dashboard/settings">Settings</Link>
										</DropdownMenuItem>
										<DropdownMenuItem asChild>
											<Link href="/dashboard/settings?tab=profile">Profile</Link>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem onClick={() => signOutMutation.mutate()}>
											Sign out
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						)}
					</div>
				</header>

				{/* Page content */}
				<main className="flex-1 bg-muted/30 pb-24">
					<div className="p-4 lg:p-6">{children}</div>
				</main>
			</div>

			{/* Quick Actions Dock */}
			{showQuickActionsDock && <QuickActionsDock />}
		</div>
	)
}
