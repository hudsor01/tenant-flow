'use client'

import { cn } from '#lib/utils'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface MarketingNavProps {
	className?: string
}

export function MarketingNav({ className }: MarketingNavProps) {
	const [isScrolled, setIsScrolled] = useState(false)
	const [scrollProgress, setScrollProgress] = useState(0)
	const pathname = usePathname()

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

	const isActiveLink = (href: string) => {
		if (href === '/') return pathname === '/'
		return pathname === href || pathname.startsWith(`${href}/`)
	}

	const navLinks = [
		{ name: 'Features', href: '/features' },
		{ name: 'Pricing', href: '/pricing' },
		{ name: 'About', href: '/about' },
		{ name: 'Blog', href: '/blog' },
		{ name: 'FAQ', href: '/faq' },
		{ name: 'Contact', href: '/contact' }
	]

	return (
		<nav
			className={cn(
				'fixed left-1/2 transform translate-x-[-50%] z-50 transition-all duration-300 rounded-full px-4 py-2 w-auto',
				isScrolled
					? 'top-0 bg-card backdrop-blur-2xl shadow-2xl border border-(--color-fill-secondary)/30 scale-[0.98]'
					: 'top-4 bg-card/90 backdrop-blur-xl shadow-lg border border-(--color-fill-secondary)/20',
				'hover:bg-card hover:shadow-xl',
				className
			)}
		>
			<div className="flex items-center justify-between gap-8 md:gap-12">
				{/* Logo */}
				<Link
					href="/"
					className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
				>
					<div className="size-11 rounded-lg overflow-hidden bg-primary border border-border flex items-center justify-center">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							className="size-5 text-primary-foreground"
						>
							<path
								d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>
					<span className="text-xl font-bold text-foreground tracking-tight">
						TenantFlow
					</span>
				</Link>

				{/* Desktop Navigation */}
				<div className="hidden md:flex items-center space-x-1">
					{navLinks.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className={cn(
								'relative flex items-center px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-muted/50 transition-all duration-200',
								isActiveLink(link.href) &&
									'text-foreground after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:bg-[--color-accent-main]'
							)}
						>
							{link.name}
						</Link>
					))}
				</div>

				{/* CTA Buttons */}
				<div className="flex items-center space-x-3">
					<Link
						href="/login"
						className="hidden sm:flex px-4 py-2 text-foreground rounded-xl hover:bg-muted/50 transition-all duration-300 font-medium"
					>
						Sign In
					</Link>
					<Link
						href="/signup"
						className="flex items-center px-6 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
					>
						Start Managing Properties
						<ArrowRight className="ml-2 size-4" />
					</Link>
				</div>
			</div>

			{/* Scroll Progress Bar */}
			<div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[--color-fill-secondary] rounded-full overflow-hidden">
				<div
					className="h-full bg-[--color-accent-main] transition-all duration-150 ease-out"
					style={{ width: `${scrollProgress}%` }}
				/>
			</div>
		</nav>
	)
}
