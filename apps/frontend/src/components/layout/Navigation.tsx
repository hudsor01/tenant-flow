import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccessibility } from '@/hooks/use-accessibility'
import { Box, Flex, Container } from '@radix-ui/themes'
import { Button } from '@/components/ui/button'
import { CurrentUserAvatar } from '@/components/current-user-avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle
} from '@/components/ui/sheet'
import {
	Building,
	FileText,
	Calculator,
	Wrench,
	Menu,
	X,
	Settings,
	UserCircle,
	LogOut,
	ChevronDown
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
	const { announce } = useAccessibility()

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
			logger.error('Logout error', error as Error, { userId: user?.id || 'unknown' })
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
			className="flex items-center space-x-3 group focus:outline-none focus:ring-2 focus:ring-primary/20 focus:rounded-md"
			aria-label="TenantFlow home"
		>
			<motion.div
				className="relative"
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
			>
				<Building 
					className="h-7 w-7 text-primary transition-colors group-hover:text-primary/90" 
					aria-hidden="true"
				/>
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

	// Enhanced dropdown menus for public context with mobile support
	const [activeMenu, setActiveMenu] = useState<string | null>(null)
	const [isMobileResourcesOpen, setIsMobileResourcesOpen] = useState(false)
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

	const handleResourcesClick = () => {
		if (window.innerWidth < 1024) {
			setIsMobileResourcesOpen(true)
		} else {
			setActiveMenu(activeMenu === 'resources' ? null : 'resources')
		}
	}

	const handleKeyDown = (event: React.KeyboardEvent, menu: string) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			if (menu === 'resources') {
				handleResourcesClick()
				announce('Resources menu opened', 'polite')
			}
		}
		if (event.key === 'Escape') {
			event.preventDefault()
			setActiveMenu(null)
			setIsMobileResourcesOpen(false)
			announce('Menu closed', 'polite')
		}
		if (event.key === 'ArrowDown' && activeMenu === menu) {
			event.preventDefault()
			// Focus first menu item
			const firstItem = document.querySelector(`[data-menu="${menu}"] [role="menuitem"]`) as HTMLElement
			if (firstItem) firstItem.focus()
		}
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

		const ResourcesDropdown = () => (
			<Box
				className="relative"
				onMouseEnter={() => handleMouseEnter('resources')}
				onMouseLeave={handleMouseLeave}
			>
				<Button
					variant="ghost"
					onClick={handleResourcesClick}
					onKeyDown={(e) => handleKeyDown(e, 'resources')}
					className={cn(
						"px-0 py-2 text-base font-medium h-auto flex items-center gap-1",
						"text-muted-foreground hover:text-foreground transition-colors",
						"focus:outline-none focus:ring-2 focus:ring-primary/20 focus:rounded-md"
					)}
					aria-expanded={activeMenu === 'resources'}
					aria-haspopup="menu"
					aria-label="Resources menu"
				>
					Resources
					<ChevronDown className={cn(
						"h-4 w-4 transition-transform duration-200",
						activeMenu === 'resources' && "rotate-180"
					)} />
				</Button>

				<AnimatePresence>
					{activeMenu === 'resources' && (
						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 4 }}
							transition={{ duration: 0.15 }}
							className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 w-80"
							role="menu"
							aria-label="Resources submenu"
						>
							<div className="bg-background/98 backdrop-blur-xl border border-border/30 rounded-xl shadow-xl p-4">
								<div className="space-y-2">
									{toolsItems.map((item, index) => (
										<Link
											key={index}
											to={item.to}
											className="group flex items-start p-3 rounded-lg transition-all duration-200 hover:bg-accent/50 focus:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
											role="menuitem"
											tabIndex={0}
										>
											<item.icon 
												className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 group-hover:text-primary transition-colors" 
												aria-hidden="true"
											/>
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
		)

		return (
			<>
				<Box className="relative">
					<Flex className="hidden lg:flex items-center gap-8" align="center">
						<ResourcesDropdown />

						<Link to="/blog">
							<Button
								variant="ghost"
								className={cn(
									"px-0 py-2 text-base font-medium h-auto",
									location.pathname.startsWith('/blog')
										? "text-foreground"
										: "text-muted-foreground hover:text-foreground",
									"transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:rounded-md"
								)}
								aria-current={location.pathname.startsWith('/blog') ? 'page' : undefined}
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
									"transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:rounded-md"
								)}
								aria-current={location.pathname === '/pricing' ? 'page' : undefined}
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
									"transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:rounded-md"
								)}
								aria-current={location.pathname === '/about' ? 'page' : undefined}
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
									"transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:rounded-md"
								)}
								aria-current={location.pathname === '/contact' ? 'page' : undefined}
							>
								Contact
							</Button>
						</Link>
					</Flex>
				</Box>

				{/* Mobile Resources Sheet */}
				<Sheet open={isMobileResourcesOpen} onOpenChange={setIsMobileResourcesOpen}>
					<SheetContent side="right" className="w-full sm:w-96">
						<SheetHeader>
							<SheetTitle>Resources</SheetTitle>
						</SheetHeader>
						<div className="mt-6 space-y-4">
							{toolsItems.map((item, index) => (
								<Link
									key={index}
									to={item.to}
									className="group flex items-start p-4 rounded-lg transition-all duration-200 hover:bg-accent/50 focus:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20 border border-border/20"
									onClick={() => setIsMobileResourcesOpen(false)}
								>
									<item.icon 
										className="h-6 w-6 text-muted-foreground mt-0.5 mr-4 group-hover:text-primary transition-colors flex-shrink-0" 
										aria-hidden="true"
									/>
									<div className="flex-1">
										<h3 className="font-semibold text-base text-foreground mb-2 group-hover:text-primary transition-colors">
											{item.label}
										</h3>
										<p className="text-sm text-muted-foreground leading-relaxed">
											{item.description}
										</p>
									</div>
								</Link>
							))}
						</div>
					</SheetContent>
				</Sheet>
			</>
		)
	}




	const AuthSection = () => {
		const { isLoading } = useAuth()

		// Show loading skeletons during auth state loading
		if (isLoading) {
			if (context === 'authenticated' || context === 'tenant-portal') {
				return (
					<Flex align="center">
						<Skeleton className="h-10 w-10 rounded-full" />
					</Flex>
				)
			}
			return (
				<Flex className="hidden lg:flex" align="center" gap="4">
					<Skeleton className="h-10 w-20 rounded-lg" />
					<Skeleton className="h-10 w-32 rounded-lg" />
				</Flex>
			)
		}

		if (context === 'authenticated' || context === 'tenant-portal') {
			return (
				<Flex align="center">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary/30"
								aria-label={`User menu for ${user?.name || user?.email || 'User'}`}
								aria-haspopup="menu"
								aria-expanded="false"
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
									className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors focus:bg-accent focus:outline-none"
								>
									<UserCircle className="h-4 w-4" aria-hidden="true" />
									<span>Profile</span>
								</Link>
							</DropdownMenuItem>
							{context === 'authenticated' && (
								<DropdownMenuItem className="cursor-pointer">
									<button className="flex items-center gap-2 px-2 py-1.5 w-full text-left hover:bg-accent focus:bg-accent focus:outline-none rounded-md transition-colors">
										<Settings className="h-4 w-4" aria-hidden="true" />
										<span>Settings</span>
									</button>
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild className="cursor-pointer">
								<button
									onClick={handleLogout}
									className="flex items-center gap-2 px-2 py-1.5 w-full text-left text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none rounded-md transition-colors"
									aria-label="Sign out of your account"
								>
									<LogOut className="h-4 w-4" aria-hidden="true" />
									<span>Log out</span>
								</button>
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
							className="text-base font-medium px-6 py-2.5 h-auto rounded-lg border-border hover:border-border hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
							aria-label="Sign in to your account"
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
						<div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary opacity-60 group-hover:opacity-80 blur-sm transition-all duration-300 rounded-xl" aria-hidden="true"></div>
						<Button
							size="default"
							className="relative text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 px-8 py-3 h-auto rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
							aria-label="Start your free trial"
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
					className="lg:hidden p-2 hover:bg-accent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
					aria-label="Toggle navigation sidebar"
					aria-expanded="false"
				>
					<Menu className="h-5 w-5" aria-hidden="true" />
				</Button>
			) : null
		}

		return (
			<Button
				variant="ghost"
				size="icon"
				className="lg:hidden p-2 hover:bg-accent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
				onClick={() => {
					const newState = !isMobileMenuOpen
					setIsMobileMenuOpen(newState)
					announce(newState ? 'Navigation menu opened' : 'Navigation menu closed', 'polite')
				}}
				onKeyDown={(e) => {
					if (e.key === 'Escape' && isMobileMenuOpen) {
						setIsMobileMenuOpen(false)
						announce('Navigation menu closed', 'polite')
					}
				}}
				aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
				aria-expanded={isMobileMenuOpen}
				aria-controls="mobile-navigation-menu"
			>
				<motion.div
					animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
					transition={{ duration: 0.2 }}
				>
					{isMobileMenuOpen ? (
						<X className="h-5 w-5" aria-hidden="true" />
					) : (
						<Menu className="h-5 w-5" aria-hidden="true" />
					)}
				</motion.div>
			</Button>
		)
	}

	return (
		<nav 
			className={cn(getNavBarClasses(), className)}
			role="banner"
			aria-label="Main navigation"
		>
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
