'use client'

import type { Ref } from 'react'

import { useSignOutMutation } from '#hooks/api/use-auth'
import { useNavigation } from '#hooks/use-navigation'
import { cn } from '#lib/utils'
import { useAuth } from '#providers/auth-provider'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NavbarLogo } from './navbar/navbar-logo'
import { NavbarDesktopNav } from './navbar/navbar-desktop-nav'
import { NavbarDesktopAuth } from './navbar/navbar-desktop-auth'
import { NavbarMobileMenu } from './navbar/navbar-mobile-menu'
import { NavbarMobileToggle } from './navbar/navbar-mobile-toggle'
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
	const [scrollProgress, setScrollProgress] = useState(0)
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
				'fixed left-1/2 transform translate-x-[-50%] z-50 transition-all duration-normal rounded-xl px-6 py-3 w-auto',
				isScrolled
					? 'top-2 bg-card backdrop-blur-2xl shadow-2xl border border-fill-secondary/30 scale-[0.98]'
					: 'top-4 bg-card/90 backdrop-blur-xl shadow-lg border border-fill-secondary/20',
				'hover:bg-card hover:shadow-xl',
				className
			)}
			{...props}
		>
			{/* Scroll Progress Bar */}
			<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fill-secondary rounded-full overflow-hidden">
				<div
					className="h-full bg-accent-main transition-all duration-instant ease-out"
					style={{ width: `${scrollProgress}%` }}
				/>
			</div>

			<div className="flex-between">
				<NavbarLogo logo={logo} />

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

					<NavbarMobileToggle
						isOpen={isMobileMenuOpen}
						onToggle={toggleMobileMenu}
					/>
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
