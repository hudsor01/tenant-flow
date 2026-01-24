'use client'

import type { Ref } from 'react'

import { useSignOutMutation } from '#hooks/api/use-auth'
import { useNavigation } from '#hooks/use-navigation'
import { cn } from '#lib/utils'
import { useAuth } from '#providers/auth-provider'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NavbarDesktopNav } from './navbar/navbar-desktop-nav'
import { NavbarDesktopAuth } from './navbar/navbar-desktop-auth'
import { NavbarMobileMenu } from './navbar/navbar-mobile-menu'
import { DEFAULT_NAV_ITEMS, AUTH_NAV_ITEMS, type NavbarProps } from './navbar/types'

export function Navbar({
	className,
	logo = 'TenantFlow',
	navItems = DEFAULT_NAV_ITEMS,
	ctaText = 'Get Started',
	ctaHref = '/pricing',
	ref,
	...props
}: NavbarProps & { ref?: Ref<HTMLElement> }) {
	const [isScrolled, setIsScrolled] = useState(false)
	const [isMounted, setIsMounted] = useState(false)

	const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } =
		useNavigation()
	const pathname = usePathname()
	const { isAuthenticated, isLoading, user } = useAuth()
	const signOutMutation = useSignOutMutation()

	useEffect(() => {
		queueMicrotask(() => setIsMounted(true))
	}, [])

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20)
		}

		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	const handleSignOut = () => {
		signOutMutation.mutate(undefined, {
			onSettled: () => {
				closeMobileMenu()
			}
		})
	}

	const currentNavItems = isMounted
		? isAuthenticated
			? AUTH_NAV_ITEMS
			: navItems
		: navItems

	return (
		<nav
			data-site-navbar
			ref={ref}
			className={cn(
				'fixed left-1/2 transform translate-x-[-50%] z-50 transition-all duration-normal rounded-2xl px-6 py-3 w-auto',
				isScrolled
					? 'top-2 bg-card/95 backdrop-blur-2xl shadow-xl border border-border/40'
					: 'top-4 bg-card/80 backdrop-blur-xl shadow-lg border border-border/20',
				className
			)}
			{...props}
		>
			<div className="flex-between">
				{/* Logo - Clean, no container */}
				<Link
					href="/"
					className="flex items-center gap-2.5 transition-opacity duration-fast hover:opacity-80"
				>
					<Image
						src="/tenant-flow-logo.png"
						alt="TenantFlow"
						width={28}
						height={28}
						className="size-7 object-contain"
						priority
					/>
					<span className="text-lg font-semibold text-foreground">{logo}</span>
				</Link>

				<NavbarDesktopNav navItems={currentNavItems} pathname={pathname} />

				<div className="flex items-center space-x-4">
					<NavbarDesktopAuth
						isAuthenticated={isAuthenticated}
						isLoading={isLoading}
						isMounted={isMounted}
						user={user ?? null}
						ctaText={ctaText}
						ctaHref={ctaHref}
						onSignOut={handleSignOut}
					/>

					{/* Mobile Toggle */}
					<button
						onClick={toggleMobileMenu}
						aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
						data-testid="mobile-nav-toggle"
						className="md:hidden p-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-fast"
					>
						{isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
					</button>
				</div>
			</div>

			<NavbarMobileMenu
				isOpen={isMobileMenuOpen}
				onOpenChange={(open: boolean) => (open ? toggleMobileMenu() : closeMobileMenu())}
				onClose={closeMobileMenu}
				navItems={currentNavItems}
				pathname={pathname}
				isAuthenticated={isAuthenticated}
				isLoading={isLoading}
				user={user ?? null}
				ctaText={ctaText}
				ctaHref={ctaHref}
				onSignOut={handleSignOut}
			/>
		</nav>
	)
}

export default Navbar
