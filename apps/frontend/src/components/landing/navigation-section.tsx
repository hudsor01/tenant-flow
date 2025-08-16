// apps/frontend/src/components/landing/navigation-section.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Building2, Sparkles, Menu, X, ChevronDown } from 'lucide-react'
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
				'border-b border-gray-200/50 bg-white/95 backdrop-blur-md',
				scrollY > 50 && 'bg-white/98 shadow-xl shadow-black/5'
			)}
		>
			<div className="container mx-auto flex h-16 items-center justify-between px-4">
				{/* Enhanced logo */}
				<Link href="/" className="group flex items-center space-x-3">
					<div className="relative">
						<div className="from-primary flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br to-purple-600 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
							<Building2 className="h-6 w-6 text-white" />
						</div>
						<Sparkles className="absolute -top-1 -right-1 h-3 w-3 animate-pulse text-yellow-500" />
					</div>
					<span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-xl font-bold text-transparent">
						TenantFlow
					</span>
				</Link>

				{/* Desktop Navigation */}
				<div className="hidden items-center space-x-1 md:flex">
					{navItems.map(item => (
						<div key={item.href} className="group relative">
							{item.dropdown ? (
								<button className="flex items-center space-x-1 rounded-lg px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900">
									<span>{item.label}</span>
									<ChevronDown className="h-4 w-4" />
								</button>
							) : (
								<Link
									href={item.href}
									className="rounded-lg px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
								>
									{item.label}
								</Link>
							)}

							{/* Dropdown menu */}
							{item.dropdown && (
								<div className="invisible absolute top-full left-0 mt-1 w-48 translate-y-2 transform rounded-xl border border-gray-200/50 bg-white/95 opacity-0 shadow-xl backdrop-blur-md transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
									<div className="py-2">
										{item.dropdown.map(dropdownItem => (
											<Link
												key={dropdownItem.href}
												href={dropdownItem.href}
												className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
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

				{/* Desktop CTA buttons */}
				<div className="hidden items-center space-x-3 md:flex">
					<Button
						asChild
						variant="ghost"
						className="text-gray-700 hover:bg-gray-50 hover:text-gray-900"
					>
						<Link href="/auth/login">Sign In</Link>
					</Button>
					<Button
						asChild
						className="from-primary bg-gradient-to-r to-purple-600 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
					>
						<Link href="/auth/signup">Get Started Free</Link>
					</Button>
				</div>

				{/* Mobile menu button */}
				<button
					className="rounded-lg p-2 transition-colors hover:bg-gray-100 md:hidden"
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
				>
					{mobileMenuOpen ? (
						<X className="h-6 w-6 text-gray-700" />
					) : (
						<Menu className="h-6 w-6 text-gray-700" />
					)}
				</button>
			</div>

			{/* Mobile menu */}
			<div
				className={cn(
					'absolute top-full right-0 left-0 border-b border-gray-200/50 bg-white/98 shadow-xl backdrop-blur-md transition-all duration-300 md:hidden',
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
								className="block py-2 text-gray-700 transition-colors hover:text-gray-900"
								onClick={() => setMobileMenuOpen(false)}
							>
								{item.label}
							</Link>
							{item.dropdown && (
								<div className="mt-2 ml-4 space-y-2">
									{item.dropdown.map(dropdownItem => (
										<Link
											key={dropdownItem.href}
											href={dropdownItem.href}
											className="block py-1 text-sm text-gray-600 transition-colors hover:text-gray-800"
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
							className="from-primary w-full justify-center bg-gradient-to-r to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
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
