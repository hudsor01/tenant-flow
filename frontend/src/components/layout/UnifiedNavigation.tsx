import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	Building,
	ChevronDown,
	FileText,
	Calculator,
	Menu,
	X,
	Home
} from 'lucide-react'

interface UnifiedNavigationProps {
	variant?: 'marketing' | 'blog' | 'dashboard'
	className?: string
}

/**
 * Unified Navigation Component
 * 
 * Provides consistent navigation experience across all pages
 * with context-aware styling based on Wave blog inspiration
 */
export function UnifiedNavigation({
	variant = 'marketing',
	className = ''
}: UnifiedNavigationProps) {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const [scrolled, setScrolled] = useState(false)
	const location = useLocation()

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 10)
		}
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	// Close mobile menu when route changes
	useEffect(() => {
		setIsMobileMenuOpen(false)
	}, [location])

	// Determine navbar style based on variant and scroll state
	const getNavbarClasses = () => {
		const base = "fixed top-0 right-0 left-0 z-[--z-fixed] transition-all duration-300"
		
		if (variant === 'marketing') {
			return `${base} ${scrolled ? 'nav-container' : 'bg-transparent'}`
		}
		
		return `${base} nav-container-solid`
	}

	// Logo component - consistent across all variants
	const Logo = () => (
		<Link to="/" className="flex items-center space-x-2 group">
			<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 transition-transform group-hover:scale-110">
				{variant === 'dashboard' ? (
					<Building className="h-5 w-5 text-white" />
				) : (
					<Home className="h-5 w-5 text-white" />
				)}
			</div>
			<span className="nav-brand">TenantFlow</span>
		</Link>
	)

	// Tools dropdown - consistent across marketing variants
	const ToolsDropdown = () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="nav-link flex items-center gap-1">
					Tools
					<ChevronDown className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-80 p-4" align="center">
				<DropdownMenuItem className="cursor-pointer rounded-lg p-0 focus:bg-transparent">
					<Link
						to="/lease-generator"
						className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-accent transition-colors"
					>
						<div className="rounded-lg bg-blue-500/10 p-2">
							<FileText className="h-5 w-5 text-blue-600" />
						</div>
						<div className="flex flex-col">
							<span className="font-semibold text-base">
								Lease Generator
							</span>
							<span className="text-muted-foreground text-sm">
								State-specific rental leases
							</span>
						</div>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem className="cursor-pointer rounded-lg p-0 focus:bg-transparent">
					<Link
						to="/invoice-generator"
						className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-accent transition-colors"
					>
						<div className="rounded-lg bg-green-500/10 p-2">
							<Calculator className="h-5 w-5 text-green-600" />
						</div>
						<div className="flex flex-col">
							<span className="font-semibold text-base">
								Invoice Generator
							</span>
							<span className="text-muted-foreground text-sm">
								Professional invoice templates
							</span>
						</div>
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)

	// Navigation links based on variant
	const NavigationLinks = () => {
		if (variant === 'dashboard') {
			return (
				<div className="hidden items-center space-nav-item md:flex">
					<Link to="/blog" className="nav-link">
						Blog
					</Link>
					<Link to="/pricing" className="nav-link">
						Pricing
					</Link>
				</div>
			)
		}

		return (
			<div className="hidden items-center space-nav-item md:flex">
				<ToolsDropdown />
				<Link 
					to="/blog" 
					className={`nav-link ${location.pathname.startsWith('/blog') ? 'nav-link-active' : ''}`}
				>
					Blog
				</Link>
				<Link 
					to="/pricing"
					className={`nav-link ${location.pathname === '/pricing' ? 'nav-link-active' : ''}`}
				>
					Pricing
				</Link>
			</div>
		)
	}

	// Auth buttons - consistent styling
	const AuthButtons = () => (
		<div className="hidden items-center space-x-4 lg:flex">
			<Link to="/auth/login">
				<Button variant="ghost" className="nav-link">
					Sign In
				</Button>
			</Link>
			<Link to="/auth/signup">
				<button className="nav-cta">
					Get Started Free
				</button>
			</Link>
		</div>
	)

	// Mobile menu
	const MobileMenu = () => (
		<div className="lg:hidden border-t mt-4 pt-4 pb-4 bg-card/95 backdrop-blur-md rounded-lg mx-4">
			<div className="space-y-2">
				<Link
					to="/lease-generator"
					className="block px-3 py-2 text-base font-medium nav-link"
				>
					Lease Generator
				</Link>
				<Link
					to="/invoice-generator"
					className="block px-3 py-2 text-base font-medium nav-link"
				>
					Invoice Generator
				</Link>
				<Link
					to="/blog"
					className="block px-3 py-2 text-base font-medium nav-link"
				>
					Blog
				</Link>
				<Link
					to="/pricing"
					className="block px-3 py-2 text-base font-medium nav-link"
				>
					Pricing
				</Link>
				
				<div className="border-t pt-4 mt-4">
					<Link
						to="/auth/login"
						className="block px-3 py-2 text-base font-medium nav-link"
					>
						Sign In
					</Link>
					<Link to="/auth/signup" className="block mt-2">
						<button className="nav-cta w-full">
							Get Started Free
						</button>
					</Link>
				</div>
			</div>
		</div>
	)

	return (
		<div className={variant === 'blog' ? 'min-h-screen bg-white' : ''}>
			<nav className={`${getNavbarClasses()} ${className}`}>
				<div className="container mx-auto space-nav">
					<div className="flex h-full items-center justify-between">
						<Logo />
						<NavigationLinks />
						<AuthButtons />

						{/* Mobile Menu Button */}
						<button
							className="lg:hidden p-2 rounded-md nav-link transition-colors"
							onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						>
							{isMobileMenuOpen ? (
								<X className="h-6 w-6" />
							) : (
								<Menu className="h-6 w-6" />
							)}
						</button>
					</div>

					{/* Mobile Menu */}
					{isMobileMenuOpen && <MobileMenu />}
				</div>
			</nav>
		</div>
	)
}