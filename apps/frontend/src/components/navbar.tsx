'use client'

import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-provider'
import { supabaseClient } from '@repo/shared'
import { useSpring, useTransition } from '@react-spring/core'
import { animated } from '@react-spring/web'
import { ArrowRight, Building2, ChevronDown, Menu, X } from 'lucide-react'
import Link from 'next/link'
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
				{
					name: 'Products',
					href: '#',
					hasDropdown: true,
					dropdownItems: [
						{ name: 'Property Management', href: '/features' },
						{ name: 'Tenant Portal', href: '/features#tenant-portal' },
						{ name: 'Maintenance Tracking', href: '/features#maintenance' },
						{ name: 'Financial Reports', href: '/features#financial' },
						{ name: 'All Features', href: '/features' }
					]
				},
				{
					name: 'Solutions',
					href: '#',
					hasDropdown: true,
					dropdownItems: [
						{ name: 'Small Landlords', href: '/solutions/small-landlords' },
						{ name: 'Property Managers', href: '/solutions/property-managers' },
						{ name: 'Enterprise', href: '/solutions/enterprise' },
						{ name: 'Real Estate Investors', href: '/solutions/investors' }
					]
				},
				{
					name: 'Resources',
					href: '#',
					hasDropdown: true,
					dropdownItems: [
						{ name: 'Help Center', href: '/help' },
						{ name: 'Blog', href: '/blog' },
						{ name: 'FAQ', href: '/faq' },
						{ name: 'Contact', href: '/contact' },
						{ name: 'API Documentation', href: '/docs' }
					]
				},
				{ name: 'Pricing', href: '/pricing' },
				{ name: 'About', href: '/about' }
			],
			ctaText = 'Get Started',
			ctaHref = '/signup',
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
		const [hoveredDropdownItem, setHoveredDropdownItem] = useState<string | null>(null)
		const [hoveredMobileItem, setHoveredMobileItem] = useState<string | null>(null)
		const [isMounted, setIsMounted] = useState(false)

		// Auth state
		const { user, isAuthenticated, isLoading } = useAuthStore(state => ({
			user: state.user,
			isAuthenticated: state.isAuthenticated,
			isLoading: state.isLoading
		}))

		// Prevent hydration mismatch by only rendering auth content after mount
		useEffect(() => {
			setIsMounted(true)
		}, [])

		// Dynamic navigation based on auth state
		const getNavItems = () => {
			if (isAuthenticated) {
				return [
					{
						name: 'Dashboard',
						href: '/dashboard',
						hasDropdown: true,
						dropdownItems: [
							{ name: 'Overview', href: '/dashboard' },
							{ name: 'Properties', href: '/dashboard/properties' },
							{ name: 'Tenants', href: '/dashboard/tenants' },
							{ name: 'Leases', href: '/dashboard/leases' },
							{ name: 'Maintenance', href: '/dashboard/maintenance' },
							{ name: 'Reports', href: '/dashboard/reports' },
							{ name: 'Analytics', href: '/dashboard/analytics' }
						]
					},
					{
						name: 'Tools',
						href: '#',
						hasDropdown: true,
						dropdownItems: [
							{ name: 'Settings', href: '/dashboard/settings' },
							{ name: 'Help Center', href: '/help' },
							{ name: 'API Docs', href: '/docs' },
							{ name: 'Contact Support', href: '/contact' }
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

		const handleSignOut = async () => {
			const { error } = await supabaseClient.auth.signOut()
			if (error) {
				console.error('Error signing out:', error)
			}
			setIsOpen(false)
		}

		// React Spring animations
		const navbarSpring = useSpring({
			y: 0,
			from: { y: -100 },
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

		// Mobile menu transition
		const mobileMenuTransition = useTransition(isOpen, {
			from: { opacity: 0, height: 0 },
			enter: { opacity: 1, height: 'auto' },
			leave: { opacity: 0, height: 0 },
			config: { mass: 1, tension: 120, friction: 14 }
		})

		// Simple hover animation styles (using CSS transitions instead of hooks-in-callbacks)
		const getNavItemStyle = (itemName: string) => ({
			transform: hoveredNavItem === itemName ? 'scale(1.05)' : 'scale(1)',
			transition: 'transform 0.2s ease-out'
		})

		// Dropdown item hover styles  
		const getDropdownItemStyle = (itemName: string) => ({
			transform: hoveredDropdownItem === itemName ? 'translateX(4px)' : 'translateX(0)',
			transition: 'transform 0.2s ease-out'
		})

		// Mobile item hover styles
		const getMobileItemStyle = (itemName: string) => ({
			transform: hoveredMobileItem === itemName ? 'translateX(4px)' : 'translateX(0)',
			transition: 'transform 0.2s ease-out'
		})

		return (
			<animated.nav
				ref={ref}
				style={navbarSpring}
				className={cn(
					'fixed top-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 rounded-2xl px-6 py-4 w-[95%] max-w-5xl',
					isScrolled
						? 'bg-white shadow-xl border border-gray-300'
						: 'bg-white/95 shadow-lg border border-gray-200',
					className
				)}
				{...props}
			>
				<div className="flex items-center justify-between">
					{/* Logo */}
					<animated.div
						style={logoSpring}
						onMouseEnter={() => setLogoHover(true)}
						onMouseLeave={() => setLogoHover(false)}
						className="flex items-center space-x-2"
					>
						<div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
							<Building2 className="text-white size-4" />
						</div>
						<span className="text-xl font-bold text-gray-900">{logo}</span>
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
										className="flex items-center px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm rounded-xl hover:bg-gray-100/50 transition-all duration-200"
									>
										{item.name}
										{item.hasDropdown && (
											<ChevronDown className="ml-1 h-4 w-4 transition-transform duration-200" />
										)}
									</Link>
								</animated.div>

								{/* Professional Dropdown */}
								{item.hasDropdown && dropdownTransitions((style, dropdownName) =>
									dropdownName === item.name ? (
										<animated.div
											style={style}
											className="absolute top-full left-0 mt-2 w-56 bg-white/98 backdrop-blur-lg rounded-xl shadow-xl border border-gray-200/50 py-2"
										>
											{item.dropdownItems?.map(dropdownItem => (
												<animated.div
													key={dropdownItem.name}
													style={getDropdownItemStyle(dropdownItem.name)}
													onMouseEnter={() => setHoveredDropdownItem(dropdownItem.name)}
													onMouseLeave={() => setHoveredDropdownItem(null)}
												>
													<Link
														href={dropdownItem.href}
														className="block px-4 py-2.5 text-gray-800 hover:bg-blue-50/80 transition-all duration-200 group font-medium text-sm group-hover:text-blue-700"
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
									className="hidden sm:flex px-4 py-2 text-foreground hover:text-foreground rounded-xl hover:bg-muted/50 transition-all duration-300 font-medium"
								>
									Sign Out
								</button>
							</>
						) : (
							<>
								<Link
									href="/login"
									className="hidden sm:flex px-4 py-2 text-foreground hover:text-foreground rounded-xl hover:bg-muted/50 transition-all duration-300 font-medium"
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
										className="hidden sm:flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium text-sm rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
									>
										{ctaText}
										<ArrowRight className="ml-2 h-4 w-4" />
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
							className="md:hidden p-2 text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200"
						>
							{isOpen ? (
								<X className="h-5 w-5" />
							) : (
								<Menu className="h-5 w-5" />
							)}
						</animated.button>
					</div>
				</div>

				{/* Mobile Menu */}
				{mobileMenuTransition((style, show) =>
					show ? (
						<animated.div
							style={style}
							className="md:hidden mt-4 pt-4 border-t border-border/50"
						>
							<div className="space-y-2">
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
												className="flex items-center justify-between px-4 py-3 text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200"
											>
												{item.name}
												{item.hasDropdown && (
													<ChevronDown
														className={`h-4 w-4 transition-transform duration-200 ${
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
																	onMouseEnter={() => setHoveredMobileItem(dropdownItem.name)}
																	onMouseLeave={() => setHoveredMobileItem(null)}
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
												className="flex items-center justify-center w-full px-6 py-3 mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium text-sm rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
											>
												{ctaText}
												<ArrowRight className="ml-2 h-4 w-4" />
											</Link>
										</animated.div>
									</>
								)}
							</div>
						</animated.div>
					) : null
				)}
			</animated.nav>
		)
	}
)
Navbar.displayName = 'Navbar'

export default Navbar