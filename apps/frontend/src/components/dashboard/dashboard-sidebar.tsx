'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
	motion,
	AnimatePresence,
	useDragControls,
	type PanInfo
} from '@/lib/lazy-motion'
import { logger } from '@/lib/logger'
import {
	SidebarProvider,
	Sidebar,
	SidebarHeader,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarTrigger
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { useDashboardOverview } from '@/hooks/api/use-dashboard'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@repo/shared'

const getNavigationItems = (stats?: DashboardStats) => [
	{
		id: 'dashboard',
		name: 'Dashboard',
		href: '/dashboard',
		icon: 'i-lucide-home',
		badge: null
	},
	{
		id: 'properties',
		name: 'Properties',
		href: '/properties',
		icon: 'i-lucide-building',
		badge: stats?.properties?.total ?? null,
		badgeColor: 'bg-blue-100 text-blue-700'
	},
	{
		id: 'tenants',
		name: 'Tenants',
		href: '/tenants',
		icon: 'i-lucide-users',
		badge: stats?.tenants?.total ?? null,
		badgeColor: 'bg-green-100 text-green-700'
	},
	{
		id: 'leases',
		name: 'Leases',
		href: '/leases',
		icon: 'i-lucide-file-text',
		badge: stats?.units?.total ?? null,
		badgeColor: 'bg-purple-100 text-purple-700'
	},
	{
		id: 'maintenance',
		name: 'Maintenance',
		href: '/maintenance',
		icon: 'i-lucide-wrench',
		badge: stats?.maintenance?.total ?? null,
		badgeColor:
			(stats?.maintenance?.total ?? 0) > 0
				? 'bg-red-100 text-red-700'
				: 'bg-gray-100 text-gray-700'
	},
	{
		id: 'reports',
		name: 'Reports',
		href: '/reports',
		icon: 'i-lucide-bar-chart-3',
		badge: null
	},
	{
		id: 'settings',
		name: 'Settings',
		href: '/settings',
		icon: 'i-lucide-settings',
		badge: null
	}
]

interface DashboardSidebarProps {
	className?: string
	isOpen?: boolean
	onClose?: () => void
	isMobile?: boolean
}

export function DashboardSidebar({
	className,
	isOpen = true,
	onClose,
	isMobile = false
}: DashboardSidebarProps) {
	const pathname = usePathname()
	const { data: stats } = useDashboardOverview()
	const navigation = getNavigationItems(stats)
	const dragControls = useDragControls()
	const sidebarRef = useRef<HTMLDivElement>(null)

	// Handle escape key to close sidebar
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && isMobile && isOpen && onClose) {
				onClose()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isMobile, isOpen, onClose])

	// Handle click outside to close sidebar on mobile
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				isMobile &&
				isOpen &&
				onClose &&
				sidebarRef.current &&
				!sidebarRef.current.contains(event.target as Node)
			) {
				onClose()
			}
		}

		if (isMobile && isOpen) {
			document.addEventListener('mousedown', handleClickOutside)
			return () =>
				document.removeEventListener('mousedown', handleClickOutside)
		}

		return undefined
	}, [isMobile, isOpen, onClose])

	// Handle swipe to close
	const handleDragEnd = (
		_event: MouseEvent | TouchEvent | PointerEvent,
		info: PanInfo
	) => {
		if (isMobile && onClose && info.velocity.x < -500) {
			onClose()
		}
	}

	// Close sidebar when navigating on mobile
	const handleNavigation = () => {
		if (isMobile && onClose) {
			onClose()
		}
	}

	// Desktop sidebar (always visible on md+)
	if (!isMobile) {
		return (
			<SidebarProvider defaultOpen={true}>
				<Sidebar collapsible="icon" className={className}>
					<SidebarHeader>
						<Link
							href="/dashboard"
							className="flex items-center gap-2 px-2 transition-all hover:scale-105"
						>
							<div className="relative">
								<i className="i-lucide-building inline-block text-primary h-8 w-8"  />
								{/* Activity pulse indicator */}
								<div className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full bg-green-500 group-data-[collapsible=icon]:hidden" />
							</div>
							<span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-xl font-bold text-transparent group-data-[collapsible=icon]:hidden">
								TenantFlow
							</span>
						</Link>
					</SidebarHeader>

					<SidebarContent>
						<SidebarGroup>
							<SidebarGroupContent>
								<SidebarMenu>
									{navigation.map(item => {
										const isActive =
											pathname === item.href ||
											pathname.startsWith(item.href + '/')

										return (
											<SidebarMenuItem key={item.id}>
												<SidebarMenuButton
													asChild
													isActive={isActive}
													tooltip={item.name}
													className="group relative transition-all hover:scale-[1.02]"
												>
													<Link
														href={item.href}
														className="flex w-full items-center justify-between"
													>
														<div className="flex items-center gap-2">
															<i className={`${item.icon} inline-block h-4 w-4`} />
															<span>
																{item.name}
															</span>
														</div>
														{/* Badge for counts */}
														{item.badge !== null &&
															item.badge > 0 && (
																<Badge
																	variant="secondary"
																	className={`rounded-full px-2 py-0.5 text-xs group-data-[collapsible=icon]:hidden ${item.badgeColor || 'bg-gray-100 text-gray-700'}`}
																>
																	{item.badge}
																</Badge>
															)}
														{/* Active indicator */}
														{isActive && (
															<div className="bg-primary absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full" />
														)}
													</Link>
												</SidebarMenuButton>
											</SidebarMenuItem>
										)
									})}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</SidebarContent>

					<SidebarFooter>
						<SidebarMenu>
							{/* Notifications */}
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									tooltip="Notifications"
								>
									<Link
										href="/notifications"
										className="relative"
									>
										<i className="i-lucide-bell inline-block h-4 w-4"  />
										<span>Notifications</span>
										{/* Notification badge */}
										{(stats?.maintenance?.total ||
											0) > 0 && (
											<div className="absolute -top-1 -right-1 hidden h-2 w-2 rounded-full bg-red-500 group-data-[collapsible=icon]:block" />
										)}
										{(stats?.maintenance?.total ||
											0) > 0 && (
											<Badge
												variant="destructive"
												className="ml-auto rounded-full px-1.5 py-0.5 text-xs group-data-[collapsible=icon]:hidden"
											>
												{stats?.maintenance?.total ?? 0}
											</Badge>
										)}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>

							{/* Activity */}
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Activity">
									<Link href="/activity">
										<i className="i-lucide-activity inline-block h-4 w-4"  />
										<span>Activity</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>

							{/* Profile */}
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Profile">
									<Link
										href="/profile"
										className="transition-all hover:scale-[1.02]"
									>
										<i className="i-lucide-user inline-block h-4 w-4"  />
										<span>Profile</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>

							{/* Logout */}
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Logout">
									<button
										onClick={() =>
											logger.info('Logout', {
												component: 'dashboardsidebar'
											})
										}
										className="w-full transition-all hover:scale-[1.02] hover:text-red-600"
									>
										<i className="i-lucide-log-out inline-block h-4 w-4"  />
										<span>Logout</span>
									</button>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarFooter>
				</Sidebar>

				{/* Trigger button for mobile/collapsed state */}
				<div className="absolute top-4 right-4 z-50 lg:hidden">
					<SidebarTrigger />
				</div>
			</SidebarProvider>
		)
	}

	// Mobile sidebar overlay
	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						onClick={onClose}
					/>

					{/* Mobile Sidebar */}
					<motion.div
						ref={sidebarRef}
						className={cn(
							'fixed top-0 left-0 z-50 h-full w-80 max-w-[85vw] bg-white shadow-xl md:hidden',
							'border-r border-gray-200',
							className
						)}
						initial={{ x: '-100%' }}
						animate={{ x: 0 }}
						exit={{ x: '-100%' }}
						transition={{
							type: 'spring',
							stiffness: 300,
							damping: 30
						}}
						drag="x"
						dragConstraints={{ left: -320, right: 0 }}
						dragElastic={0.1}
						dragControls={dragControls}
						onDragEnd={handleDragEnd}
					>
						{/* Drag handle indicator */}
						<div className="absolute top-4 right-4 h-8 w-1 rounded-full bg-gray-300" />

						{/* Header */}
						<div className="border-b border-gray-100 p-6">
							<Link
								href="/dashboard"
								onClick={handleNavigation}
								className="flex items-center gap-3 transition-all hover:scale-105"
							>
								<div className="relative">
									<i className="i-lucide-building inline-block text-primary h-10 w-10"  />
									<div className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full bg-green-500" />
								</div>
								<div>
									<span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-2xl font-bold text-transparent">
										TenantFlow
									</span>
									<p className="mt-1 text-xs text-gray-500">
										Property Management
									</p>
								</div>
							</Link>
						</div>

						{/* Navigation */}
						<div className="flex-1 overflow-y-auto py-4">
							<nav className="space-y-1 px-4">
								{navigation.map(item => {
									const isActive =
										pathname === item.href ||
										pathname.startsWith(item.href + '/')

									return (
										<motion.div
											key={item.id}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: 0.1 }}
										>
											<Link
												href={item.href}
												onClick={handleNavigation}
												className={cn(
													'flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-all',
													'hover:scale-[1.02] hover:bg-gray-50 active:scale-[0.98]',
													isActive
														? 'border border-blue-200 bg-blue-50 text-blue-700'
														: 'text-gray-700 hover:text-gray-900'
												)}
											>
												<div className="flex items-center gap-3">
													<i className={cn(
															item.icon,
															'inline-block h-5 w-5',
															isActive
																? 'text-primary'
																: 'text-gray-500'
														)} />
													<span>{item.name}</span>
												</div>

												{/* Badge for counts */}
												{item.badge !== null &&
													item.badge > 0 && (
														<Badge
															variant="secondary"
															className={cn(
																'rounded-full px-2 py-0.5 text-xs',
																item.badgeColor ||
																	'bg-gray-100 text-gray-700'
															)}
														>
															{item.badge}
														</Badge>
													)}
											</Link>
										</motion.div>
									)
								})}
							</nav>
						</div>

						{/* Footer */}
						<div className="space-y-1 border-t border-gray-100 p-4">
							{/* Notifications */}
							<Link
								href="/notifications"
								onClick={handleNavigation}
								className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
							>
								<div className="flex items-center gap-3">
									<i className="i-lucide-bell inline-block h-5 w-5 text-gray-500"  />
									<span>Notifications</span>
								</div>
								{(stats?.maintenance?.total ?? 0) >
									0 && (
									<Badge
										variant="destructive"
										className="rounded-full px-1.5 py-0.5 text-xs"
									>
										{stats?.maintenance?.total ?? 0}
									</Badge>
								)}
							</Link>

							{/* Activity */}
							<Link
								href="/activity"
								onClick={handleNavigation}
								className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
							>
								<i className="i-lucide-activity inline-block h-5 w-5 text-gray-500"  />
								<span>Activity</span>
							</Link>

							{/* Profile */}
							<Link
								href="/profile"
								onClick={handleNavigation}
								className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
							>
								<i className="i-lucide-user inline-block h-5 w-5 text-gray-500"  />
								<span>Profile</span>
							</Link>

							{/* Logout */}
							<button
								onClick={() => {
									logger.info('Logout', {
										component: 'mobile-sidebar'
									})
									handleNavigation()
								}}
								className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50"
							>
								<i className="i-lucide-log-out inline-block h-5 w-5"  />
								<span>Logout</span>
							</button>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}

// Keep the original export name for compatibility
export { DashboardSidebar as Sidebar }
