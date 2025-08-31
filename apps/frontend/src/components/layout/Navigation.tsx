'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useNotifications } from '@/hooks/api/use-notifications'
import { useNotificationRealtime } from '@/hooks/use-notification-realtime'
import { cn } from '@/lib/utils/css.utils'
import { LogoSection } from './navigation/LogoSection'
import { AuthSection } from './navigation/AuthSection'
import { MobileMenuButton } from './navigation/MobileMenuButton'
import { PublicNavItems } from './navigation/PublicNavItems'
import { MobileMenu } from './navigation/MobileMenu'

interface NavigationProps {
	context: 'public' | 'authenticated' | 'tenant-portal'
	transparent?: boolean
	className?: string
	onSidebarToggle?: () => void
}

export function Navigation({
	context,
	transparent = false,
	className = '',
	onSidebarToggle
}: NavigationProps) {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const [scrolled, setScrolled] = useState(false)
	const pathname = usePathname()
	const { user } = useAuth()
	
	// Set up realtime notifications
	const { unreadNotifications } = useNotifications()
	useNotificationRealtime(user?.id || null)

	// Handle scroll for transparent nav
	useEffect(() => {
		if (!transparent) return
		const handleScroll = () => setScrolled(window.scrollY > 10)
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [transparent])

	// Close mobile menu when route changes
	useEffect(() => {
		setIsMobileMenuOpen(false)
	}, [pathname])

	// Compute classes
	const navBarClasses = cn(
		'fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-20',
		transparent && !scrolled && context === 'public'
			? 'bg-transparent'
			: 'backdrop-blur-md border-b',
		className
	)

	// Get home link based on context
	const homeLink = context === 'authenticated' ? '/dashboard' : '/'

	return (
		<nav className={navBarClasses}>
			<div className="container mx-auto flex h-full items-center justify-between px-4">
				{/* Logo */}
				<LogoSection homeLink={homeLink} />

				{/* Desktop Navigation */}
				{context === 'public' && (
					<div className="hidden md:flex items-center gap-8">
						<PublicNavItems />
					</div>
				)}

				{/* Auth Section */}
				<div className="flex items-center gap-4">
					<AuthSection 
						user={user} 
						unreadNotifications={unreadNotifications?.length || 0}
						context={context}
					/>
					
					{/* Mobile Menu Button */}
					<MobileMenuButton
						isOpen={isMobileMenuOpen}
						onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						onSidebarToggle={onSidebarToggle}
						context={context}
					/>
				</div>
			</div>

			{/* Mobile Menu */}
			{context === 'public' && (
				<MobileMenu 
					isOpen={isMobileMenuOpen}
					onClose={() => setIsMobileMenuOpen(false)}
				/>
			)}
		</nav>
	)
}