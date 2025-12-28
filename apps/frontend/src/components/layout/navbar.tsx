// TODO: [VIOLATION] CLAUDE.md Standards - KISS Principle violation
// This file is ~541 lines. Per CLAUDE.md: "Small, Focused Modules - Maximum 300 lines per file"
// Recommended refactoring:
// 1. Extract DesktopNav into: `./navbar-desktop.tsx`
// 2. Extract MobileNav/Sheet into: `./navbar-mobile.tsx`
// 3. Extract UserMenu into: `./navbar-user-menu.tsx`
// 4. Extract NavLinks into: `./navbar-links.tsx`
// 5. Keep Navbar as orchestration component
// See: CLAUDE.md section "KISS (Keep It Simple, Stupid)"

'use client'

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle
} from '#components/ui/sheet'
import { useSignOut } from '#hooks/api/use-auth'
import { useNavigation } from '#hooks/use-navigation'
import { cn } from '#lib/utils'
import { Button as _Button } from '#components/ui/button'
import { useAuth } from '#providers/auth-provider'
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

		// Use navigation store for mobile menu state
		const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } =
			useNavigation()

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
					{ name: 'Dashboard', href: '/' },
					{ name: 'Properties', href: '/properties' },
					{ name: 'Analytics', href: '/analytics' },
					{
						name: 'More',
						href: '#',
						hasDropdown: true,
						dropdownItems: [
							{ name: 'Leases', href: '/leases' },
							{ name: 'Maintenance', href: '/maintenance' },
							{ name: 'Reports', href: '/reports' },
							{ name: 'Settings', href: '/dashboard/settings' }
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
				const progress =
					scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0
				setScrollProgress(progress)
			}

			window.addEventListener('scroll', handleScroll)
			return () => window.removeEventListener('scroll', handleScroll)
		}, [])

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
					closeMobileMenu()
				}
			})
		}

		// CSS animation helper classes
		const getLogoClasses = () =>
			cn(
				'flex items-center space-x-2 transition-transform [transition-duration:var(--duration-fast)]',
				logoHover && 'scale-105'
			)

		const getCtaClasses = () =>
			cn(
				'transition-transform [transition-duration:var(--duration-fast)]',
				ctaTap ? 'scale-95' : ctaHover ? 'scale-105' : 'scale-100'
			)

		const getMobileButtonClasses = () =>
			cn(
				'md:hidden p-2 text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-lg transition-all [transition-duration:var(--duration-fast)]',
				mobileButtonTap && 'scale-95'
			)

		// Check if nav item is active
		const isActiveLink = (href: string) => {
			if (href === '/') return pathname === '/'
			return pathname === href || pathname.startsWith(`${href}/`)
		}

		// Simple hover animation styles (using CSS transitions instead of hooks-in-callbacks)
		const getNavItemStyle = (itemName: string) => ({
			transform:
				hoveredNavItem === itemName ? `scale(var(--scale-hover))` : 'scale(1)',
			transition: `transform var(--duration-fast) var(--ease-out)`
		})

		// Dropdown item hover styles
		const getDropdownItemStyle = (itemName: string) => ({
			transform:
				hoveredDropdownItem === itemName
					? `translateX(var(--translate-hover-x))`
					: 'translateX(0)',
			transition: `transform var(--duration-fast) var(--ease-out)`
		})

		// Mobile item hover styles
		const getMobileItemStyle = (itemName: string) => ({
			transform:
				hoveredMobileItem === itemName
					? `translateX(var(--translate-hover-x))`
					: 'translateX(0)',
			transition: `transform var(--duration-fast) var(--ease-out)`
		})

		return (
			<nav
				data-site-navbar
				ref={ref}
				className={cn(
					'fixed left-1/2 transform translate-x-[-50%] z-50 transition-all [transition-duration:var(--duration-normal)] rounded-xl px-6 py-3 w-auto',
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
						className="h-full bg-[--color-accent-main] transition-all [transition-duration:var(--duration-instant)] ease-out"
						style={{ width: `${scrollProgress}%` }}
					/>
				</div>{' '}
				<div className="flex-between">
					{/* Logo */}
					<div
						onMouseEnter={() => setLogoHover(true)}
						onMouseLeave={() => setLogoHover(false)}
						className={getLogoClasses()}
					>
						<div className="size-11 rounded-lg overflow-hidden bg-background border border-border flex-center">
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
					</div>

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
								<div style={getNavItemStyle(item.name)}>
									<Link
										href={item.href}
										onKeyDown={e => handleKeyDown(e, item)}
										className={cn(
											'relative flex items-center px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-muted/50 transition-all [transition-duration:var(--duration-fast)]',
											isActiveLink(item.href) &&
												'text-foreground after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-[--color-accent-main] after:animate-in after:slide-in-from-bottom-1'
										)}
									>
										{item.name}
										{item.hasDropdown && (
											<ChevronDown className="ml-1 size-4 transition-transform [transition-duration:var(--duration-fast)]" />
										)}
									</Link>
								</div>

								{/* Professional Dropdown */}
								{item.hasDropdown && openDropdown === item.name && (
									<div
										className={cn(
											'absolute top-full left-0 mt-2 w-56 bg-background/98 backdrop-blur-lg rounded-xl shadow-xl border border-border/50 py-2',
											'animate-in fade-in-0 slide-in-from-top-2 zoom-in-95 [animation-duration:var(--duration-fast)]'
										)}
									>
										{item.dropdownItems?.map((dropdownItem, index) => (
											<div
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
													className="block px-4 py-2.5 text-foreground hover:bg-primary/5 hover:text-primary transition-all [transition-duration:var(--duration-fast)] font-medium text-sm"
												>
													{dropdownItem.name}
												</Link>
											</div>
										))}
									</div>
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
									className="hidden sm:flex px-4 py-2 text-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all [transition-duration:var(--duration-normal)] font-medium"
								>
									Sign Out
								</button>
							</>
						) : (
							<>
								<Link
									href="/login"
									className="hidden sm:flex px-4 py-2 text-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all [transition-duration:var(--duration-normal)] font-medium"
								>
									Sign In
								</Link>

								<div
									className={getCtaClasses()}
									onMouseEnter={() => setCtaHover(true)}
									onMouseLeave={() => setCtaHover(false)}
									onMouseDown={() => setCtaTap(true)}
									onMouseUp={() => setCtaTap(false)}
								>
									<Link
										href={ctaHref}
										className="hidden sm:flex items-center bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl rounded-lg px-6 py-2.5 font-medium text-sm"
									>
										{ctaText}
										<ArrowRight className="ml-2 size-4" />
									</Link>
								</div>
							</>
						)}

						{/* Mobile Menu Button */}
						<button
							onMouseDown={() => setMobileButtonTap(true)}
							onMouseUp={() => setMobileButtonTap(false)}
							onClick={toggleMobileMenu}
							aria-label={
								isMobileMenuOpen
									? 'Close navigation menu'
									: 'Open navigation menu'
							}
							data-testid="mobile-nav-toggle"
							className={getMobileButtonClasses()}
						>
							{isMobileMenuOpen ? (
								<X className="size-5" />
							) : (
								<Menu className="size-5" />
							)}
						</button>
					</div>
				</div>
				{/* Mobile Menu - Premium Sheet Pattern */}
				<Sheet
					open={isMobileMenuOpen}
					onOpenChange={open => (open ? toggleMobileMenu() : closeMobileMenu())}
				>
					<SheetContent side="right" className="w-[300px] sm:w-[350px]">
						<SheetHeader>
							<SheetTitle className="text-left">Menu</SheetTitle>
						</SheetHeader>
						<div className="mt-6">
							<nav className="flex flex-col space-y-2">
								{currentNavItems.map(item => (
									<div key={item.name}>
										<div
											style={getMobileItemStyle(item.name)}
											onMouseEnter={() => setHoveredMobileItem(item.name)}
											onMouseLeave={() => setHoveredMobileItem(null)}
										>
											<Link
												href={item.href}
												onClick={() => !item.hasDropdown && closeMobileMenu()}
												className={cn(
													'relative flex-between px-4 py-3 text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-lg transition-all [transition-duration:var(--duration-fast)]',
													isActiveLink(item.href) &&
														'text-foreground bg-muted/50 border-l-2 border-l-[--color-accent-main]'
												)}
											>
												{item.name}
												{item.hasDropdown && (
													<ChevronDown
														className={`size-4 transition-transform [transition-duration:var(--duration-fast)] ${
															openDropdown === item.name ? 'rotate-180' : ''
														}`}
														onClick={e => {
															e.preventDefault()
															handleDropdownToggle(item.name)
														}}
													/>
												)}
											</Link>
										</div>

										{/* Mobile Dropdown */}
										{item.hasDropdown && openDropdown === item.name && (
											<div className="ml-4 space-y-1 animate-in fade-in-0 slide-in-from-top-2 [animation-duration:var(--duration-fast)]">
												{item.dropdownItems?.map(dropdownItem => (
													<div
														key={dropdownItem.name}
														style={getMobileItemStyle(dropdownItem.name)}
														onMouseEnter={() =>
															setHoveredMobileItem(dropdownItem.name)
														}
														onMouseLeave={() => setHoveredMobileItem(null)}
													>
														<Link
															href={dropdownItem.href}
															onClick={() => closeMobileMenu()}
															className="mobile-dropdown-link"
														>
															{dropdownItem.name}
														</Link>
													</div>
												))}
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
										<div
											style={getMobileItemStyle('signout')}
											onMouseEnter={() => setHoveredMobileItem('signout')}
											onMouseLeave={() => setHoveredMobileItem(null)}
										>
											<button
												onClick={handleSignOut}
												className="block w-full text-left px-4 py-3 text-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all [transition-duration:var(--duration-fast)]"
											>
												Sign Out
											</button>
										</div>
									</>
								) : (
									<>
										<div
											style={getMobileItemStyle('signin')}
											onMouseEnter={() => setHoveredMobileItem('signin')}
											onMouseLeave={() => setHoveredMobileItem(null)}
										>
											<Link
												href="/login"
												onClick={() => closeMobileMenu()}
												className="block px-4 py-3 text-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all [transition-duration:var(--duration-fast)]"
											>
												Sign In
											</Link>
										</div>

										{/* Mobile CTA */}
										<div
											className={getCtaClasses()}
											onMouseEnter={() => setCtaHover(true)}
											onMouseLeave={() => setCtaHover(false)}
											onMouseDown={() => setCtaTap(true)}
											onMouseUp={() => setCtaTap(false)}
										>
											<Link
												href={ctaHref}
												onClick={() => closeMobileMenu()}
												className="flex-center w-full px-6 py-3 mt-4 bg-linear-to-r from-primary to-primary/80 text-primary-foreground font-medium text-sm rounded-xl hover:from-primary/90 hover:to-primary/70 transition-all [transition-duration:var(--duration-fast)] shadow-lg"
											>
												{ctaText}
												<ArrowRight className="ml-2 size-4" />
											</Link>
										</div>
									</>
								)}
							</nav>
						</div>
					</SheetContent>
				</Sheet>
			</nav>
		)
	}
)
Navbar.displayName = 'Navbar'

export default Navbar
