'use client'

import { useState } from 'react'
import { Menu, X, Bell, MoreVertical, ChevronRight } from 'lucide-react'
import { MainNav } from './MainNav'
import { QuickActionsDock } from './QuickActionsDock'

export interface NavigationItem {
	label: string
	href: string
	icon?: React.ReactNode
	isActive?: boolean
	children?: NavigationItem[]
	group?: 'core' | 'analytics' | 'documents'
}

export interface DocumentItem {
	label: string
	href: string
	icon?: React.ReactNode
}

export interface AppShellProps {
	children: React.ReactNode
	navigationItems: NavigationItem[]
	documentItems?: DocumentItem[]
	user?: {
		name: string
		email?: string
		avatarUrl?: string
	}
	logo?: React.ReactNode
	productName?: string
	productIcon?: React.ReactNode
	onNavigate?: (href: string) => void
	onLogout?: () => void
	onSearch?: () => void
	onNotifications?: () => void
	onHelp?: () => void
	onQuickAction?: (actionId: string) => void
	breadcrumbs?: { label: string; href?: string }[]
	showQuickActionsDock?: boolean
}

export function AppShell({
	children,
	navigationItems,
	documentItems = [],
	user,
	logo,
	productName = 'TenantFlow',
	productIcon,
	onNavigate,
	onLogout,
	onSearch,
	onNotifications,
	onHelp,
	onQuickAction,
	breadcrumbs = [],
	showQuickActionsDock = true
}: AppShellProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false)

	// Get user initials
	const userInitials = user?.name
		? user.name
				.split(' ')
				.map(n => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2)
		: 'U'

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
					{logo || productIcon || (
						<div className="w-7 h-7 text-primary">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 2L2 7v10c0 5.55 3.84 10.74 10 12 6.16-1.26 10-6.45 10-12V7l-10-5zm-1 6h2v2h-2V8zm0 4h2v6h-2v-6z" />
							</svg>
						</div>
					)}
					<span className="font-semibold text-foreground text-lg tracking-tight">
						{productName}
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
						onClick={onSearch}
						className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-sm rounded-md border border-border transition-colors"
					>
						<svg
							className="w-4 h-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="M21 21l-4.35-4.35" />
						</svg>
						<span className="flex-1 text-left">Search...</span>
						<kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-background border border-border rounded">
							<span className="text-xs">⌘</span>K
						</kbd>
					</button>
				</div>

				{/* Navigation */}
				<MainNav
					items={navigationItems}
					documentItems={documentItems}
					onNavigate={href => {
						onNavigate?.(href)
						setSidebarOpen(false)
					}}
					onHelp={onHelp}
				/>
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
											<button
												onClick={() => onNavigate?.(crumb.href!)}
												className="text-muted-foreground hover:text-foreground transition-colors"
											>
												{crumb.label}
											</button>
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
						<button
							onClick={onNotifications}
							className="p-2 rounded-md hover:bg-muted transition-colors"
						>
							<Bell className="w-5 h-5 text-muted-foreground" />
						</button>

						{/* User profile */}
						{user && (
							<div className="flex items-center gap-2 ml-2 pl-3 border-l border-border">
								{user.avatarUrl ? (
									<img
										src={user.avatarUrl}
										alt={user.name}
										className="w-8 h-8 rounded-full object-cover"
									/>
								) : (
									<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
										<span className="text-xs font-medium text-muted-foreground">
											{userInitials}
										</span>
									</div>
								)}
								<div className="hidden sm:block">
									<p className="text-sm font-medium text-foreground">
										{user.name}
									</p>
									{user.email && (
										<p className="text-xs text-muted-foreground">
											{user.email}
										</p>
									)}
								</div>
								<button
									onClick={onLogout}
									className="p-1 hover:bg-muted rounded transition-colors"
								>
									<MoreVertical className="w-4 h-4 text-muted-foreground" />
								</button>
							</div>
						)}
					</div>
				</header>

				{/* Page content */}
				<main className="flex-1 bg-background pb-24">{children}</main>
			</div>

			{/* Quick Actions Dock */}
			{showQuickActionsDock && <QuickActionsDock onAction={onQuickAction} />}
		</div>
	)
}
