'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils/css.utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
				return '/tenant-dashboard'
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
				icon: 'i-lucide-calculator'
			},
			{
				to: '/tools/rent-calculator',
				label: 'Rent Calculator',
				description: 'Calculate optimal rental prices',
				icon: 'i-lucide-calculator'
			},
			{
				to: '/tools/maintenance-tracker',
				label: 'Maintenance Tracker',
				description: 'Track property maintenance requests',
				icon: 'i-lucide-wrench'
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
				<nav className="hidden items-center space-x-8 lg:flex">
					{navItems.map(item => (
						<Link
							key={item.to}
							href={item.to}
							className={cn(
								'hover:text-primary text-2xl font-medium transition-colors duration-200',
								pathname === item.to
									? 'text-primary'
									: transparent &&
										  !scrolled &&
										  context === 'public'
										? 'text-white/90 hover:text-white'
										: 'text-gray-600 hover:text-gray-900'
							)}
						>
							{item.label}
						</Link>
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
									: 'text-gray-600 hover:text-gray-900'
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
							<i className={cn(
								'i-lucide-chevron-down inline-block',
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
									<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
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
												<i className="i-lucide-sparkles inline-block text-primary mr-2 h-4 w-4" aria-hidden="true" />
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
																<div className="group-hover:text-primary text-sm font-medium text-gray-900 transition-colors">
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
								className="absolute right-0 top-0 h-full w-80 border-l border-gray-200 bg-white shadow-xl"
							>
								{/* Header */}
								<div className="flex items-center justify-between border-b border-gray-200 p-6">
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
										className="text-gray-500 hover:bg-gray-100 hover:text-gray-900"
									>
										<i className="i-lucide-x inline-block h-5 w-5"  />
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
														? 'text-primary border border-blue-200 bg-blue-50'
														: 'hover:text-primary text-gray-700 hover:bg-gray-50'
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
									<div className="space-y-3 border-t border-gray-200 pt-6">
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
													className="hover:text-primary h-auto w-full justify-start rounded-lg p-4 font-medium text-gray-700 hover:bg-gray-50"
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
											<Link href="/get-started">
												<Button className="bg-primary h-auto w-full justify-center rounded-lg border-0 p-4 font-medium text-white shadow-sm hover:bg-blue-700">
													<span className="flex items-center">
														Get Started
														<i className="i-lucide-arrow-right inline-block ml-2 h-4 w-4"  />
													</span>
												</Button>
											</Link>
										</motion.div>
									</div>

									{/* Tools Section */}
									<div className="border-t border-gray-200 pt-6">
										<h3 className="mb-4 flex items-center font-semibold text-gray-900">
											<i className="i-lucide-sparkles inline-block text-primary mr-2 h-4 w-4"  />
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
														className="hover:text-primary group flex items-center rounded-lg p-3 text-gray-600 transition-colors duration-200 hover:bg-gray-50"
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
									{user?.name ||
										user?.email?.split('@')[0] ||
										'User'}
								</p>
								<p className="text-muted-foreground text-xs">
									{user?.email}
								</p>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link
								href={
									context === 'authenticated'
										? '/profile'
										: '/tenant-dashboard'
								}
							>
								<i className="i-lucide-usercircle inline-block mr-2 h-4 w-4"  />
								Profile
							</Link>
						</DropdownMenuItem>
						{context === 'authenticated' && (
							<DropdownMenuItem>
								<i className="i-lucide-settings inline-block mr-2 h-4 w-4"  />
								Settings
							</DropdownMenuItem>
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleLogout}>
							<i className="i-lucide-log-out inline-block mr-2 h-4 w-4"  />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
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
							: 'text-gray-600 hover:text-gray-900'
					)}
				>
					Log in
				</Link>
				<Link href="/get-started">
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
					className="focus-visible:ring-ring rounded-md p-2 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 lg:hidden"
					aria-label="Toggle sidebar"
					aria-expanded="false"
				>
					<i className="i-lucide-menu inline-block h-5 w-5 text-gray-600" aria-hidden="true" />
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
						: 'text-gray-600 hover:bg-gray-100'
				)}
				onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
				aria-label={
					isMobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'
				}
				aria-expanded={isMobileMenuOpen}
				aria-controls="mobile-menu"
			>
				{isMobileMenuOpen ? (
					<i className="i-lucide-x inline-block h-5 w-5" aria-hidden="true" />
				) : (
					<i className="i-lucide-menu inline-block h-5 w-5" aria-hidden="true" />
				)}
			</button>
		)
	}

	return (
		<nav
			className={cn(getNavBarClasses(), className)}
			style={{
				backgroundColor: 'var(--overlay-light)',
				borderColor: 'var(--border-subtle)'
			}}
			role="navigation"
			aria-label="Main navigation"
			id="navigation"
			data-skip-target="skip-to-nav"
		>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-20 items-center justify-between">
					<LogoSection />
					<PublicNavigation />
					<div className="flex items-center space-x-4">
						<AuthSection />
						<MobileMenuButton />
					</div>
				</div>
			</div>
		</nav>
	)
}
