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
	Building,
	FileText,
	Calculator,
	Wrench,
	Menu,
	X,
	// BookOpen, // Unused import
	Settings,
	UserCircle,
	LogOut
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
			>
				<Building className={cn(
					"h-10 w-10 transition-colors",
					transparent && !scrolled && context === 'public' ? "text-white" : "text-white"
				)} />
			</motion.div>
			<motion.div
				className="flex flex-col"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<span className={cn(
					"text-3xl font-bold leading-tight transition-colors",
					transparent && !scrolled && context === 'public' ? "text-white" : "text-white"
				)}>
					TenantFlow
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

		return (
			<Box className="relative">
				<Flex className="hidden lg:flex items-center gap-12" align="center">
					<Link to="/about">
						<Button
							variant="ghost"
							className={cn(
								"px-6 py-4 text-xl font-semibold h-auto transition-colors",
								transparent && !scrolled 
									? (location.pathname === '/about' ? "text-white" : "text-white/90 hover:text-white")
									: (location.pathname === '/about' ? "text-white" : "text-white/90 hover:text-white")
							)}
						>
							About
						</Button>
					</Link>

					<Link to="/pricing">
						<Button
							variant="ghost"
							className={cn(
								"px-6 py-4 text-xl font-semibold h-auto transition-colors",
								transparent && !scrolled 
									? (location.pathname === '/pricing' ? "text-white" : "text-white/90 hover:text-white")
									: (location.pathname === '/pricing' ? "text-white" : "text-white/90 hover:text-white")
							)}
						>
							Pricing
						</Button>
					</Link>

					<Link to="/blog">
						<Button
							variant="ghost"
							className={cn(
								"px-6 py-4 text-xl font-semibold h-auto transition-colors",
								transparent && !scrolled 
									? (location.pathname.startsWith('/blog') ? "text-white" : "text-white/90 hover:text-white")
									: (location.pathname.startsWith('/blog') ? "text-white" : "text-white/90 hover:text-white")
							)}
						>
							Blog
						</Button>
					</Link>

					<Box
						className="relative"
						onMouseEnter={() => handleMouseEnter('resources')}
						onMouseLeave={handleMouseLeave}
					>
						<Button
							variant="ghost"
							className={cn(
								"px-6 py-4 text-xl font-semibold h-auto transition-colors",
								transparent && !scrolled ? "text-white/90 hover:text-white" : "text-white/90 hover:text-white"
							)}
						>
							Resources
						</Button>

						<AnimatePresence>
							{activeMenu === 'resources' && (
								<motion.div
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 4 }}
									transition={{ duration: 0.15 }}
									className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 w-80"
								>
									<div className="bg-gradient-to-br from-[#1e293b] to-[#334155] border border-white/10 rounded-xl shadow-2xl p-4 backdrop-blur-xl">
										<div className="space-y-2">
											{toolsItems.map((item, index) => (
												<Link
													key={index}
													to={item.to}
													className="group flex items-start p-3 rounded-lg transition-all duration-200 hover:bg-white/10"
												>
													<item.icon className="h-5 w-5 text-white/60 mt-0.5 mr-3 group-hover:text-white transition-colors" />
													<div>
														<h3 className="font-medium text-sm text-white mb-1 transition-colors">
															{item.label}
														</h3>
														<p className="text-xs text-white/70 leading-relaxed">
															{item.description}
														</p>
													</div>
												</Link>
											))}
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</Box>

					<Link to="/contact">
						<Button
							variant="ghost"
							className={cn(
								"px-6 py-4 text-xl font-semibold h-auto transition-colors",
								transparent && !scrolled 
									? (location.pathname === '/contact' ? "text-white" : "text-white/90 hover:text-white")
									: (location.pathname === '/contact' ? "text-white" : "text-white/90 hover:text-white")
							)}
						>
							Contact
						</Button>
					</Link>
				</Flex>
			</Box>
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
								className="rounded-full ring-2 ring-gray-200 hover:ring-gray-300 transition-all duration-200"
							>
								<CurrentUserAvatar />
							</motion.button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="w-56 p-2 shadow-lg border-gray-200 bg-white rounded-lg"
							sideOffset={8}
						>
							<DropdownMenuLabel className="px-2 py-1.5">
								<div className="flex flex-col space-y-1">
									<p className="text-sm font-semibold leading-none">
										{user?.name || user?.email?.split('@')[0] || 'User'}
									</p>
									<p className="text-xs text-gray-600 leading-none">
										{user?.email}
									</p>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild className="cursor-pointer">
								<Link
									to={context === 'authenticated' ? '/profile' : '/tenant-dashboard'}
									className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
								>
									<UserCircle className="h-4 w-4" />
									<span>Profile</span>
								</Link>
							</DropdownMenuItem>
							{context === 'authenticated' && (
								<DropdownMenuItem className="cursor-pointer">
									<div className="flex items-center gap-2 px-2 py-1.5">
										<Settings className="h-4 w-4" />
										<span>Settings</span>
									</div>
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={handleLogout}
								className="cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
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
			<Flex className="hidden lg:flex" align="center" gap="4" style={{ zIndex: 10 }}>
				<Link to="/auth/login">
					<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
						<Button
							variant="ghost"
							size="default"
							className={cn(
								"text-lg font-medium px-6 py-3 h-auto rounded-lg transition-all",
								transparent && !scrolled 
									? "text-white/80 hover:text-white hover:bg-white/10"
									: "text-white/80 hover:text-white hover:bg-white/10"
							)}
						>
							Log in
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
					className="lg:hidden p-2 hover:bg-gray-50 transition-all duration-200"
				>
					<Menu className="h-5 w-5" />
				</Button>
			) : null
		}

		return (
			<Button
				variant="ghost"
				size="icon"
				className="lg:hidden p-2 hover:bg-accent transition-all duration-200"
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
