'use client'

import { useState } from 'react'
import { Menu, X, Bell, MoreVertical, ChevronRight, Sparkles, Home, CreditCard, Wrench, Settings, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { TenantNav } from './TenantNav'
import { generateBreadcrumbs } from '#lib/breadcrumbs'
import { useSupabaseUser, useSignOut } from '#hooks/api/use-auth'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'

export interface TenantShellProps {
	children: React.ReactNode
}

// Mobile bottom navigation items
const mobileNavItems = [
	{ title: 'Home', href: '/tenant', icon: Home },
	{ title: 'Payments', href: '/tenant/payments', icon: CreditCard },
	{ title: 'Maintenance', href: '/tenant/maintenance', icon: Wrench },
	{ title: 'Settings', href: '/tenant/settings', icon: Settings }
]

export function TenantShell({ children }: TenantShellProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const pathname = usePathname()
	const router = useRouter()
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

	// Check if we're on a sub-page (for back button on mobile)
	const isSubPage = pathname !== '/tenant' && pathname.split('/').length > 2

	// Mobile nav active state
	const isMobileNavActive = (href: string) => {
		if (href === '/tenant') return pathname === '/tenant'
		return pathname.startsWith(href)
	}

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
					<button
						className="ml-auto lg:hidden p-1 rounded-md hover:bg-muted"
						onClick={() => setSidebarOpen(false)}
					>
						<X className="w-5 h-5 text-muted-foreground" />
					</button>
				</div>

				{/* Navigation */}
				<TenantNav onNavigate={() => setSidebarOpen(false)} />
			</aside>

			{/* Main content area */}
			<div className="lg:pl-56 flex flex-col min-h-screen pb-16 lg:pb-0">
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
							href="/tenant/settings?tab=notifications"
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
											<Link href="/tenant/settings">Settings</Link>
										</DropdownMenuItem>
										<DropdownMenuItem asChild>
											<Link href="/tenant/profile">Profile</Link>
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
				<main className="flex-1 bg-muted/30">
					<div className="p-4 lg:p-6">{children}</div>
				</main>
			</div>

			{/* Mobile bottom navigation */}
			<nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background lg:hidden safe-area-inset-bottom">
				<div className="flex items-center justify-around px-2 py-1">
					{/* Back button for sub-pages */}
					{isSubPage && (
						<button
							onClick={() => router.back()}
							className="flex min-h-11 min-w-11 flex-col items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
						>
							<ChevronLeft className="size-5" />
							<span className="mt-0.5 text-xs">Back</span>
						</button>
					)}

					{/* Navigation items */}
					{mobileNavItems.map(item => {
						const isActive = isMobileNavActive(item.href)
						const Icon = item.icon
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`flex min-h-11 min-w-11 flex-col items-center justify-center rounded-lg p-2 transition-colors ${
									isActive
										? 'text-primary'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<Icon className="size-5" />
								<span className="mt-0.5 text-xs font-medium">{item.title}</span>
							</Link>
						)
					})}
				</div>
			</nav>
		</div>
	)
}
