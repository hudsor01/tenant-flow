'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { CurrentUserAvatar } from '@/components/profile/sections/current-user-avatar'
// Remove accessibility utils import
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/app/actions/auth'
import { useAuth } from '@/hooks/use-auth'
import { useNotificationRealtime } from '@/hooks/use-notification-realtime'
import { useNotifications } from '@/hooks/api/use-notifications'
import { cn } from '@/lib/utils/css.utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Calculator, Wrench, X, ArrowRight, Sparkles, Bell, Inbox, LayoutDashboard, Settings, LogOut, Menu } from 'lucide-react'
import { MagneticButton } from '@/components/ui/magnetic-button'
import { ShimmerButton } from '@/components/magicui'

interface NavigationProps {
	context: 'public' | 'authenticated' | 'tenant-portal'
	transparent?: boolean
	className?: string
	onSidebarToggle?: () => void
}

export function Navigation({
	context,
	transparent = false,
	className = '',
	onSidebarToggle
}: NavigationProps) {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const [scrolled, setScrolled] = useState(false)
	const pathname = usePathname()
	const { user } = useAuth()
	
	// Set up realtime notifications and fetch data using native hooks
	const { unreadNotifications } = useNotifications()
	useNotificationRealtime(user?.id || null)

	// Handle scroll for transparent nav
	useEffect(() => {
		if (!transparent) {
			return
		}

		const handleScroll = () => {
			setScrolled(window.scrollY > 10)
		}
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [transparent])

	// Close mobile menu when route changes
	useEffect(() => {
		setIsMobileMenuOpen(false)
	}, [pathname])

	const handleLogout = (): void => {
		void signOut()
	}

	const getNavBarClasses = () => {
		const baseClasses =
			'fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-20'

		if (transparent && !scrolled && context === 'public') {
			return cn(baseClasses, 'bg-transparent')
		}

		return cn(baseClasses, 'backdrop-blur-md border-b')
	}

	const getHomeLink = () => {
		switch (context) {
			case 'authenticated':
				return '/dashboard'
		case 'tenant-portal':
			return '/'
			default:
				return '/'
		}
	}

	const LogoSection = () => (
		<Link href={getHomeLink()} className="group">
			<span className="text-gradient-brand text-3xl font-bold tracking-tight transition-all duration-200">
				TenantFlow
			</span>
		</Link>
	)

	// Simplified dropdown menus for public context
	const [activeMenu, setActiveMenu] = useState<string | null>(null)
	const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	const handleMouseEnter = (menu: string) => {
		if (menuTimeoutRef.current) {
			clearTimeout(menuTimeoutRef.current)
			menuTimeoutRef.current = null
		}
		setActiveMenu(menu)
	}

	const handleMouseLeave = () => {
		menuTimeoutRef.current = setTimeout(() => {
			setActiveMenu(null)
		}, 150)
	}

	const PublicNavigation = () => {
		if (context !== 'public') {
			return null
		}

		const toolsItems = [
			// Lease Generator temporarily removed - see GitHub issue #202
			// {
			// 	to: '/tools/lease-generator',
			// 	label: 'Lease Generator',
			// 	description: 'Create state-specific rental leases',
			// 	icon: FileText,
			// 	badge: 'Popular'
			// },
			{
				to: '/tools/invoice-generator',
				label: 'Invoice Generator',
				description: 'Generate professional invoice templates',
				icon: Calculator
			},
			{
				to: '/tools/rent-calculator',
				label: 'Rent Calculator',
				description: 'Calculate optimal rental prices',
				icon: Calculator
			},
			{
				to: '/tools/maintenance-tracker',
				label: 'Maintenance Tracker',
				description: 'Track property maintenance requests',
				icon: Wrench
			}
		]

		const navItems = [
			{ to: '/pricing', label: 'Pricing' },
			{ to: '/about', label: 'About' },
			{ to: '/contact', label: 'Contact' }
		]

		return (
			<>
				{/* Desktop Navigation */}
				<nav className="hidden items-center space-x-2 lg:flex">
					{navItems.map(item => (
						<MagneticButton key={item.to} strength={0.15}>
							<Link
								href={item.to}
								className={cn(
								'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
								'hover:bg-gray-50/80 dark:hover:bg-slate-800/50',
								pathname === item.to
									? 'text-primary'
									: transparent &&
										  !scrolled &&
										  context === 'public'
										? 'text-white/90 hover:text-white'
										: 'text-gray-6 hover:text-gray-9'
							)}
						>
							{item.label}
						</Link>
						</MagneticButton>
					))}

					{/* Resources Dropdown */}
					<div
						className="relative"
						onMouseEnter={() => handleMouseEnter('resources')}
						onMouseLeave={handleMouseLeave}
					>
						<button
							className={cn(
								'flex items-center text-2xl font-medium transition-colors duration-200',
								'focus-visible:ring-ring rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
								transparent && !scrolled && context === 'public'
									? 'text-white/90 hover:text-white'
									: 'text-gray-6 hover:text-gray-9'
							)}
							onClick={() =>
								setActiveMenu(
									activeMenu === 'resources'
										? null
										: 'resources'
								)
							}
							onKeyDown={e => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault()
									setActiveMenu(
										activeMenu === 'resources'
											? null
											: 'resources'
									)
								} else if (e.key === 'Escape') {
									setActiveMenu(null)
								}
							}}
							aria-expanded={activeMenu === 'resources'}
							aria-haspopup="menu"
							aria-controls="resources-menu"
							id="resources-button"
						>
							Tools
							<ChevronDown className={cn(
									'ml-1 h-4 w-4 transition-transform duration-200',
									activeMenu === 'resources'
										? 'rotate-180'
										: ''
								)}
								aria-hidden="true" />
						</button>

						<AnimatePresence>
							{activeMenu === 'resources' && (
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 5 }}
									transition={{ duration: 0.15 }}
									className="absolute right-0 top-full z-50 w-80 pt-2"
								>
									<div className="overflow-hidden rounded-xl border border-gray-2 bg-white shadow-xl">
										<div
											className="p-6"
											role="menu"
											id="resources-menu"
											aria-labelledby="resources-button"
										>
											<h3
												className="mb-4 flex items-center text-sm font-semibold text-gray-900"
												role="presentation"
											>
												<Sparkles className="text-primary mr-2 h-4 w-4" aria-hidden="true" />
												Free Tools
											</h3>
											<div
												className="space-y-2"
												role="group"
											>
												{toolsItems.map(
													(item, index) => (
														<Link
															key={index}
															href={item.to}
															className="focus-visible:ring-ring group flex items-center rounded-lg p-3 transition-colors duration-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
															role="menuitem"
															tabIndex={0}
															onKeyDown={(
																e: React.KeyboardEvent
															) => {
																if (
																	e.key ===
																	'Escape'
																) {
																	setActiveMenu(
																		null
																	)
																	// Focus back to the trigger button
																	document
																		.getElementById(
																			'resources-button'
																		)
																		?.focus()
																}
															}}
														>
															<div className="mr-3 rounded-lg bg-blue-50 p-2 transition-colors group-hover:bg-blue-100">
																<item.icon
																	className="text-primary h-4 w-4"
																	aria-hidden="true"
																/>
															</div>
															<div className="flex-1">
																<div className="group-hover:text-primary text-sm font-medium text-gray-9 transition-colors">
																	{item.label}
																</div>
																<div className="text-xs text-gray-500">
																	{
																		item.description
																	}
																</div>
															</div>
														</Link>
													)
												)}
											</div>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</nav>

				{/* Mobile Navigation Menu (slide-out) */}
				<AnimatePresence>
					{isMobileMenuOpen && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="fixed inset-0 z-50 lg:hidden"
						>
							{/* Backdrop */}
							<div
								className="absolute inset-0 bg-black/60 backdrop-blur-sm"
								onClick={() => setIsMobileMenuOpen(false)}
							/>

							{/* Menu Panel */}
							<motion.div
								initial={{ x: '100%' }}
								animate={{ x: 0 }}
								exit={{ x: '100%' }}
								transition={{
									type: 'spring',
									damping: 25,
									stiffness: 200
								}}
								className="absolute right-0 top-0 h-full w-80 border-l border-gray-2 bg-white shadow-xl"
							>
								{/* Header */}
								<div className="flex items-center justify-between border-b border-gray-2 p-6">
									<div className="flex items-center space-x-3">
										<Image
											src="/tenant-flow-logo.png"
											alt="TenantFlow Logo"
											width={32}
											height={32}
											className="h-8 w-auto object-contain"
										/>
										<div>
											<span className="text-xl font-bold text-gray-900">
												TenantFlow
											</span>
											<p className="text-xs text-gray-500">
												PROPERTY MANAGEMENT
											</p>
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() =>
											setIsMobileMenuOpen(false)
										}
										className="text-gray-5 hover:bg-gray-1 hover:text-gray-900"
									>
										<X className="h-5 w-5" />
									</Button>
								</div>

								{/* Navigation Links */}
								<div className="space-y-4 p-6">
									{navItems.map((item, index) => (
										<motion.div
											key={item.to}
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: index * 0.1 }}
										>
											<Link
												href={item.to}
												className={cn(
													'flex items-center rounded-lg p-4 transition-colors duration-200',
													pathname === item.to
														? 'text-primary border border-blue-2 bg-blue-50'
														: 'hover:text-primary text-gray-7 hover:bg-gray-50'
												)}
											>
												<span className="font-medium">
													{item.label}
												</span>
												{pathname === item.to && (
													<div className="bg-primary ml-auto h-2 w-2 rounded-full" />
												)}
											</Link>
										</motion.div>
									))}

									{/* Authentication Section for Mobile */}
									<div className="space-y-3 border-t border-gray-2 pt-6">
										<motion.div
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{
												delay:
													(navItems.length + 1) * 0.1
											}}
										>
											<Link href="/auth/login">
												<Button
													variant="ghost"
													className="hover:text-primary h-auto w-full justify-start rounded-lg p-4 font-medium text-gray-7 hover:bg-gray-50"
												>
													Log in
												</Button>
											</Link>
										</motion.div>
										<motion.div
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{
												delay:
													(navItems.length + 2) * 0.1
											}}
										>
											<Link href="/auth/signup">
												<Button className="bg-primary h-auto w-full justify-center rounded-lg border-0 p-4 font-medium text-white shadow-sm hover:bg-blue-700">
													<span className="flex items-center">
														Get Started
														<ArrowRight className="ml-2 h-4 w-4" />
													</span>
												</Button>
											</Link>
										</motion.div>
									</div>

									{/* Tools Section */}
									<div className="border-t border-gray-2 pt-6">
										<h3 className="mb-4 flex items-center font-semibold text-gray-900">
											<Sparkles className="text-primary mr-2 h-4 w-4" />
											Free Tools
										</h3>
										<div className="space-y-2">
											{toolsItems.map((item, index) => (
												<motion.div
													key={item.to}
													initial={{
														opacity: 0,
														x: 20
													}}
													animate={{
														opacity: 1,
														x: 0
													}}
													transition={{
														delay:
															(index +
																navItems.length +
																3) *
															0.1
													}}
												>
													<Link
														href={item.to}
														className="hover:text-primary group flex items-center rounded-lg p-3 text-gray-6 transition-colors duration-200 hover:bg-gray-50"
													>
														<item.icon className="text-primary mr-3 h-4 w-4 transition-colors group-hover:text-blue-700" />
														<div className="min-w-0 flex-1">
															<div className="text-sm font-medium">
																{item.label}
															</div>
															<div className="text-xs text-gray-500">
																{
																	item.description
																}
															</div>
														</div>
													</Link>
												</motion.div>
											))}
										</div>
									</div>
								</div>
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>
			</>
		)
	}

	const AuthSection = () => {
		if (context === 'authenticated' || context === 'tenant-portal') {
			return (
				<div className="flex items-center space-x-2">
					{/* Native Notification Bell using existing DropdownMenu pattern */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="relative">
								<Bell className="h-5 w-5" />
								{/* Dynamic notification badge - using native patterns */}
								{unreadNotifications && unreadNotifications.length > 0 && (
									<span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-5 text-xs font-bold text-white flex items-center justify-center">
										{unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
									</span>
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
							<DropdownMenuLabel>Notifications</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{unreadNotifications && unreadNotifications.length > 0 ? (
								unreadNotifications.slice(0, 5).map((notification) => (
									<DropdownMenuItem key={notification.id}>
										<div className="flex flex-col space-y-1 w-full">
											<p className="text-sm font-medium">{notification.title}</p>
											<p className="text-xs text-gray-500">{notification.message}</p>
											<p className="text-xs text-gray-400">
												{new Date(notification.created_at).toLocaleString()}
											</p>
										</div>
									</DropdownMenuItem>
								))
							) : (
								<DropdownMenuItem disabled>
									<div className="flex flex-col items-center space-y-1 w-full py-4">
										<Inbox className="h-8 w-8 text-gray-400" />
										<p className="text-sm text-gray-500">No new notifications</p>
									</div>
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem>
								<Bell className="mr-2 h-4 w-4" />
								View all notifications
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					
					{/* Restore avatar dropdown with Dashboard/Settings/Logout */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button className="rounded-full">
								<CurrentUserAvatar />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuLabel>
								<div className="flex flex-col space-y-1">
									<p className="text-sm font-medium">
										{user?.name || user?.email?.split('@')[0] || 'User'}
									</p>
									<p className="text-muted-foreground text-xs">{user?.email}</p>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link href="/dashboard">
									<LayoutDashboard className="mr-2 h-4 w-4" />
									Dashboard
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href="/settings">
									<Settings className="mr-2 h-4 w-4" />
									Settings
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={handleLogout}>
								<LogOut className="mr-2 h-4 w-4" />
								Log out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)
		}

		return (
			<div className="hidden items-center space-x-4 lg:flex">
				<Link
					href="/auth/login"
					className={cn(
						'text-2xl font-medium transition-colors duration-200',
						transparent && !scrolled && context === 'public'
							? 'text-white/90 hover:text-white'
							: 'text-gray-6 hover:text-gray-9'
					)}
				>
					Log in
				</Link>
				<Link href="/auth/signup">
					<Button
						size="lg"
						className="btn-brand px-8 py-3 text-xl font-medium shadow-xl"
					>
						Get Started
					</Button>
				</Link>
			</div>
		)
	}

	const MobileMenuButton = () => {
		if (context === 'authenticated') {
			return onSidebarToggle ? (
				<button
					onClick={onSidebarToggle}
					className="focus-visible:ring-ring rounded-md p-2 transition-colors hover:bg-gray-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 lg:hidden"
					aria-label="Toggle sidebar"
					aria-expanded="false"
				>
					<Menu className="h-5 w-5 text-gray-600" aria-hidden="true" />
				</button>
			) : null
		}

		return (
			<button
				className={cn(
					'rounded-md p-2 transition-colors duration-200 lg:hidden',
					'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
					transparent && !scrolled && context === 'public'
						? 'text-white hover:bg-white/10'
						: 'text-gray-6 hover:bg-gray-1'
				)}
				onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
				aria-label={
					isMobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'
				}
				aria-expanded={isMobileMenuOpen}
				aria-controls="mobile-menu"
			>
				{isMobileMenuOpen ? (
					<X className="h-5 w-5" aria-hidden="true" />
				) : (
					<Menu className="h-5 w-5" aria-hidden="true" />
				)}
			</button>
		)
	}

	return (
		<motion.nav
			className={cn(
				'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
				'bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl',
				'border-b border-gray-100/50 dark:border-slate-800/50',
				'shadow-lg shadow-gray-100/20 dark:shadow-slate-900/20',
				className
			)}
			initial={{ y: -100, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ duration: 0.5, ease: "easeOut" }}
			role="navigation"
			aria-label="Main navigation"
			id="navigation"
			data-skip-target="skip-to-nav"
		>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					{/* Premium Logo with Magnetic Effect */}
					<MagneticButton strength={0.3}>
						<LogoSection />
					</MagneticButton>
					
					{/* Premium Navigation Items */}
					<div className="hidden md:flex items-center space-x-1">
						<PublicNavigation />
					</div>
					
					{/* Premium Auth Section */}
					<div className="flex items-center space-x-3">
						{context === 'public' && (
							<>
								<MagneticButton strength={0.2}>
									<Link href="/auth/login">
										<Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
											Sign In
										</Button>
									</Link>
								</MagneticButton>
								
								<MagneticButton strength={0.4}>
									<Link href="/auth/register">
										<ShimmerButton 
											className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium h-9 px-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
											shimmerColor="#3b82f6"
										>
											Get Started
											<ArrowRight className="ml-1.5 h-3.5 w-3.5" />
										</ShimmerButton>
									</Link>
								</MagneticButton>
							</>
						)}
						
						{(context === 'authenticated' || context === 'tenant-portal') && (
							<MagneticButton strength={0.2}>
								<AuthSection />
							</MagneticButton>
						)}
						
						<MobileMenuButton />
					</div>
				</div>
			</div>
		</motion.nav>
	)
}
