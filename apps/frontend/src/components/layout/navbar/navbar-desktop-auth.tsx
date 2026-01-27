'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface NavbarDesktopAuthProps {
	isAuthenticated: boolean
	isLoading: boolean
	isMounted: boolean
	user: User | null
	ctaText: string
	ctaHref: string
	onSignOut: () => void
}

export function NavbarDesktopAuth({
	isAuthenticated,
	isLoading,
	isMounted,
	user,
	ctaText,
	ctaHref,
	onSignOut
}: NavbarDesktopAuthProps) {
	if (!isMounted || isLoading) {
		return (
			<div className="hidden sm:flex px-3 py-2 text-foreground/50 text-sm">
				Loading...
			</div>
		)
	}

	if (isAuthenticated) {
		return (
			<>
				<span className="hidden sm:flex items-center px-3 py-2 text-foreground/70 text-sm">
					{user?.email?.split('@')[0]}
				</span>
				<button
					onClick={onSignOut}
					className="hidden sm:flex px-3 py-2 text-foreground/70 hover:text-foreground rounded-lg border border-transparent hover:border-border transition-colors duration-fast text-sm font-medium"
				>
					Sign Out
				</button>
			</>
		)
	}

	return (
		<>
			{/* Sign In - Ghost button style */}
			<Link
				href="/login"
				className="hidden sm:flex px-3 py-1.5 text-foreground/70 hover:text-foreground rounded-lg border border-transparent hover:border-border/50 transition-colors duration-fast text-sm font-medium"
			>
				Sign In
			</Link>

			{/* CTA - Solid dark button */}
			<Link
				href={ctaHref}
				className="hidden sm:flex items-center bg-foreground text-background hover:bg-foreground/90 rounded-lg px-4 py-1.5 font-medium text-sm transition-colors duration-fast"
			>
				{ctaText}
				<ArrowRight className="ml-1.5 size-3.5" />
			</Link>
		</>
	)
}
