'use client'

import type { Ref } from 'react'

import { Button } from '#components/ui/button'
import { useNavigation } from '#hooks/use-navigation'
import { cn } from '#lib/utils'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NavbarDesktopNav } from './navbar/navbar-desktop-nav'
import { NavbarMobileMenu } from './navbar/navbar-mobile-menu'
import { DEFAULT_NAV_ITEMS, type NavbarProps } from './navbar/types'

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

	const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } =
		useNavigation()
	const pathname = usePathname()

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20)
		}

		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

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
				{/* Logo */}
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

				<NavbarDesktopNav navItems={navItems} pathname={pathname} />

				<div className="flex items-center space-x-4">
					<div className="hidden sm:flex items-center gap-3">
						<Link
							href="/login"
							className="px-3 py-1.5 text-foreground/70 hover:text-foreground rounded-md border border-transparent hover:border-border/50 transition-colors duration-fast text-sm font-medium"
						>
							Sign In
						</Link>
						<Button asChild size="sm">
							<Link href={ctaHref}>{ctaText}</Link>
						</Button>
					</div>

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
				navItems={navItems}
				pathname={pathname}
				ctaText={ctaText}
				ctaHref={ctaHref}
			/>
		</nav>
	)
}

export default Navbar
