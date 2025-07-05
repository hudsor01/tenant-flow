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

interface PublicNavigationProps {
	variant?: 'landing' | 'pricing' | 'blog' | 'tools'
	showBreadcrumbs?: boolean
	className?: string
}

export function PublicNavigation({
	variant = 'landing',
	showBreadcrumbs = false,
	className = ''
}: PublicNavigationProps) {
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

	const getNavBarClasses = () => {
		switch (variant) {
			case 'landing':
				return `fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
					scrolled
						? 'bg-background/80 border-border/40 border-b shadow-sm backdrop-blur-md'
						: 'bg-transparent'
				}`
			case 'blog':
				return 'sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md'
			case 'pricing':
			case 'tools':
			default:
				return 'bg-card/50 sticky top-0 z-40 border-b backdrop-blur-sm'
		}
	}

	const getLogoClasses = () => {
		switch (variant) {
			case 'blog':
				return 'text-xl font-semibold text-gray-900'
			case 'landing':
				return 'from-foreground to-foreground/60 bg-gradient-to-r bg-clip-text text-2xl font-bold text-transparent'
			default:
				return 'text-xl font-bold'
		}
	}

	const getLogoIcon = () => {
		switch (variant) {
			case 'blog':
				return (
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
						<Home className="h-5 w-5 text-white" />
					</div>
				)
			default:
				return <Building className="text-primary h-8 w-8" />
		}
	}

	const getContainerBg = () => {
		switch (variant) {
			case 'blog':
				return 'min-h-screen bg-white'
			case 'pricing':
			case 'tools':
				return 'from-background via-background to-primary/5 min-h-screen bg-gradient-to-br'
			default:
				return ''
		}
	}

	const shouldShowToolsDropdown = variant === 'landing' || variant === 'blog'
	const shouldShowAllNavItems = variant === 'landing' || variant === 'blog'

	return (
		<div className={getContainerBg()}>
			<nav className={`${getNavBarClasses()} ${className}`}>
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex h-20 items-center justify-between">
						{/* Logo */}
						<Link to="/" className="flex items-center space-x-2 group">
							{getLogoIcon()}
							<span className={getLogoClasses()}>TenantFlow</span>
						</Link>

						{/* Desktop Navigation - Centered for landing, left-aligned for others */}
						<div
							className={`${
								variant === 'landing'
									? 'absolute left-1/2 hidden -translate-x-1/2 transform items-center space-x-8 lg:flex'
									: 'hidden items-center space-x-1 md:flex'
							}`}
						>
							{/* Home link for non-landing pages */}
							{variant !== 'landing' && (
								<Link to="/">
									<Button
										variant="ghost"
										className={
											variant === 'blog'
												? 'text-gray-600 hover:text-gray-900'
												: ''
										}
									>
										Home
									</Button>
								</Link>
							)}

							{/* Tools Dropdown */}
							{shouldShowToolsDropdown && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											className={`${
												variant === 'landing'
													? 'text-muted-foreground hover:text-foreground group relative px-3 py-2 text-lg font-medium transition-all duration-200'
													: variant === 'blog'
														? 'text-gray-600 hover:text-gray-900'
														: ''
											} flex items-center gap-1`}
										>
											Tools
											<ChevronDown className="h-4 w-4" />
											{variant === 'landing' && (
												<span className="bg-primary absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-200 group-hover:w-full"></span>
											)}
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent className="w-80 p-4" align="center">
										<DropdownMenuItem className="cursor-pointer rounded-lg p-0 focus:bg-transparent">
											<Link
												to="/lease-generator"
												className="flex items-center gap-3 px-4 py-3 w-full"
											>
												<div className="rounded-lg bg-blue-500/10 p-2">
													<FileText className="h-5 w-5 text-blue-600" />
												</div>
												<div className="flex flex-col">
													<span className="text-lg font-semibold">
														Lease Generator
													</span>
													<span className="text-muted-foreground text-base">
														State-specific rental leases
													</span>
												</div>
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem className="cursor-pointer rounded-lg p-0 focus:bg-transparent">
											<Link
												to="/invoice-generator"
												className="flex items-center gap-3 px-4 py-3 w-full"
											>
												<div className="rounded-lg bg-green-500/10 p-2">
													<Calculator className="h-5 w-5 text-green-600" />
												</div>
												<div className="flex flex-col">
													<span className="text-lg font-semibold">
														Invoice Generator
													</span>
													<span className="text-muted-foreground text-base">
														Professional invoice templates
													</span>
												</div>
											</Link>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							)}

							{/* Blog Link */}
							{shouldShowAllNavItems && (
								<Link
									to="/blog"
									className={
										variant === 'landing'
											? 'text-muted-foreground hover:text-foreground group relative px-3 py-2 text-lg font-medium transition-all duration-200'
											: variant === 'blog'
												? 'text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium'
												: 'text-gray-600 hover:text-gray-900'
									}
								>
									Blog
									{variant === 'landing' && (
										<span className="bg-primary absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-200 group-hover:w-full"></span>
									)}
								</Link>
							)}

							{/* Pricing Link */}
							<Link
								to="/pricing"
								className={
									variant === 'landing'
										? 'text-muted-foreground hover:text-foreground group relative px-3 py-2 text-lg font-medium transition-all duration-200'
										: variant === 'blog'
											? 'text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium'
											: ''
								}
							>
								{variant === 'landing' || variant === 'blog' ? (
									<>
										Pricing
										{variant === 'landing' && (
											<span className="bg-primary absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-200 group-hover:w-full"></span>
										)}
									</>
								) : (
									<Button variant="ghost">Pricing</Button>
								)}
							</Link>
						</div>

						{/* Auth Buttons - Right Side */}
						<div className="hidden items-center space-x-4 lg:flex">
							<Link to="/auth/login">
								<Button
									variant="ghost"
									className={
										variant === 'landing'
											? 'hover:bg-primary/10 px-6 py-3 text-lg font-medium'
											: variant === 'blog'
												? 'text-gray-600 hover:text-gray-900'
												: ''
									}
								>
									Sign In
								</Button>
							</Link>
							<Link to="/auth/signup">
								<Button
									className={
										variant === 'landing'
											? 'bg-primary hover:bg-primary/90 flex transform items-center justify-center px-8 py-3 text-lg font-semibold shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl'
											: variant === 'blog'
												? 'bg-blue-600 hover:bg-blue-700 text-white'
												: ''
									}
								>
									{variant === 'landing' ? 'Start Free Trial' : 'Get Started Free'}
								</Button>
							</Link>
						</div>

						{/* Mobile Menu Button */}
						<button
							className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
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
					{isMobileMenuOpen && (
						<div className="lg:hidden border-t mt-4 pt-4 pb-4">
							<div className="space-y-2">
								{variant !== 'landing' && (
									<Link
										to="/"
										className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900"
									>
										Home
									</Link>
								)}
								
								<Link
									to="/lease-generator"
									className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900"
								>
									Lease Generator
								</Link>
								
								<Link
									to="/invoice-generator"
									className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900"
								>
									Invoice Generator
								</Link>
								
								{shouldShowAllNavItems && (
									<Link
										to="/blog"
										className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900"
									>
										Blog
									</Link>
								)}
								
								<Link
									to="/pricing"
									className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900"
								>
									Pricing
								</Link>
								
								<div className="border-t pt-4 mt-4">
									<Link
										to="/auth/login"
										className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900"
									>
										Sign In
									</Link>
									<Link to="/auth/signup">
										<Button className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white">
											Get Started Free
										</Button>
									</Link>
								</div>
							</div>
						</div>
					)}
				</div>
			</nav>
		</div>
	)
}