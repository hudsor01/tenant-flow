import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Box, Flex, Container } from '@radix-ui/themes'
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
import { useAuth } from '@/hooks/useApiAuth'
import { logger } from '@/lib/logger'
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

	const handleLogout = async (): Promise<void> => {
		try {
			await logout()
		} catch (error) {
			logger.error('Logout error', error as Error, { userId: user?.id })
		}
	}

	const getNavBarClasses = () => {
		const baseClasses = 'sticky top-0 z-50 transition-all duration-300 border-b h-16'

		if (transparent && !scrolled && context === 'public') {
			return cn(baseClasses, 'bg-transparent border-transparent')
		}

		return cn(
			baseClasses,
			'bg-background/95 border-border/40 backdrop-blur-lg'
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
				<Building className="h-7 w-7 text-primary transition-colors group-hover:text-primary/90" />
			</motion.div>
			<motion.div
				className="flex flex-col"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<span className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
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
				<Flex className="hidden lg:flex items-center gap-8" align="center">
					<Box
						className="relative"
						onMouseEnter={() => handleMouseEnter('resources')}
						onMouseLeave={handleMouseLeave}
					>
						<Button
							variant="ghost"
							className={cn(
								"px-0 py-2 text-base font-medium h-auto",
								"text-muted-foreground hover:text-foreground transition-colors"
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
									<div className="bg-background/98 backdrop-blur-xl border border-border/30 rounded-xl shadow-xl p-4">
										<div className="space-y-2">
											{toolsItems.map((item, index) => (
												<Link
													key={index}
													to={item.to}
													className="group flex items-start p-3 rounded-lg transition-all duration-200 hover:bg-accent/50"
												>
													<item.icon className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 group-hover:text-primary transition-colors" />
													<div>
														<h3 className="font-medium text-sm text-foreground mb-1 group-hover:text-primary transition-colors">
															{item.label}
														</h3>
														<p className="text-xs text-muted-foreground leading-relaxed">
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

					<Link to="/blog">
						<Button
							variant="ghost"
							className={cn(
								"px-0 py-2 text-base font-medium h-auto",
								location.pathname.startsWith('/blog')
									? "text-foreground"
									: "text-muted-foreground hover:text-foreground",
								"transition-colors"
							)}
						>
							Blog
						</Button>
					</Link>

					<Link to="/pricing">
						<Button
							variant="ghost"
							className={cn(
								"px-0 py-2 text-base font-medium h-auto",
								location.pathname === '/pricing'
									? "text-foreground"
									: "text-muted-foreground hover:text-foreground",
								"transition-colors"
							)}
						>
							Pricing
						</Button>
					</Link>

					<Link to="/about">
						<Button
							variant="ghost"
							className={cn(
								"px-0 py-2 text-base font-medium h-auto",
								location.pathname === '/about'
									? "text-foreground"
									: "text-muted-foreground hover:text-foreground",
								"transition-colors"
							)}
						>
							About
						</Button>
					</Link>

					<Link to="/contact">
						<Button
							variant="ghost"
							className={cn(
								"px-0 py-2 text-base font-medium h-auto",
								location.pathname === '/contact'
									? "text-foreground"
									: "text-muted-foreground hover:text-foreground",
								"transition-colors"
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
								className="rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-200"
							>
								<CurrentUserAvatar />
							</motion.button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="w-56 p-2 shadow-lg border-border/30 bg-background/98 backdrop-blur-xl rounded-lg"
							sideOffset={8}
						>
							<DropdownMenuLabel className="px-2 py-1.5">
								<div className="flex flex-col space-y-1">
									<p className="text-sm font-semibold leading-none">
										{user?.name || user?.email?.split('@')[0] || 'User'}
									</p>
									<p className="text-xs text-muted-foreground leading-none">
										{user?.email}
									</p>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild className="cursor-pointer">
								<Link
									to={context === 'authenticated' ? '/profile' : '/tenant-dashboard'}
									className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
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
							variant="outline"
							size="default"
							className="text-base font-medium px-6 py-2.5 h-auto rounded-lg border-border hover:border-border hover:bg-muted"
						>
							Log in
						</Button>
					</motion.div>
				</Link>
				<Link to="/auth/signup">
					<motion.div
						whileHover={{ scale: 1.05, y: -2 }}
						whileTap={{ scale: 0.98 }}
						className="relative group"
					>
						<div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary opacity-60 group-hover:opacity-80 blur-sm transition-all duration-300 rounded-xl"></div>
						<Button
							size="default"
							className="relative text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 px-8 py-3 h-auto rounded-lg shadow-md hover:shadow-lg"
						>
							Get started free
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
					className="lg:hidden p-2 hover:bg-accent transition-all duration-200"
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
			<Container size="4" style={{ padding: '0 1rem' }}>
				<Flex className="h-16" align="center" justify="between">
					<LogoSection />
					<PublicNavigation />
					<AuthSection />
					<MobileMenuButton />
				</Flex>
			</Container>
		</nav>
	)
}
