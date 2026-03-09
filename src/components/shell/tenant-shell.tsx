'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { Menu, X, Bell, ChevronRight, Sparkles, Home, CreditCard, Wrench, Settings, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { TenantNav } from './tenant-nav'
import { generateBreadcrumbs } from '#lib/breadcrumbs'
import { useSupabaseUser } from '#hooks/api/use-auth'
import { useSignOutMutation } from '#hooks/api/use-auth-mutations'
import { UserProfileMenu } from './user-profile-menu'

export interface TenantShellProps {
	children: ReactNode
}

const mobileNavItems = [
	{ title: 'Home', href: '/tenant', icon: Home },
	{ title: 'Payments', href: '/tenant/payments', icon: CreditCard },
	{ title: 'Maintenance', href: '/tenant/maintenance', icon: Wrench },
	{ title: 'Settings', href: '/tenant/settings', icon: Settings }
]

export function TenantShell({ children }: TenantShellProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const sidebarRef = useRef<HTMLElement>(null)
	const pathname = usePathname()
	const router = useRouter()
	const breadcrumbs = generateBreadcrumbs(pathname)
	const { data: user } = useSupabaseUser()
	const signOutMutation = useSignOutMutation()

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

	const closeSidebar = () => {
		setSidebarOpen(false)
		triggerRef.current?.focus()
	}

	// Escape key handler + focus trap for mobile sidebar
	useEffect(() => {
		if (!sidebarOpen) return
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setSidebarOpen(false)
				triggerRef.current?.focus()
				return
			}
			// Focus trap within sidebar dialog
			if (e.key === 'Tab' && sidebarRef.current) {
				const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
					'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
				)
				if (focusable.length === 0) return
				const first = focusable[0]!
				const last = focusable[focusable.length - 1]!
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault()
					last.focus()
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault()
					first.focus()
				}
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [sidebarOpen])

	return (
		<div className="min-h-screen bg-background">
			{/* Skip to content */}
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
			>
				Skip to content
			</a>

			{/* Mobile sidebar overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
					onClick={closeSidebar}
				/>
			)}

			{/* Sidebar */}
			<aside
				ref={sidebarRef}
				role={sidebarOpen ? 'dialog' : undefined}
				aria-modal={sidebarOpen ? true : undefined}
				className={`
					fixed inset-y-0 left-0 z-50 w-56 bg-card
					border-r border-border
					transform transition-transform duration-200 ease-out
					lg:translate-x-0 flex flex-col
					${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
				`}
			>
				{/* Logo */}
				<div className="flex items-center gap-3 px-4 h-14 shrink-0">
					<Link href="/tenant" className="flex items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none hover:opacity-80 transition-opacity">
						<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
							<Sparkles className="w-4 h-4 text-primary-foreground" />
						</div>
						<span className="font-semibold text-foreground text-lg tracking-tight">
							TenantFlow
						</span>
					</Link>
					<button
						className="ml-auto lg:hidden min-h-11 min-w-11 flex items-center justify-center rounded-md hover:bg-muted"
						onClick={closeSidebar}
						aria-label="Close navigation menu"
					>
						<X className="w-4 h-4 text-muted-foreground" />
					</button>
				</div>

				{/* Navigation */}
				<TenantNav onNavigate={closeSidebar} />
			</aside>

			{/* Main content area */}
			<div className="lg:pl-56 flex flex-col min-h-screen pb-16 lg:pb-0">
				{/* Top header */}
				<header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 h-14 bg-card border-b border-border">
					{/* Left side - mobile menu + breadcrumbs */}
					<div className="flex items-center gap-3">
						<button
							ref={triggerRef}
							className="p-2 rounded-md hover:bg-muted lg:hidden"
							onClick={() => setSidebarOpen(true)}
							aria-label="Open navigation menu"
						>
							<Menu className="w-5 h-5 text-muted-foreground" />
						</button>

						{/* Breadcrumbs */}
						{breadcrumbs.length > 0 && (() => {
							const firstCrumb = breadcrumbs[0]!
							const lastCrumb = breadcrumbs[breadcrumbs.length - 1]!
							return (
							<nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
								{/* First crumb always visible */}
								<div className="flex items-center gap-1">
									{firstCrumb.href ? (
										<Link
											href={firstCrumb.href}
											className="text-muted-foreground hover:text-foreground transition-colors"
										>
											{firstCrumb.label}
										</Link>
									) : (
										<span className="text-foreground font-medium">
											{firstCrumb.label}
										</span>
									)}
								</div>

								{/* Middle crumbs: hidden on mobile, visible on sm+ */}
								{breadcrumbs.length > 2 && (
									<>
										<span className="hidden sm:contents">
											{breadcrumbs.slice(1, -1).map((crumb, index) => (
												<div key={index + 1} className="flex items-center gap-1">
													<ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
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
										</span>
										{/* Collapsed indicator: visible on mobile only */}
										<span className="flex items-center gap-1 sm:hidden">
											<ChevronRight className="size-3.5 text-muted-foreground" />
											<span className="text-muted-foreground">...</span>
										</span>
									</>
								)}

								{/* Last crumb (when more than 1) */}
								{breadcrumbs.length > 1 && (
									<div className="flex items-center gap-1">
										<ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
										{lastCrumb.href ? (
											<Link
												href={lastCrumb.href}
												className="text-muted-foreground hover:text-foreground transition-colors"
											>
												{lastCrumb.label}
											</Link>
										) : (
											<span className="text-foreground font-medium truncate max-w-[150px] sm:max-w-none">
												{lastCrumb.label}
											</span>
										)}
									</div>
								)}
							</nav>
						)})()}
					</div>

					{/* Right side - notifications, user */}
					<div className="flex items-center gap-1">
						<Link
							href="/tenant/settings?tab=notifications"
							className="p-2 rounded-md hover:bg-muted transition-colors"
							aria-label="View notifications"
						>
							<Bell className="w-5 h-5 text-muted-foreground" />
						</Link>

						{/* User profile */}
						{user && (
							<UserProfileMenu
								userInitials={userInitials}
								userName={userName}
								userEmail={userEmail}
								profileHref="/tenant/profile"
								settingsHref="/tenant/settings"
								onSignOut={() => signOutMutation.mutate()}
							/>
						)}
					</div>
				</header>

				{/* Page content */}
				<main id="main-content" className="flex-1 bg-muted/30">
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
