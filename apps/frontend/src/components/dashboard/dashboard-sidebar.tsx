'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion'
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
import {
	Home,
	Building,
	Users,
	FileText,
	Wrench,
	BarChart3,
	Settings,
	LogOut,
	User,
	Bell,
	Activity
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useDashboardStats } from '@/hooks/api/use-dashboard'
import { cn } from '@/lib/utils'

const getNavigationItems = (stats?: { properties?: { totalProperties?: number }; tenants?: { totalTenants?: number }; leases?: { activeLeases?: number }; maintenanceRequests?: { open?: number } }) => [
	{ 
		id: 'dashboard', 
		name: 'Dashboard', 
		href: '/dashboard', 
		icon: Home,
		badge: null 
	},
	{
		id: 'properties',
		name: 'Properties',
		href: '/properties',
		icon: Building,
		badge: stats?.properties?.totalProperties || null,
		badgeColor: 'bg-blue-100 text-blue-700'
	},
	{ 
		id: 'tenants', 
		name: 'Tenants', 
		href: '/tenants', 
		icon: Users,
		badge: stats?.tenants?.totalTenants || null,
		badgeColor: 'bg-green-100 text-green-700'
	},
	{ 
		id: 'leases', 
		name: 'Leases', 
		href: '/leases', 
		icon: FileText,
		badge: stats?.leases?.activeLeases || null,
		badgeColor: 'bg-purple-100 text-purple-700'
	},
	{
		id: 'maintenance',
		name: 'Maintenance',
		href: '/maintenance',
		icon: Wrench,
		badge: stats?.maintenanceRequests?.open || null,
		badgeColor: (stats?.maintenanceRequests?.open || 0) > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
	},
	{ 
		id: 'reports', 
		name: 'Reports', 
		href: '/reports', 
		icon: BarChart3,
		badge: null 
	},
	{ 
		id: 'settings', 
		name: 'Settings', 
		href: '/settings', 
		icon: Settings,
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
	const { data: stats } = useDashboardStats()
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
			return () => document.removeEventListener('mousedown', handleClickOutside)
		}
		
		return undefined
	}, [isMobile, isOpen, onClose])

	// Handle swipe to close
	const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
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
								<Building className="text-primary h-8 w-8" />
								{/* Activity pulse indicator */}
								<div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse group-data-[collapsible=icon]:hidden" />
							</div>
							<span className="text-xl font-bold group-data-[collapsible=icon]:hidden bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
								TenantFlow
							</span>
						</Link>
					</SidebarHeader>

					<SidebarContent>
						<SidebarGroup>
							<SidebarGroupContent>
								<SidebarMenu>
									{navigation.map(item => {
										const Icon = item.icon
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
													<Link href={item.href} className="flex items-center justify-between w-full">
														<div className="flex items-center gap-2">
															<Icon className="h-4 w-4" />
															<span>{item.name}</span>
														</div>
														{/* Badge for counts */}
														{item.badge !== null && item.badge > 0 && (
															<Badge 
																variant="secondary" 
																className={`text-xs px-2 py-0.5 rounded-full group-data-[collapsible=icon]:hidden ${item.badgeColor || 'bg-gray-100 text-gray-700'}`}
															>
																{item.badge}
															</Badge>
														)}
														{/* Active indicator */}
														{isActive && (
															<div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
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
								<SidebarMenuButton asChild tooltip="Notifications">
									<Link href="/notifications" className="relative">
										<Bell className="h-4 w-4" />
										<span>Notifications</span>
										{/* Notification badge */}
										{(stats?.maintenanceRequests?.open || 0) > 0 && (
											<div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full group-data-[collapsible=icon]:block hidden" />
										)}
										{(stats?.maintenanceRequests?.open || 0) > 0 && (
											<Badge 
												variant="destructive" 
												className="text-xs px-1.5 py-0.5 rounded-full group-data-[collapsible=icon]:hidden ml-auto"
											>
												{stats?.maintenanceRequests?.open || 0}
											</Badge>
										)}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							
							{/* Activity */}
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Activity">
									<Link href="/activity">
										<Activity className="h-4 w-4" />
										<span>Activity</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							
							{/* Profile */}
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Profile">
									<Link href="/profile" className="transition-all hover:scale-[1.02]">
										<User className="h-4 w-4" />
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
										<LogOut className="h-4 w-4" />
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
						className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
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
							"fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-50 md:hidden",
							"border-r border-gray-200",
							className
						)}
						initial={{ x: '-100%' }}
						animate={{ x: 0 }}
						exit={{ x: '-100%' }}
						transition={{ 
							type: "spring",
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
						<div className="absolute top-4 right-4 w-1 h-8 bg-gray-300 rounded-full" />

						{/* Header */}
						<div className="p-6 border-b border-gray-100">
							<Link
								href="/dashboard"
								onClick={handleNavigation}
								className="flex items-center gap-3 transition-all hover:scale-105"
							>
								<div className="relative">
									<Building className="text-blue-600 h-10 w-10" />
									<div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
								</div>
								<div>
									<span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
										TenantFlow
									</span>
									<p className="text-xs text-gray-500 mt-1">Property Management</p>
								</div>
							</Link>
						</div>

						{/* Navigation */}
						<div className="flex-1 overflow-y-auto py-4">
							<nav className="px-4 space-y-1">
								{navigation.map(item => {
									const Icon = item.icon
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
													"flex items-center justify-between w-full px-3 py-3 text-sm font-medium rounded-lg transition-all",
													"hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]",
													isActive
														? "bg-blue-50 text-blue-700 border border-blue-200"
														: "text-gray-700 hover:text-gray-900"
												)}
											>
												<div className="flex items-center gap-3">
													<Icon className={cn(
														"h-5 w-5",
														isActive ? "text-blue-600" : "text-gray-500"
													)} />
													<span>{item.name}</span>
												</div>
												
												{/* Badge for counts */}
												{item.badge !== null && item.badge > 0 && (
													<Badge 
														variant="secondary" 
														className={cn(
															"text-xs px-2 py-0.5 rounded-full",
															item.badgeColor || 'bg-gray-100 text-gray-700'
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
						<div className="border-t border-gray-100 p-4 space-y-1">
							{/* Notifications */}
							<Link
								href="/notifications"
								onClick={handleNavigation}
								className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
							>
								<div className="flex items-center gap-3">
									<Bell className="h-5 w-5 text-gray-500" />
									<span>Notifications</span>
								</div>
								{(stats?.maintenanceRequests?.open || 0) > 0 && (
									<Badge variant="destructive" className="text-xs px-1.5 py-0.5 rounded-full">
										{stats?.maintenanceRequests?.open || 0}
									</Badge>
								)}
							</Link>

							{/* Activity */}
							<Link
								href="/activity"
								onClick={handleNavigation}
								className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
							>
								<Activity className="h-5 w-5 text-gray-500" />
								<span>Activity</span>
							</Link>

							{/* Profile */}
							<Link
								href="/profile"
								onClick={handleNavigation}
								className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
							>
								<User className="h-5 w-5 text-gray-500" />
								<span>Profile</span>
							</Link>

							{/* Logout */}
							<button
								onClick={() => {
									logger.info('Logout', { component: 'mobile-sidebar' })
									handleNavigation()
								}}
								className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-all"
							>
								<LogOut className="h-5 w-5" />
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