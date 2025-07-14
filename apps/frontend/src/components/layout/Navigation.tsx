import { useState, useEffect } from 'react'
// Temporary workaround for missing route types
const leaseGeneratorRoute = "/tools/lease-generator" as unknown as Parameters<typeof Link>[0]["to"];
const invoicesRoute = "/_authenticated/invoices" as unknown as Parameters<typeof Link>[0]["to"];
import { motion, AnimatePresence } from 'framer-motion'
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
	ChevronDown,
	FileText,
	Calculator,
	Menu,
	X,
	Home,
	BookOpen,
	Settings,
	UserCircle,
	LogOut,
	Sparkles
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { Link, useLocation } from '@tanstack/react-router'

interface NavigationProps {
	variant?: 'authenticated' | 'public'
	transparent?: boolean
	className?: string
	onSidebarToggle?: () => void
	isSidebarOpen?: boolean
}

export function Navigation({
	variant = 'public',
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
		const baseClasses = 'sticky top-0 z-50 transition-all duration-300'

		if (variant === 'authenticated') {
			return cn(
				baseClasses,
				'bg-background/95 border-b border-border/50 backdrop-blur-lg shadow-xs'
			)
		}

		// Public navigation
		if (transparent && !scrolled) {
			return cn(baseClasses, 'bg-transparent')
		}

		return cn(
			baseClasses,
			'bg-background/95 border-b border-border/50 backdrop-blur-lg shadow-xs'
		)
	}

	const LogoSection = () => (
		<Link
			to={variant === 'authenticated' ? '/dashboard' : '/'}
			className="flex items-center space-x-3 group"
		>
			<motion.div
				className="relative"
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
			>
				<div className="relative">
					<Building className="h-8 w-8 text-primary" />
					{variant === 'authenticated' && (
						<motion.div
							className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"
							animate={{ scale: [1, 1.2, 1] }}
							transition={{ repeat: Infinity, duration: 2 }}
						>
							<Sparkles className="w-2 h-2 text-white absolute top-0.5 left-0.5" />
						</motion.div>
					)}
				</div>
			</motion.div>
			<motion.div
				className="flex flex-col"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
					TenantFlow
				</span>
				{variant === 'authenticated' && (
					<span className="text-xs text-muted-foreground font-medium">
						Property Management
					</span>
				)}
			</motion.div>
		</Link>
	)

	const ToolsDropdown = () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 px-3 py-2 rounded-md"
				>
					Tools
					<motion.div
						animate={{ rotate: 0 }}
						whileHover={{ rotate: 180 }}
						transition={{ duration: 0.2 }}
					>
						<ChevronDown className="h-4 w-4" />
					</motion.div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent 
				className="w-72 p-3 mt-2 border border-border/50 shadow-lg bg-card/95 backdrop-blur-sm" 
				align="center"
				sideOffset={8}
			>
				<div className="space-y-1">
					<DropdownMenuItem className="cursor-pointer rounded-lg p-0 focus:bg-transparent border-0">
						<Link
							to={leaseGeneratorRoute}
							className="flex items-center gap-3 px-3 py-3 w-full rounded-lg hover:bg-accent/80 transition-all duration-200 group"
						>
							<div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 p-2.5 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
								<FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							</div>
							<div className="flex flex-col">
								<span className="font-semibold text-foreground">Lease Generator</span>
								<span className="text-muted-foreground text-sm leading-relaxed">
									State-specific rental leases
								</span>
							</div>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem className="cursor-pointer rounded-lg p-0 focus:bg-transparent border-0">
						<Link
							to={invoicesRoute}
							className="flex items-center gap-3 px-3 py-3 w-full rounded-lg hover:bg-accent/80 transition-all duration-200 group"
						>
							<div className="rounded-lg bg-green-50 dark:bg-green-500/10 p-2.5 group-hover:bg-green-100 dark:group-hover:bg-green-500/20 transition-colors">
								<Calculator className="h-5 w-5 text-green-600 dark:text-green-400" />
							</div>
							<div className="flex flex-col">
								<span className="font-semibold text-foreground">Invoice Generator</span>
								<span className="text-muted-foreground text-sm leading-relaxed">
									Professional invoice templates
								</span>
							</div>
						</Link>
					</DropdownMenuItem>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	)

	const NavigationLinks = () => {
		const links = [
			{ to: '/', label: 'Home', show: variant === 'public' && location.pathname !== '/' },
			{ to: '/blog', label: 'Blog', show: true, icon: BookOpen },
			{ to: '/pricing', label: 'Pricing', show: true }
		]

		return (
			<div className="hidden md:flex items-center space-x-1">
				{links.map(({ to, label, show, icon: Icon }) => {
					if (!show) return null

					const isActive = location.pathname === to

					return (
						<Link key={to} to={to}>
							<Button
								variant="ghost"
								className={cn(
									"font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 px-3 py-2 rounded-md relative group",
									isActive && "text-primary bg-primary/10 hover:text-primary hover:bg-primary/10"
								)}
							>
								<div className="flex items-center gap-2">
									{Icon && <Icon className="w-4 h-4" />}
									{label}
								</div>
								{isActive && (
									<motion.div
										className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
										layoutId="activeIndicator"
									/>
								)}
							</Button>
						</Link>
					)
				})}

				{variant === 'public' && <ToolsDropdown />}
			</div>
		)
	}

	const AuthSection = () => {
		if (variant === 'authenticated') {
			return (
				<div className="flex items-center space-x-4">
					{/* Sidebar Toggle for authenticated users */}
					{onSidebarToggle && (
						<Button
							variant="ghost"
							size="icon"
							onClick={onSidebarToggle}
							className="md:hidden hover:bg-primary/10 hover:text-primary transition-all duration-200"
						>
							<Menu className="h-5 w-5" />
						</Button>
					)}

					{/* User Menu */}
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
							className="w-64 p-2 shadow-xl border-border/50"
						>
							<DropdownMenuLabel className="px-3 py-2">
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
									to="/dashboard"
									className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
								>
									<UserCircle className="h-4 w-4" />
									<span>Profile</span>
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem className="cursor-pointer">
								<div className="flex items-center gap-2 px-3 py-2">
									<Settings className="h-4 w-4" />
									<span>Settings</span>
								</div>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={handleLogout}
								className="cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
							>
								<div className="flex items-center gap-2 px-3 py-2">
									<LogOut className="h-4 w-4" />
									<span>Log out</span>
								</div>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)
		}

		// Public auth buttons
		return (
			<div className="hidden md:flex items-center space-x-3">
				<Link to="/auth/login">
					<Button
						variant="ghost"
						className="font-medium hover:bg-primary/10 hover:text-primary transition-all duration-200"
					>
						Sign In
					</Button>
				</Link>
				<Link to="/auth/Signup">
					<Button className="font-semibold shadow-xs hover:shadow-md transition-all duration-200">
						Get Started Free
					</Button>
				</Link>
			</div>
		)
	}

	const MobileMenu = () => (
		<AnimatePresence>
			{isMobileMenuOpen && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					exit={{ opacity: 0, height: 0 }}
					transition={{ duration: 0.2 }}
					className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg"
				>
					<div className="container mx-auto px-4 py-4 space-y-2">
						{/* Navigation Links */}
						{variant === 'public' && location.pathname !== '/' && (
							<Link to="/" className="block">
								<Button
									variant="ghost"
									className="w-full justify-start font-medium"
								>
									<Home className="w-4 h-4 mr-2" />
									Home
								</Button>
							</Link>
						)}

						<Link to="/blog" className="block">
							<Button
								variant="ghost"
								className="w-full justify-start font-medium"
							>
								<BookOpen className="w-4 h-4 mr-2" />
								Blog
							</Button>
						</Link>

						<Link to="/pricing" className="block">
							<Button
								variant="ghost"
								className="w-full justify-start font-medium"
							>
								Pricing
							</Button>
						</Link>

						{variant === 'public' && (
							<>
								<div className="pt-2 border-t border-border/50">
									<p className="text-sm font-semibold text-muted-foreground mb-2 px-3">
										Tools
									</p>
									<Link to={leaseGeneratorRoute} className="block">
										<Button
											variant="ghost"
											className="w-full justify-start font-medium"
										>
											<FileText className="w-4 h-4 mr-2" />
											Lease Generator
										</Button>
									</Link>
									<Link to={invoicesRoute} className="block">
										<Button
											variant="ghost"
											className="w-full justify-start font-medium"
										>
											<Calculator className="w-4 h-4 mr-2" />
											Invoice Generator
										</Button>
									</Link>
								</div>

								<div className="pt-2 border-t border-border/50 space-y-2">
									<Link to="/auth/login" className="block">
										<Button
											variant="outline"
											className="w-full font-medium"
										>
											Sign In
										</Button>
									</Link>
									<Link to="/auth/Signup" className="block">
										<Button className="w-full font-semibold">
											Get Started Free
										</Button>
									</Link>
								</div>
							</>
						)}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)

	return (
		<nav className={cn(getNavBarClasses(), className)}>
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 sm:h-20 items-center justify-between">
					{/* Logo Section */}
					<LogoSection />

					{/* Navigation Links - Desktop */}
					<NavigationLinks />

					{/* Auth Section */}
					<AuthSection />

					{/* Mobile Menu Button */}
					<Button
						variant="ghost"
						size="icon"
						className="md:hidden hover:bg-primary/10 hover:text-primary transition-all duration-200"
						onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
					>
						{isMobileMenuOpen ? (
							<X className="h-5 w-5" />
						) : (
							<Menu className="h-5 w-5" />
						)}
					</Button>
				</div>
			</div>

			{/* Mobile Menu */}
			<MobileMenu />
		</nav>
	)
}
