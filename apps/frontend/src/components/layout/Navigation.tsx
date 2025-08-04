import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Box, Flex } from '@radix-ui/themes'
import { Button } from '@/components/ui/button'
import { CurrentUserAvatar } from '@/components/current-user-avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	FileText,
	Calculator,
	Wrench,
	Menu,
	X,
	Settings,
	UserCircle,
	LogOut,
	ChevronDown,
	Sparkles,
	ArrowRight
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils/css.utils'
import { Link, useLocation } from '@tanstack/react-router'

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
	const location = useLocation()
	const { user, logout } = useAuth()

	// Handle scroll for transparent nav
	useEffect(() => {
		if (!transparent) return

		const handleScroll = () => {
			setScrolled(window.scrollY > 10)
		}
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [transparent])

	// Close mobile menu when route changes
	useEffect(() => {
		setIsMobileMenuOpen(false)
	}, [location])

	const handleLogout = (): void => {
		logout.mutate()
	}

	const getNavBarClasses = () => {
		const baseClasses = 'fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-16'

		if (transparent && !scrolled && context === 'public') {
			return cn(baseClasses, 'bg-transparent')
		}

		return cn(
			baseClasses,
			'bg-white/95 backdrop-blur-md border-b border-gray-200/50'
		)
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
		<Link
			to={getHomeLink()}
			className="group"
		>
			<span className="text-2xl font-bold tracking-tight transition-all duration-200 bg-gradient-to-r from-[#60a5fa] via-[#34d399] to-[#fbbf24] bg-clip-text text-transparent hover:from-[#3b82f6] hover:via-[#059669] hover:to-[#f59e0b]">
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
		if (context !== 'public') return null

		const toolsItems = [
			{
				to: "/tools/lease-generator",
				label: "Lease Generator",
				description: "Create state-specific rental leases",
				icon: FileText,
				badge: "Popular"
			},
			{
				to: "/tools/invoice-generator", 
				label: "Invoice Generator",
				description: "Generate professional invoice templates",
				icon: Calculator,
			},
			{
				to: "/tools/rent-calculator",
				label: "Rent Calculator", 
				description: "Calculate optimal rental prices",
				icon: Calculator,
			},
			{
				to: "/tools/maintenance-tracker",
				label: "Maintenance Tracker",
				description: "Track property maintenance requests",
				icon: Wrench,
			}
		]

		const navItems = [
			{ to: "/pricing", label: "Pricing" },
			{ to: "/about", label: "About" },
			{ to: "/contact", label: "Contact" }
		]

		return (
			<>
				{/* Desktop Navigation */}
				<nav className="hidden lg:flex items-center space-x-8">
					{navItems.map((item) => (
						<Link 
							key={item.to} 
							to={item.to}
							className={cn(
								"text-sm font-medium transition-colors duration-200 hover:text-blue-600",
								location.pathname === item.to 
									? "text-blue-600" 
									: (transparent && !scrolled && context === 'public' 
										? "text-white/90 hover:text-white" 
										: "text-gray-600 hover:text-gray-900")
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
								"flex items-center text-sm font-medium transition-colors duration-200",
								transparent && !scrolled && context === 'public' 
									? "text-white/90 hover:text-white" 
									: "text-gray-600 hover:text-gray-900"
							)}
						>
							Tools
							<ChevronDown className={cn(
								"ml-1 h-4 w-4 transition-transform duration-200",
								activeMenu === 'resources' ? "rotate-180" : ""
							)} />
						</button>

						<AnimatePresence>
							{activeMenu === 'resources' && (
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 5 }}
									transition={{ duration: 0.15 }}
									className="absolute top-full right-0 pt-2 z-50 w-80"
								>
									<div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
										<div className="p-6">
											<h3 className="text-gray-900 font-semibold text-sm mb-4 flex items-center">
												<Sparkles className="h-4 w-4 mr-2 text-blue-600" />
												Free Tools
											</h3>
											<div className="space-y-2">
												{toolsItems.map((item, index) => (
													<Link
														key={index}
														to={item.to}
														className="group flex items-center p-3 rounded-lg transition-colors duration-200 hover:bg-gray-50"
													>
														<div className="p-2 rounded-lg bg-blue-50 mr-3 group-hover:bg-blue-100 transition-colors">
															<item.icon className="h-4 w-4 text-blue-600" />
														</div>
														<div className="flex-1">
															<div className="font-medium text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
																{item.label}
															</div>
															<div className="text-xs text-gray-500">
																{item.description}
															</div>
														</div>
													</Link>
												))}
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
								initial={{ x: "100%" }}
								animate={{ x: 0 }}
								exit={{ x: "100%" }}
								transition={{ type: "spring", damping: 25, stiffness: 200 }}
								className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl border-l border-gray-200"
							>
								{/* Header */}
								<div className="flex items-center justify-between p-6 border-b border-gray-200">
									<div className="flex items-center space-x-3">
										<img 
											src="/tenant-flow-logo.png" 
											alt="TenantFlow Logo" 
											className="h-8 w-auto object-contain"
										/>
										<div>
											<span className="text-xl font-bold text-gray-900">TenantFlow</span>
											<p className="text-xs text-gray-500">PROPERTY MANAGEMENT</p>
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setIsMobileMenuOpen(false)}
										className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
									>
										<X className="h-5 w-5" />
									</Button>
								</div>

								{/* Navigation Links */}
								<div className="p-6 space-y-4">
									{navItems.map((item, index) => (
										<motion.div
											key={item.to}
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: index * 0.1 }}
										>
											<Link 
												to={item.to}
												className={cn(
													"flex items-center p-4 rounded-lg transition-colors duration-200",
													location.pathname === item.to 
														? "bg-blue-50 text-blue-600 border border-blue-200" 
														: "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
												)}
											>
												<span className="font-medium">{item.label}</span>
												{location.pathname === item.to && (
													<div className="ml-auto w-2 h-2 bg-blue-600 rounded-full" />
												)}
											</Link>
										</motion.div>
									))}

									{/* Authentication Section for Mobile */}
									<div className="pt-6 border-t border-gray-200 space-y-3">
										<motion.div
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: (navItems.length + 1) * 0.1 }}
										>
											<Link to="/auth/login">
												<Button
													variant="ghost"
													className="w-full justify-start p-4 h-auto rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-medium"
												>
													Log in
												</Button>
											</Link>
										</motion.div>
										<motion.div
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: (navItems.length + 2) * 0.1 }}
										>
											<Link to="/get-started">
												<Button
													className="w-full justify-center p-4 h-auto rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm"
												>
													<span className="flex items-center">
														Get Started
														<ArrowRight className="ml-2 h-4 w-4" />
													</span>
												</Button>
											</Link>
										</motion.div>
									</div>

									{/* Tools Section */}
									<div className="pt-6 border-t border-gray-200">
										<h3 className="text-gray-900 font-semibold mb-4 flex items-center">
											<Sparkles className="h-4 w-4 mr-2 text-blue-600" />
											Free Tools
										</h3>
										<div className="space-y-2">
											{toolsItems.map((item, index) => (
												<motion.div
													key={item.to}
													initial={{ opacity: 0, x: 20 }}
													animate={{ opacity: 1, x: 0 }}
													transition={{ delay: (index + navItems.length + 3) * 0.1 }}
												>
													<Link
														to={item.to}
														className="flex items-center p-3 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors duration-200 group"
													>
														<item.icon className="h-4 w-4 mr-3 text-blue-600 group-hover:text-blue-700 transition-colors" />
														<div className="flex-1 min-w-0">
															<div className="font-medium text-sm">{item.label}</div>
															<div className="text-xs text-gray-500">{item.description}</div>
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
									{user?.name || user?.email?.split('@')[0] || 'User'}
								</p>
								<p className="text-xs text-muted-foreground">
									{user?.email}
								</p>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link to={context === 'authenticated' ? '/profile' : '/tenant-dashboard'}>
								<UserCircle className="mr-2 h-4 w-4" />
								Profile
							</Link>
						</DropdownMenuItem>
						{context === 'authenticated' && (
							<DropdownMenuItem>
								<Settings className="mr-2 h-4 w-4" />
								Settings
							</DropdownMenuItem>
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleLogout}>
							<LogOut className="mr-2 h-4 w-4" />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)
		}

		return (
			<div className="hidden lg:flex items-center space-x-4">
				<Link 
					to="/auth/login"
					className={cn(
						"text-sm font-medium transition-colors duration-200",
						transparent && !scrolled && context === 'public'
							? "text-white/90 hover:text-white"
							: "text-gray-600 hover:text-gray-900"
					)}
				>
					Log in
				</Link>
				<Link to="/get-started">
					<Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
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
					className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
				>
					<Menu className="h-5 w-5 text-gray-600" />
				</button>
			) : null
		}

		return (
			<button
				className={cn(
					"lg:hidden p-2 rounded-md transition-colors duration-200",
					transparent && !scrolled && context === 'public'
						? "text-white hover:bg-white/10"
						: "text-gray-600 hover:bg-gray-100"
				)}
				onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
			>
				{isMobileMenuOpen ? (
					<X className="h-5 w-5" />
				) : (
					<Menu className="h-5 w-5" />
				)}
			</button>
		)
	}

	return (
		<nav className={cn(getNavBarClasses(), className)}>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
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
