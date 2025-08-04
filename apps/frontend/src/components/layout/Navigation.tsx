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
		const baseClasses = 'fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-20'

		if (transparent && !scrolled && context === 'public') {
			return cn(baseClasses, 'bg-transparent')
		}

		return cn(
			baseClasses,
			'bg-gradient-to-r from-[#0f172a]/95 via-[#1e293b]/95 to-[#334155]/95 backdrop-blur-xl border-b border-white/10'
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
			className="flex items-center space-x-3 group"
		>
			<motion.div
				className="relative"
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
				transition={{ type: "spring", stiffness: 400, damping: 25 }}
			>
				{/* Glow effect behind logo */}
				<div className="absolute inset-0 bg-gradient-to-br from-[#60a5fa]/20 to-[#3b82f6]/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
				<img 
					src="/tenant-flow-logo.png" 
					alt="TenantFlow Logo" 
					className="relative h-10 w-auto object-contain drop-shadow-lg group-hover:drop-shadow-xl transition-all duration-300"
				/>
			</motion.div>
			<motion.div
				className="flex flex-col"
				initial={{ opacity: 0, x: -10 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.4, delay: 0.1 }}
			>
				<span className={cn(
					"text-2xl font-bold leading-tight transition-all duration-300 group-hover:text-[#60a5fa]",
					transparent && !scrolled && context === 'public' ? "text-white" : "text-white"
				)}>
					TenantFlow
				</span>
				<span className="text-xs text-white/60 font-medium tracking-wide">
					PROPERTY MANAGEMENT
				</span>
			</motion.div>
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
			{ to: "/pricing", label: "Pricing", highlight: false },
			{ to: "/about", label: "About", highlight: false },
			{ to: "/blog", label: "Blog", highlight: false },
			{ to: "/contact", label: "Contact", highlight: false }
		]

		return (
			<>
				{/* Desktop Navigation */}
				<Box className="relative hidden lg:block">
					<Flex className="items-center gap-8" align="center">
						{navItems.map((item) => (
							<Link key={item.to} to={item.to}>
								<motion.div
									whileHover={{ y: -2 }}
									whileTap={{ y: 0 }}
									transition={{ type: "spring", stiffness: 400, damping: 25 }}
								>
									<Button
										variant="ghost"
										className={cn(
											"px-4 py-2 text-base font-medium h-auto transition-all duration-300 rounded-lg relative group",
											location.pathname === item.to 
												? "text-white bg-white/10" 
												: "text-white/80 hover:text-white hover:bg-white/5"
										)}
									>
										{item.label}
										{location.pathname === item.to && (
											<motion.div
												layoutId="navbar-indicator"
												className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-[#60a5fa] to-[#3b82f6] rounded-full"
												transition={{ type: "spring", stiffness: 500, damping: 30 }}
											/>
										)}
									</Button>
								</motion.div>
							</Link>
						))}

						{/* Resources Dropdown */}
						<Box
							className="relative"
							onMouseEnter={() => handleMouseEnter('resources')}
							onMouseLeave={handleMouseLeave}
						>
							<motion.div
								whileHover={{ y: -2 }}
								whileTap={{ y: 0 }}
								transition={{ type: "spring", stiffness: 400, damping: 25 }}
							>
								<Button
									variant="ghost"
									className="px-4 py-2 text-base font-medium h-auto transition-all duration-300 rounded-lg text-white/80 hover:text-white hover:bg-white/5 group"
								>
									Resources
									<ChevronDown className={cn(
										"ml-1 h-4 w-4 transition-transform duration-200",
										activeMenu === 'resources' ? "rotate-180" : ""
									)} />
								</Button>
							</motion.div>

							<AnimatePresence>
								{activeMenu === 'resources' && (
									<motion.div
										initial={{ opacity: 0, y: 10, scale: 0.95 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={{ opacity: 0, y: 5, scale: 0.95 }}
										transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
										className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50 w-96"
									>
										<div className="bg-gradient-to-br from-[#1e293b]/95 via-[#334155]/95 to-[#475569]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
											{/* Header */}
											<div className="px-6 py-4 border-b border-white/10">
												<h3 className="text-white font-semibold text-lg flex items-center">
													<Sparkles className="h-5 w-5 mr-2 text-[#60a5fa]" />
													Free Tools
												</h3>
												<p className="text-white/60 text-sm mt-1">Professional property management tools at no cost</p>
											</div>
											
											{/* Tools Grid */}
											<div className="p-4 space-y-2">
												{toolsItems.map((item, index) => (
													<Link
														key={index}
														to={item.to}
														className="group flex items-start p-4 rounded-xl transition-all duration-300 hover:bg-white/10 border border-transparent hover:border-white/10"
													>
														<div className="p-2 rounded-lg bg-gradient-to-br from-[#60a5fa]/20 to-[#3b82f6]/20 mr-4 group-hover:from-[#60a5fa]/30 group-hover:to-[#3b82f6]/30 transition-all">
															<item.icon className="h-5 w-5 text-[#60a5fa]" />
														</div>
														<div className="flex-1 min-w-0">
															<div className="flex items-center justify-between mb-1">
																<h4 className="font-semibold text-white text-sm group-hover:text-[#60a5fa] transition-colors">
																	{item.label}
																</h4>
																{item.badge && (
																	<span className="px-2 py-0.5 bg-gradient-to-r from-[#60a5fa] to-[#3b82f6] text-white text-xs font-medium rounded-full">
																		{item.badge}
																	</span>
																)}
															</div>
															<p className="text-xs text-white/70 leading-relaxed mb-2">
																{item.description}
															</p>
															<div className="flex items-center text-[#60a5fa] opacity-0 group-hover:opacity-100 transition-opacity">
																<span className="text-xs font-medium">Try it free</span>
																<ArrowRight className="h-3 w-3 ml-1" />
															</div>
														</div>
													</Link>
												))}
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</Box>
					</Flex>
				</Box>

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
								className="absolute right-0 top-0 h-full w-80 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] shadow-2xl"
							>
								{/* Header */}
								<div className="flex items-center justify-between p-6 border-b border-white/10">
									<div className="flex items-center space-x-3">
										<img 
											src="/tenant-flow-logo.png" 
											alt="TenantFlow Logo" 
											className="h-8 w-auto object-contain drop-shadow-lg"
										/>
										<div>
											<span className="text-xl font-bold text-white">TenantFlow</span>
											<p className="text-xs text-white/60">PROPERTY MANAGEMENT</p>
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setIsMobileMenuOpen(false)}
										className="text-white/80 hover:text-white hover:bg-white/10"
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
													"flex items-center p-4 rounded-xl transition-all duration-300 group",
													location.pathname === item.to 
														? "bg-white/10 text-white border border-white/20" 
														: "text-white/80 hover:text-white hover:bg-white/5"
												)}
											>
												<span className="font-medium">{item.label}</span>
												{location.pathname === item.to && (
													<div className="ml-auto w-2 h-2 bg-[#60a5fa] rounded-full" />
												)}
											</Link>
										</motion.div>
									))}

									{/* Authentication Section for Mobile */}
									<div className="pt-6 border-t border-white/10 space-y-3">
										<motion.div
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: (navItems.length + 1) * 0.1 }}
										>
											<Link to="/auth/login">
												<Button
													variant="ghost"
													className="w-full justify-start p-4 h-auto rounded-xl text-white/80 hover:text-white hover:bg-white/5 font-medium"
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
											<Link to="/auth/register">
												<Button
													className="w-full justify-center p-4 h-auto rounded-xl font-medium bg-gradient-to-r from-[#60a5fa] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#1d4ed8] text-white border-0 shadow-lg"
												>
													<span className="flex items-center">
														Get Started
														<Sparkles className="ml-2 h-4 w-4" />
													</span>
												</Button>
											</Link>
										</motion.div>
									</div>

									{/* Tools Section */}
									<div className="pt-6 border-t border-white/10">
										<h3 className="text-white font-semibold mb-4 flex items-center">
											<Sparkles className="h-4 w-4 mr-2 text-[#60a5fa]" />
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
														className="flex items-center p-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all duration-300 group"
													>
														<item.icon className="h-4 w-4 mr-3 text-[#60a5fa] group-hover:text-white transition-colors" />
														<div className="flex-1 min-w-0">
															<div className="font-medium text-sm">{item.label}</div>
															<div className="text-xs text-white/50">{item.description}</div>
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
				<Flex align="center">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="rounded-full ring-2 ring-white/20 hover:ring-white/40 transition-all duration-200"
							>
								<CurrentUserAvatar />
							</motion.button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="w-56 p-2 shadow-2xl border-white/10 bg-gradient-to-br from-[#1e293b]/95 via-[#334155]/95 to-[#475569]/95 backdrop-blur-xl rounded-xl"
							sideOffset={8}
						>
							<DropdownMenuLabel className="px-2 py-1.5">
								<div className="flex flex-col space-y-1">
									<p className="text-sm font-semibold leading-none text-white">
										{user?.name || user?.email?.split('@')[0] || 'User'}
									</p>
									<p className="text-xs text-white/60 leading-none">
										{user?.email}
									</p>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator className="bg-white/10" />
							<DropdownMenuItem asChild className="cursor-pointer">
								<Link
									to={context === 'authenticated' ? '/profile' : '/tenant-dashboard'}
									className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors text-white/80 hover:text-white"
								>
									<UserCircle className="h-4 w-4" />
									<span>Profile</span>
								</Link>
							</DropdownMenuItem>
							{context === 'authenticated' && (
								<DropdownMenuItem className="cursor-pointer">
									<div className="flex items-center gap-2 px-2 py-1.5 text-white/80 hover:text-white">
										<Settings className="h-4 w-4" />
										<span>Settings</span>
									</div>
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator className="bg-white/10" />
							<DropdownMenuItem
								onClick={handleLogout}
								className="cursor-pointer text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
							>
								<div className="flex items-center gap-2 px-2 py-1.5">
									<LogOut className="h-4 w-4" />
									<span>Log out</span>
								</div>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</Flex>
			)
		}

		return (
			<Flex className="hidden lg:flex" align="center" gap="3" style={{ zIndex: 10 }}>
				<Link to="/auth/login">
					<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
						<Button
							variant="ghost"
							size="default"
							className={cn(
								"text-base font-medium px-5 py-2 h-auto rounded-lg transition-all duration-300",
								transparent && !scrolled 
									? "text-white/80 hover:text-white hover:bg-white/10"
									: "text-white/80 hover:text-white hover:bg-white/10"
							)}
						>
							Log in
						</Button>
					</motion.div>
				</Link>
				<Link to="/auth/register">
					<motion.div 
						whileHover={{ scale: 1.02 }} 
						whileTap={{ scale: 0.98 }}
						className="relative group"
					>
						{/* Glow effect */}
						<div className="absolute inset-0 bg-gradient-to-r from-[#60a5fa] to-[#3b82f6] rounded-lg blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-300" />
						<Button
							size="default"
							className={cn(
								"relative px-6 py-2 h-auto rounded-lg font-medium text-base transition-all duration-300",
								"bg-gradient-to-r from-[#60a5fa] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#1d4ed8]",
								"text-white border-0 shadow-lg hover:shadow-xl",
								"before:absolute before:inset-0 before:rounded-lg before:bg-white/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity"
							)}
						>
							<span className="relative flex items-center">
								Get Started
								<Sparkles className="ml-2 h-4 w-4" />
							</span>
						</Button>
					</motion.div>
				</Link>
			</Flex>
		)
	}

	const MobileMenuButton = () => {
		if (context === 'authenticated') {
			return onSidebarToggle ? (
				<Button
					variant="ghost"
					size="icon"
					onClick={onSidebarToggle}
					className="lg:hidden p-2 hover:bg-white/10 transition-all duration-200 text-white/80 hover:text-white"
				>
					<Menu className="h-5 w-5" />
				</Button>
			) : null
		}

		return (
			<Button
				variant="ghost"
				size="icon"
				className="lg:hidden p-2 hover:bg-white/10 transition-all duration-300 text-white/80 hover:text-white"
				onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
			>
				<motion.div
					animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
					transition={{ duration: 0.2 }}
				>
					{isMobileMenuOpen ? (
						<X className="h-5 w-5" />
					) : (
						<Menu className="h-5 w-5" />
					)}
				</motion.div>
			</Button>
		)
	}

	return (
		<nav className={cn(getNavBarClasses(), className)}>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<Flex className="h-20" align="center" justify="between">
					<LogoSection />
					<PublicNavigation />
					<div className="flex items-center gap-4">
						<AuthSection />
						<MobileMenuButton />
					</div>
				</Flex>
			</div>
		</nav>
	)
}
