'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import {
	Menu,
	X,
	Bell,
	ChevronRight,
	Sparkles,
	Search,
	Home,
	Building2,
	Users,
	ClipboardList,
	Wrench,
	BarChart3,
	FileText,
	Receipt,
	FilePlus,
	FileCheck,
	Settings,
	HelpCircle,
	BookOpen,
	MessageSquare,
	LogOut
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { MainNav } from './main-nav'
import { QuickActionsDock } from './quick-actions-dock'
import { GlobalSyncIndicator } from '#components/ui/global-sync-indicator'
import { generateBreadcrumbs } from '#lib/breadcrumbs'
import { useSupabaseUser, useSignOutMutation } from '#hooks/api/use-auth'
import { usePropertyList } from '#hooks/api/use-properties'
import { useTenantList } from '#hooks/api/use-tenant'
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut
} from '#components/ui/command'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'

export interface AppShellProps {
	children: ReactNode
	showQuickActionsDock?: boolean
}

export function AppShell({ children, showQuickActionsDock = true }: AppShellProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [commandOpen, setCommandOpen] = useState(false)
	const pathname = usePathname()
	const breadcrumbs = generateBreadcrumbs(pathname)
	const { data: user } = useSupabaseUser()
	const signOutMutation = useSignOutMutation()
	const router = useRouter()
	const { data: properties } = usePropertyList({ limit: 6 })
	const { data: tenantsResponse } = useTenantList(1, 6)

	// Get user initials
	const userName = user?.user_metadata?.full_name || user?.email || 'User'
	const userEmail = user?.email || ''
	const userInitials = userName
		.split(' ')
		.map((n: string) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

	const tenantItems = useMemo(() => {
		const tenants = tenantsResponse?.data ?? []
		return tenants.map(tenant => {
			const fullName =
				tenant.name ||
				(tenant.first_name && tenant.last_name
					? `${tenant.first_name} ${tenant.last_name}`.trim()
					: tenant.first_name || tenant.last_name || 'Unknown')
			return {
				id: tenant.id,
				label: fullName,
				subtitle: tenant.email ?? '',
				href: `/tenants/${tenant.id}`
			}
		})
	}, [tenantsResponse?.data])

	const propertyItems = useMemo(() => {
		return (properties ?? []).map(property => ({
			id: property.id,
			label: property.name,
			subtitle: [property.city, property.state].filter(Boolean).join(', '),
			href: `/properties/${property.id}`
		}))
	}, [properties])

	const commandGroups = useMemo(
		() => [
			{
				heading: 'Navigation',
				items: [
					{ label: 'Dashboard', href: '/dashboard', icon: Home },
					{ label: 'Properties', href: '/properties', icon: Building2 },
					{ label: 'Tenants', href: '/tenants', icon: Users },
					{ label: 'Leases', href: '/leases', icon: ClipboardList },
					{ label: 'Maintenance', href: '/maintenance', icon: Wrench }
				]
			},
			{
				heading: 'Analytics & Reports',
				items: [
					{ label: 'Analytics Overview', href: '/analytics/overview', icon: BarChart3 },
					{ label: 'Financial Analytics', href: '/analytics/financial', icon: BarChart3 },
					{ label: 'Property Performance', href: '/analytics/property-performance', icon: BarChart3 },
					{ label: 'Leases Analytics', href: '/analytics/leases', icon: BarChart3 },
					{ label: 'Maintenance Analytics', href: '/analytics/maintenance', icon: BarChart3 },
					{ label: 'Occupancy Analytics', href: '/analytics/occupancy', icon: BarChart3 },
					{ label: 'Reports', href: '/reports', icon: FileText },
					{ label: 'Generate Report', href: '/reports/generate', icon: FileText }
				]
			},
			{
				heading: 'Financials',
				items: [
					{ label: 'Financials', href: '/financials', icon: Receipt },
					{ label: 'Rent Collection', href: '/rent-collection', icon: Receipt },
					{ label: 'Income Statement', href: '/financials/income-statement', icon: Receipt },
					{ label: 'Cash Flow', href: '/financials/cash-flow', icon: Receipt },
					{ label: 'Balance Sheet', href: '/financials/balance-sheet', icon: Receipt },
					{ label: 'Tax Documents', href: '/financials/tax-documents', icon: Receipt }
				]
			},
			{
				heading: 'Documents',
				items: [
					{ label: 'Generate Lease', href: '/leases/new', icon: FilePlus },
					{ label: 'Lease Template', href: '/documents/lease-template', icon: FileCheck }
				]
			}
		],
		[]
	)

	const commandActions = useMemo(
		() => [
			{ label: 'Notifications', href: '/settings?tab=notifications', icon: Bell },
			{ label: 'Settings', href: '/settings', icon: Settings },
			{ label: 'Profile', href: '/profile', icon: Settings },
			{ label: 'Help & Support', href: '/help', icon: HelpCircle },
			{ label: 'Documentation', href: '/docs', icon: BookOpen },
			{ label: 'Send Feedback', href: '/feedback', icon: MessageSquare }
		],
		[]
	)

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
				event.preventDefault()
				setCommandOpen(prev => !prev)
			}
		}

		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	const handleCommandSelect = (href: string) => {
		setCommandOpen(false)
		router.push(href)
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
				data-tour="sidebar-nav"
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
					<Link href="/dashboard" className="flex items-center gap-3">
						<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
							<Sparkles className="w-4 h-4 text-primary-foreground" />
						</div>
						<span className="font-semibold text-foreground tracking-tight">
							TenantFlow
						</span>
					</Link>
					<button
						className="ml-auto lg:hidden p-1.5 rounded-md hover:bg-muted"
						onClick={() => setSidebarOpen(false)}
						aria-label="Close sidebar"
					>
						<X className="w-4 h-4 text-muted-foreground" />
					</button>
				</div>

				{/* Command Palette Trigger */}
				<div className="px-3 py-3">
					<button
						onClick={() => setCommandOpen(true)}
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
				<header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 h-14 bg-card border-b border-border">
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

					{/* Right side - sync status, notifications, user */}
					<div className="flex items-center gap-2">
						<GlobalSyncIndicator />
						<Link
							href="/settings?tab=notifications"
							className="p-2 rounded-md hover:bg-muted transition-colors"
						>
							<Bell className="w-5 h-5 text-muted-foreground" />
						</Link>

						{/* User profile */}
						{user && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
										aria-label="User menu"
									>
										{userInitials}
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									<DropdownMenuLabel className="font-normal">
										<p className="text-sm font-medium">{userName}</p>
										<p className="text-xs text-muted-foreground truncate">{userEmail}</p>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem asChild>
										<Link href="/profile">Profile</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link href="/settings">Settings</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => signOutMutation.mutate()}>
										Sign out
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
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

			<CommandDialog
				open={commandOpen}
				onOpenChange={setCommandOpen}
				className="max-w-xl"
			>
				<CommandInput placeholder="Search pages and actions..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					{propertyItems.length > 0 && (
						<CommandGroup heading="Recent Properties">
							{propertyItems.map(item => (
								<CommandItem
									key={item.id}
									value={`${item.label} ${item.subtitle}`}
									onSelect={() => handleCommandSelect(item.href)}
								>
									<Building2 className="w-4 h-4 text-muted-foreground" />
									<span className="flex-1">{item.label}</span>
									{item.subtitle && (
										<span className="text-xs text-muted-foreground">
											{item.subtitle}
										</span>
									)}
								</CommandItem>
							))}
						</CommandGroup>
					)}
					{tenantItems.length > 0 && (
						<CommandGroup heading="Recent Tenants">
							{tenantItems.map(item => (
								<CommandItem
									key={item.id}
									value={`${item.label} ${item.subtitle}`}
									onSelect={() => handleCommandSelect(item.href)}
								>
									<Users className="w-4 h-4 text-muted-foreground" />
									<span className="flex-1">{item.label}</span>
									{item.subtitle && (
										<span className="text-xs text-muted-foreground">
											{item.subtitle}
										</span>
									)}
								</CommandItem>
							))}
						</CommandGroup>
					)}
					{commandGroups.map(group => (
						<CommandGroup key={group.heading} heading={group.heading}>
							{group.items.map(item => (
								<CommandItem
									key={item.href}
									onSelect={() => handleCommandSelect(item.href)}
								>
									<item.icon className="w-4 h-4 text-muted-foreground" />
									<span>{item.label}</span>
								</CommandItem>
							))}
						</CommandGroup>
					))}
					<CommandSeparator />
					<CommandGroup heading="Account & Support">
						{commandActions.map(action => (
							<CommandItem
								key={action.href}
								onSelect={() => handleCommandSelect(action.href)}
							>
								<action.icon className="w-4 h-4 text-muted-foreground" />
								<span>{action.label}</span>
							</CommandItem>
						))}
						{user && (
							<CommandItem
								onSelect={() => {
									setCommandOpen(false)
									signOutMutation.mutate()
								}}
							>
								<LogOut className="w-4 h-4 text-muted-foreground" />
								<span>Sign out</span>
								<CommandShortcut>↵</CommandShortcut>
							</CommandItem>
						)}
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</div>
	)
}
