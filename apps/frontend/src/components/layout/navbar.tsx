'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '#components/ui/sheet'
import { useSignOut } from '#hooks/api/use-auth'
import { cn } from '#lib/utils'
import { useAuth } from '#providers/auth-provider'
import { useSpring, useTransition } from '@react-spring/core'
import { animated } from '@react-spring/web'
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

interface NavItem {
	name: string
	href: string
	hasDropdown?: boolean
	dropdownItems?: { name: string; href: string; description?: string }[]
}

interface NavbarProps extends React.ComponentProps<'nav'> {
	logo?: string
	navItems?: NavItem[]
	ctaText?: string
	ctaHref?: string
}

export const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
	(
		{
			className,
			logo = 'TenantFlow',
			navItems = [
				{ name: 'Features', href: '/features' },
				{ name: 'Pricing', href: '/pricing' },
				{ name: 'About', href: '/about' },
				{
					name: 'Resources',
					href: '#',
					hasDropdown: true,
					dropdownItems: [
						{ name: 'Help Center', href: '/help' },
						{ name: 'Blog', href: '/blog' },
						{ name: 'FAQ', href: '/faq' },
						{ name: 'Contact', href: '/contact' }
					]
				}
			],
			ctaText = 'Get Started',
			ctaHref = '/pricing',
			...props
		},
		ref
	) => {
		const [isOpen, setIsOpen] = useState(false)
		const [openDropdown, setOpenDropdown] = useState<string | null>(null)
		const [isScrolled, setIsScrolled] = useState(false)
		const [logoHover, setLogoHover] = useState(false)
		const [ctaHover, setCtaHover] = useState(false)
		const [ctaTap, setCtaTap] = useState(false)
		const [mobileButtonTap, setMobileButtonTap] = useState(false)
		const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null)
		const [hoveredDropdownItem, setHoveredDropdownItem] = useState<
			string | null
		>(null)
		const [hoveredMobileItem, setHoveredMobileItem] = useState<string | null>(
			null
		)
		const [isMounted, setIsMounted] = useState(false)
		const [scrollProgress, setScrollProgress] = useState(0)

		// Get current pathname for active link indicator
		const pathname = usePathname()

		// Auth state - now includes user directly from improved auth context
		const { isAuthenticated, isLoading, user } = useAuth()

		// Use improved sign out mutation with React Query benefits
		const signOutMutation = useSignOut()

		// Prevent hydration mismatch by only rendering auth content after mount
		useEffect(() => {
			queueMicrotask(() => setIsMounted(true))
		}, [])

		// Dynamic navigation based on auth state
		const getNavItems = () => {
			if (isAuthenticated) {
				return [
					{ name: 'Dashboard', href: '/manage' },
				{ name: 'Properties', href: '/manage/properties' },
				{ name: 'Analytics', href: '/manage/analytics' },
				{
					name: 'More',
					href: '#',
					hasDropdown: true,
					dropdownItems: [
						{ name: 'Leases', href: '/manage/leases' },
						{ name: 'Maintenance', href: '/manage/maintenance' },
						{ name: 'Reports', href: '/manage/reports' },
						{ name: 'Settings', href: '/manage/settings' }
					]
				}
				]
			}
			return navItems
		}

		const currentNavItems = isMounted ? getNavItems() : navItems

		useEffect(() => {
			const handleScroll = () => {
				setIsScrolled(window.scrollY > 20)

				// Calculate scroll progress
				const windowHeight = window.innerHeight
				const documentHeight = document.documentElement.scrollHeight
				const scrollTop = window.scrollY
				const scrollableHeight = documentHeight - windowHeight
				const progress = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0
				setScrollProgress(progress)
			}

			window.addEventListener('scroll', handleScroll)
			return () => window.removeEventListener('scroll', handleScroll)
		}, [])

		const toggleMobileMenu = () => {
			setIsOpen(!isOpen)
		}

		const handleDropdownToggle = (itemName: string) => {
			setOpenDropdown(openDropdown === itemName ? null : itemName)
		}

		const handleKeyDown = (
			event: React.KeyboardEvent,
			item: NavItem,
			dropdownIndex?: number
		) => {
			if (!item.hasDropdown || !item.dropdownItems) return

			const currentIndex = dropdownIndex ?? -1
			const maxIndex = item.dropdownItems.length - 1

			switch (event.key) {
				case 'Escape':
					setOpenDropdown(null)
					event.preventDefault()
					break
				case 'ArrowDown':
					event.preventDefault()
					if (openDropdown !== item.name) {
						setOpenDropdown(item.name)
					} else if (currentIndex < maxIndex) {
						// Focus next item
						const nextIndex = currentIndex + 1
						const nextEl = document.querySelector(
							`[data-dropdown-item="${item.name}-${nextIndex}"]`
						) as HTMLElement
						nextEl?.focus()
					}
					break
				case 'ArrowUp':
					event.preventDefault()
					if (currentIndex > 0) {
						// Focus previous item
						const prevIndex = currentIndex - 1
						const prevEl = document.querySelector(
							`[data-dropdown-item="${item.name}-${prevIndex}"]`
						) as HTMLElement
						prevEl?.focus()
					} else {
						setOpenDropdown(null)
					}
					break
				case 'Enter':
					if (openDropdown === item.name && currentIndex === -1) {
						event.preventDefault()
						setOpenDropdown(null)
					}
					break
			}
		}

		const handleSignOut = () => {
			// Use improved sign out with React Query mutation benefits
			signOutMutation.mutate(undefined, {
				onSettled: () => {
					setIsOpen(false)
				}
			})
		}

		// React Spring animations
		const navbarSpring = useSpring({
			y: 0,
			from: { y: 0 },
			config: { mass: 1, tension: 120, friction: 14 }
		})

		const logoSpring = useSpring({
			scale: logoHover ? 1.05 : 1,
			config: { mass: 1, tension: 180, friction: 12 }
		})

		const ctaSpring = useSpring({
			scale: ctaTap ? 0.95 : ctaHover ? 1.05 : 1,
			config: { mass: 1, tension: 180, friction: 12 }
		})

		const mobileButtonSpring = useSpring({
			scale: mobileButtonTap ? 0.95 : 1,
			config: { mass: 1, tension: 180, friction: 12 }
		})

		// Dropdown transitions
		const dropdownTransitions = useTransition(openDropdown, {
			from: { opacity: 0, y: 10, scale: 0.95 },
			enter: { opacity: 1, y: 0, scale: 1 },
			leave: { opacity: 0, y: 10, scale: 0.95 },
			config: { mass: 1, tension: 120, friction: 14 }
		})

		// Check if nav item is active
		const isActiveLink = (href: string) => {
			if (href === '/') return pathname === '/'
			return pathname === href || pathname.startsWith(`${href}/`)
		}

		// Simple hover animation styles (using CSS transitions instead of hooks-in-callbacks)
		const getNavItemStyle = (itemName: string) => ({
			transform: hoveredNavItem === itemName ? `scale(var(--scale-hover))` : 'scale(1)',
			transition: `transform var(--duration-200) var(--ease-out)`
		})

		// Dropdown item hover styles
		const getDropdownItemStyle = (itemName: string) => ({
			transform:
				hoveredDropdownItem === itemName ? `translateX(var(--translate-hover-x))` : 'translateX(0)',
			transition: `transform var(--duration-200) var(--ease-out)`
		})

		// Mobile item hover styles
		const getMobileItemStyle = (itemName: string) => ({
			transform:
				hoveredMobileItem === itemName ? `translateX(var(--translate-hover-x))` : 'translateX(0)',
			transition: `transform var(--duration-200) var(--ease-out)`
		})

		return (
			<animated.nav
				data-site-navbar
				ref={ref}
				style={navbarSpring}
				className={cn(
					'fixed left-1/2 transform translate-x-[-50%] z-50 transition-all duration-300 rounded-(--radius-medium) px-6 py-3 w-auto',
				isScrolled
					? 'top-2 bg-card backdrop-blur-2xl shadow-2xl border border-fill-secondary/30 scale-[0.98]'
					: 'top-4 bg-card/90 backdrop-blur-xl shadow-lg border border-fill-secondary/20',
					'hover:bg-card hover:shadow-xl',
					className
				)}
			{...props}
		>
			{/* Scroll Progress Bar */}
			<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[--color-fill-secondary] rounded-full overflow-hidden">
				<div
					className="h-full bg-[--color-accent-main] transition-all duration-150 ease-out"
					style={{ width: `${scrollProgress}%` }}
				/>
			</div>				<div className="flex items-center justify-between">
					{/* Logo */}
					<animated.div
						style={logoSpring}
						onMouseEnter={() => setLogoHover(true)}
						onMouseLeave={() => setLogoHover(false)}
						className="flex items-center space-x-2"
					>
						<div className="size-11 rounded-lg overflow-hidden bg-background border border-border flex items-center justify-center">
							<Image
								src="/tenant-flow-logo.png"
								alt="TenantFlow"
								width={24}
								height={24}
								className="size-6 object-contain"
								priority
							/>
						</div>
						<span className="text-xl font-bold text-foreground">{logo}</span>
					</animated.div>

					{/* Desktop Navigation */}
					<div className="hidden md:flex items-center space-x-1">
						{currentNavItems.map(item => (
							<div
								key={item.name}
								className="relative"
								onMouseEnter={() => {
									if (item.hasDropdown) setOpenDropdown(item.name)
									setHoveredNavItem(item.name)
								}}
								onMouseLeave={() => {
									if (item.hasDropdown) setOpenDropdown(null)
									setHoveredNavItem(null)
								}}
							>
								<animated.div style={getNavItemStyle(item.name)}>
								<Link
									href={item.href}
									onKeyDown={e => handleKeyDown(e, item)}
									className={cn(
										'relative flex items-center px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-muted/50 transition-all duration-200',
										isActiveLink(item.href) &&
											'text-foreground after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-[--color-accent-main] after:animate-in after:slide-in-from-bottom-1'
									)}
								>
									{item.name}
									{item.hasDropdown && (
										<ChevronDown className="ml-1 size-4 transition-transform duration-200" />
									)}
								</Link>
								</animated.div>

								{/* Professional Dropdown */}
								{item.hasDropdown &&
									dropdownTransitions((style, dropdownName) =>
										dropdownName === item.name ? (
											<animated.div
												style={style}
												className="absolute top-full left-0 mt-2 w-56 bg-background/98 backdrop-blur-lg rounded-xl shadow-xl border border-border/50 py-2"
											>
												{item.dropdownItems?.map((dropdownItem, index) => (
													<animated.div
														key={dropdownItem.name}
														style={getDropdownItemStyle(dropdownItem.name)}
														onMouseEnter={() =>
															setHoveredDropdownItem(dropdownItem.name)
														}
														onMouseLeave={() => setHoveredDropdownItem(null)}
													>
														<Link
															href={dropdownItem.href}
															data-dropdown-item={`${item.name}-${index}`}
															onKeyDown={e => handleKeyDown(e, item, index)}
															className="block px-4 py-2.5 text-foreground hover:bg-primary/5 hover:text-primary transition-all duration-200 font-medium text-sm"
														>
															{dropdownItem.name}
														</Link>
													</animated.div>
												))}
											</animated.div>
										) : null
									)}
							</div>
						))}
					</div>

					{/* CTA Button & Mobile Menu */}
					<div className="flex items-center space-x-4">
						{!isMounted ? (
							<div className="hidden sm:flex px-4 py-2 text-muted-foreground">
								Loading...
							</div>
						) : isLoading ? (
							<div className="hidden sm:flex px-4 py-2 text-muted-foreground">
								Loading...
							</div>
						) : isAuthenticated ? (
							<>
								<div className="hidden sm:flex items-center space-x-2 px-4 py-2 text-foreground font-medium">
									<span>Welcome, {user?.email?.split('@')[0]}</span>
								</div>
								<button
									onClick={handleSignOut}
									className="hidden sm:flex px-4 py-2 text-foreground hover:text-foreground rounded-(--radius-medium) hover:bg-muted/50 transition-all duration-300 font-medium"
								>
									Sign Out
								</button>
							</>
						) : (
							<>
								<Link
									href="/login"
									className="hidden sm:flex px-4 py-2 text-foreground hover:text-foreground rounded-(--radius-medium) hover:bg-muted/50 transition-all duration-300 font-medium"
								>
									Sign In
								</Link>

								<animated.div
									style={ctaSpring}
									onMouseEnter={() => setCtaHover(true)}
									onMouseLeave={() => setCtaHover(false)}
									onMouseDown={() => setCtaTap(true)}
									onMouseUp={() => setCtaTap(false)}
								>
									<Link
										href={ctaHref}
										className="hidden sm:flex items-center px-6 py-2.5 bg-linear-to-r from-primary to-primary/80 text-primary-foreground font-medium text-sm rounded-(--radius-medium) hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-lg hover:shadow-xl"
									>
										{ctaText}
										<ArrowRight className="ml-2 size-4" />
									</Link>
								</animated.div>
							</>
						)}

						{/* Mobile Menu Button */}
						<animated.button
							style={mobileButtonSpring}
							onMouseDown={() => setMobileButtonTap(true)}
							onMouseUp={() => setMobileButtonTap(false)}
							onClick={toggleMobileMenu}
							aria-label={
								isOpen ? 'Close navigation menu' : 'Open navigation menu'
							}
							data-testid="mobile-nav-toggle"
							className="md:hidden p-2 text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-(--radius-medium) transition-all duration-200"
						>
							{isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
						</animated.button>
					</div>
				</div>

				{/* Mobile Menu - Premium Sheet Pattern */}
			<Sheet open={isOpen} onOpenChange={setIsOpen}>
				<SheetContent side="right" className="w-[300px] sm:w-[350px]">
					<SheetHeader>
						<SheetTitle className="text-left">Menu</SheetTitle>
					</SheetHeader>
					<div className="mt-6">
						<nav className="flex flex-col space-y-2">
								{currentNavItems.map(item => (
									<div key={item.name}>
										<animated.div
											style={getMobileItemStyle(item.name)}
											onMouseEnter={() => setHoveredMobileItem(item.name)}
											onMouseLeave={() => setHoveredMobileItem(null)}
										>
											<Link
												href={item.href}
												onClick={() => !item.hasDropdown && setIsOpen(false)}
												className={cn(
													'relative flex items-center justify-between px-4 py-3 text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-(--radius-medium) transition-all duration-200',
													isActiveLink(item.href) &&
														'text-foreground bg-muted/50 border-l-2 border-l-[--color-accent-main]'
												)}
											>
												{item.name}
												{item.hasDropdown && (
													<ChevronDown
														className={`size-4 transition-transform duration-200 ${
															openDropdown === item.name ? 'rotate-180' : ''
														}`}
														onClick={e => {
															e.preventDefault()
															handleDropdownToggle(item.name)
														}}
													/>
												)}
											</Link>
										</animated.div>

										{/* Mobile Dropdown */}
										{item.hasDropdown && (
											<div className="ml-4 space-y-1">
												{dropdownTransitions((style, dropdownName) =>
													dropdownName === item.name ? (
														<animated.div style={style}>
															{item.dropdownItems?.map(dropdownItem => (
																<animated.div
																	key={dropdownItem.name}
																	style={getMobileItemStyle(dropdownItem.name)}
																	onMouseEnter={() =>
																		setHoveredMobileItem(dropdownItem.name)
																	}
																	onMouseLeave={() =>
																		setHoveredMobileItem(null)
																	}
																>
																	<Link
																		href={dropdownItem.href}
																		onClick={() => setIsOpen(false)}
																		className="block px-4 py-2 text-sm text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200"
																	>
																		{dropdownItem.name}
																	</Link>
																</animated.div>
															))}
														</animated.div>
													) : null
												)}
											</div>
										)}
									</div>
								))}

								{/* Mobile Auth Links */}
								{isLoading ? (
									<div className="px-4 py-3 text-muted-foreground">
										Loading...
									</div>
								) : isAuthenticated ? (
									<>
										<div className="px-4 py-3 text-foreground font-medium">
											Welcome, {user?.email?.split('@')[0]}
										</div>
										<animated.div
											style={getMobileItemStyle('signout')}
											onMouseEnter={() => setHoveredMobileItem('signout')}
											onMouseLeave={() => setHoveredMobileItem(null)}
										>
											<button
												onClick={handleSignOut}
												className="block w-full text-left px-4 py-3 text-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200"
											>
												Sign Out
											</button>
										</animated.div>
									</>
								) : (
									<>
										<animated.div
											style={getMobileItemStyle('signin')}
											onMouseEnter={() => setHoveredMobileItem('signin')}
											onMouseLeave={() => setHoveredMobileItem(null)}
										>
											<Link
												href="/login"
												onClick={() => setIsOpen(false)}
												className="block px-4 py-3 text-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200"
											>
												Sign In
											</Link>
										</animated.div>

										{/* Mobile CTA */}
										<animated.div
											style={ctaSpring}
											onMouseEnter={() => setCtaHover(true)}
											onMouseLeave={() => setCtaHover(false)}
											onMouseDown={() => setCtaTap(true)}
											onMouseUp={() => setCtaTap(false)}
										>
											<Link
												href={ctaHref}
												onClick={() => setIsOpen(false)}
												className="flex items-center justify-center w-full px-6 py-3 mt-4 bg-linear-to-r from-primary to-primary/80 text-primary-foreground font-medium text-sm rounded-xl hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-lg"
											>
												{ctaText}
												<ArrowRight className="ml-2 size-4" />
											</Link>
										</animated.div>
									</>
								)}
						</nav>
					</div>
				</SheetContent>
			</Sheet>
		</animated.nav>
		)
	}
)
Navbar.displayName = 'Navbar'

export default Navbar
