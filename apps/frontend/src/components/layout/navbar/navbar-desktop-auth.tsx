'use client'

import { cn } from '#lib/utils'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
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
	const [ctaHover, setCtaHover] = useState(false)
	const [ctaTap, setCtaTap] = useState(false)

	const getCtaClasses = () =>
		cn(
			'transition-transform duration-fast',
			ctaTap ? 'scale-95' : ctaHover ? 'scale-105' : 'scale-100'
		)

	if (!isMounted || isLoading) {
		return (
			<div className="hidden sm:flex px-4 py-2 text-muted-foreground">
				Loading...
			</div>
		)
	}

	if (isAuthenticated) {
		return (
			<>
				<div className="hidden sm:flex items-center space-x-2 px-4 py-2 text-foreground font-medium">
					<span>Welcome, {user?.email?.split('@')[0]}</span>
				</div>
				<button
					onClick={onSignOut}
					className="hidden sm:flex px-4 py-2 text-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all duration-normal font-medium"
				>
					Sign Out
				</button>
			</>
		)
	}

	return (
		<>
			<Link
				href="/login"
				className="hidden sm:flex px-4 py-2 text-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all duration-normal font-medium"
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
					className="hidden sm:flex items-center bg-linear-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl rounded-lg px-6 py-2.5 font-medium text-sm"
				>
					{ctaText}
					<ArrowRight className="ml-2 size-4" />
				</Link>
			</div>
		</>
	)
}
