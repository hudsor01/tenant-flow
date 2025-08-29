// apps/frontend/src/components/landing/navigation-section.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

export function NavigationSection(): React.ReactElement {
	const [scrollY, setScrollY] = useState(0)
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

	useEffect(() => {
		const onScroll = () => setScrollY(window.scrollY)
		window.addEventListener('scroll', onScroll)
		return () => window.removeEventListener('scroll', onScroll)
	}, [])

	const navItems = [
		{ href: '/features', label: 'Features' },
		{ href: '/pricing', label: 'Pricing' },
		{ href: '/blog', label: 'Blog' },
		{
			href: '/resources',
			label: 'Resources',
			dropdown: [
				{ href: '/guides', label: 'Guides' },
				{ href: '/support', label: 'Support' }
			]
		}
	]

	return (
		<nav
			className={cn(
				'fixed top-0 z-50 w-full transition-all duration-300',
				'border-b border-border/50 bg-card/95 backdrop-blur-md',
				scrollY > 50 && 'bg-card/98 border-border/80 shadow-sm'
			)}
		>
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				{/* Simplified modern logo */}
				<Link href="/" className="flex items-center space-x-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
						<i className="i-lucide-building-2 h-5 w-5 text-white"  />
					</div>
					<span className="text-xl font-bold text-foreground">
						TenantFlow
					</span>
				</Link>

				{/* Desktop Navigation */}
				<div className="hidden items-center space-x-1 md:flex">
					{navItems.map(item => (
						<div key={item.href} className="group relative">
					{item.dropdown ? (
								<button className="flex items-center space-x-1 rounded-lg px-4 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
									<span>{item.label}</span>
									<i className="i-lucide-chevron-down h-4 w-4"  />
								</button>
							) : (
								<Link
									href={item.href}
									className="rounded-lg px-4 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								>
									{item.label}
								</Link>
							)}

							{/* Dropdown menu */}
							{item.dropdown && (
								<div className="invisible absolute left-0 top-full mt-1 w-48 translate-y-2 transform rounded-xl border border-border/50 bg-card/95 opacity-0 shadow-xl backdrop-blur-md transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
									<div className="py-2">
										{item.dropdown.map(dropdownItem => (
											<Link
												key={dropdownItem.href}
												href={dropdownItem.href}
											className="block px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
											>
												{dropdownItem.label}
											</Link>
										))}
									</div>
								</div>
							)}
						</div>
					))}
				</div>

				{/* Modern CTA buttons */}
				<div className="hidden items-center space-x-4 md:flex">
					<ThemeToggle />
					<Link
						href="/auth/login"
						className="text-sm font-medium text-muted-foreground hover:text-foreground"
					>
						Sign in
					</Link>
					<Link
						href="/auth/signup"
						className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
					>
						Get started
					</Link>
				</div>

				{/* Mobile menu button */}
				<button
					className="rounded-lg p-2 transition-colors hover:bg-gray-1 md:hidden"
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
				>
					{mobileMenuOpen ? (
						<i className="i-lucide-x h-6 w-6 text-gray-7"  />
					) : (
						<i className="i-lucide-menu h-6 w-6 text-gray-7"  />
					)}
				</button>
			</div>

			{/* Mobile menu */}
			<div
					className={cn(
						'bg-card/98 absolute left-0 right-0 top-full border-b border-border/50 shadow-xl backdrop-blur-md transition-all duration-300 md:hidden',
					mobileMenuOpen
						? 'visible opacity-100'
						: 'invisible opacity-0'
				)}
			>
				<div className="container mx-auto space-y-4 px-4 py-6">
					{navItems.map(item => (
						<div key={item.href}>
							<Link
								href={item.href}
								className="block py-2 text-muted-foreground transition-colors hover:text-foreground"
								onClick={() => setMobileMenuOpen(false)}
							>
								{item.label}
							</Link>
							{item.dropdown && (
								<div className="ml-4 mt-2 space-y-2">
									{item.dropdown.map(dropdownItem => (
										<Link
											key={dropdownItem.href}
											href={dropdownItem.href}
											className="block py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
											onClick={() =>
												setMobileMenuOpen(false)
											}
										>
											{dropdownItem.label}
										</Link>
									))}
								</div>
							)}
						</div>
					))}

					{/* Mobile CTA buttons */}
					<div className="space-y-3 pt-4">
						<Button
							asChild
							variant="ghost"
							className="w-full justify-center"
						>
							<Link
								href="/auth/login"
								onClick={() => setMobileMenuOpen(false)}
							>
								Sign In
							</Link>
						</Button>
						<Button
							asChild
							className="from-primary w-full justify-center bg-gradient-to-r to-accent text-primary-foreground hover:from-primary/90 hover:to-accent/90"
						>
							<Link
								href="/auth/signup"
								onClick={() => setMobileMenuOpen(false)}
							>
								Get Started Free
							</Link>
						</Button>
					</div>
				</div>
			</div>
		</nav>
	)
}
