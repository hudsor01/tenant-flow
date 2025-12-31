'use client'

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle
} from '#components/ui/sheet'
import { cn } from '#lib/utils'
import { ArrowRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { NavItem } from './types'

interface NavbarMobileMenuProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onClose: () => void
	navItems: NavItem[]
	pathname: string
	isAuthenticated: boolean
	isLoading: boolean
	user: User | null
	ctaText: string
	ctaHref: string
	onSignOut: () => void
}

export function NavbarMobileMenu({
	isOpen,
	onOpenChange,
	onClose,
	navItems,
	pathname,
	isAuthenticated,
	isLoading,
	user,
	ctaText,
	ctaHref,
	onSignOut
}: NavbarMobileMenuProps) {
	const [openDropdown, setOpenDropdown] = useState<string | null>(null)
	const [hoveredMobileItem, setHoveredMobileItem] = useState<string | null>(null)
	const [ctaHover, setCtaHover] = useState(false)
	const [ctaTap, setCtaTap] = useState(false)

	const isActiveLink = (href: string) => {
		if (href === '/') return pathname === '/'
		return pathname === href || pathname.startsWith(`${href}/`)
	}

	const handleDropdownToggle = (itemName: string) => {
		setOpenDropdown(openDropdown === itemName ? null : itemName)
	}

	const getMobileItemStyle = (itemName: string) => ({
		transform:
			hoveredMobileItem === itemName
				? `translateX(var(--translate-hover-x))`
				: 'translateX(0)',
		transition: `transform var(--transition-duration-fast) var(--ease-out)`
	})

	const getCtaClasses = () =>
		cn(
			'transition-transform duration-fast',
			ctaTap ? 'scale-95' : ctaHover ? 'scale-105' : 'scale-100'
		)

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-[300px] sm:w-[350px]">
				<SheetHeader>
					<SheetTitle className="text-left">Menu</SheetTitle>
				</SheetHeader>
				<div className="mt-6">
					<nav className="flex flex-col space-y-2">
						{navItems.map(item => (
							<div key={item.name}>
								<div
									style={getMobileItemStyle(item.name)}
									onMouseEnter={() => setHoveredMobileItem(item.name)}
									onMouseLeave={() => setHoveredMobileItem(null)}
								>
									<Link
										href={item.href}
										onClick={() => !item.hasDropdown && onClose()}
										className={cn(
											'relative flex-between px-4 py-3 text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-fast',
											isActiveLink(item.href) &&
												'text-foreground bg-muted/50 border-l-2 border-l-accent-main'
										)}
									>
										{item.name}
										{item.hasDropdown && (
											<ChevronDown
												className={cn(
													'size-4 transition-transform duration-fast',
													openDropdown === item.name && 'rotate-180'
												)}
												onClick={e => {
													e.preventDefault()
													handleDropdownToggle(item.name)
												}}
											/>
										)}
									</Link>
								</div>

								{/* Mobile Dropdown */}
								{item.hasDropdown && openDropdown === item.name && (
									<div className="ml-4 space-y-1 enter-modal">
										{item.dropdownItems?.map(dropdownItem => (
											<div
												key={dropdownItem.name}
												style={getMobileItemStyle(dropdownItem.name)}
												onMouseEnter={() => setHoveredMobileItem(dropdownItem.name)}
												onMouseLeave={() => setHoveredMobileItem(null)}
											>
												<Link
													href={dropdownItem.href}
													onClick={() => onClose()}
													className="mobile-dropdown-link"
												>
													{dropdownItem.name}
												</Link>
											</div>
										))}
									</div>
								)}
							</div>
						))}

						{/* Mobile Auth Links */}
						{isLoading ? (
							<div className="px-4 py-3 text-muted-foreground">Loading...</div>
						) : isAuthenticated ? (
							<>
								<div className="px-4 py-3 text-foreground font-medium">
									Welcome, {user?.email?.split('@')[0]}
								</div>
								<div
									style={getMobileItemStyle('signout')}
									onMouseEnter={() => setHoveredMobileItem('signout')}
									onMouseLeave={() => setHoveredMobileItem(null)}
								>
									<button
										onClick={onSignOut}
										className="block w-full text-left px-4 py-3 text-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-fast"
									>
										Sign Out
									</button>
								</div>
							</>
						) : (
							<>
								<div
									style={getMobileItemStyle('signin')}
									onMouseEnter={() => setHoveredMobileItem('signin')}
									onMouseLeave={() => setHoveredMobileItem(null)}
								>
									<Link
										href="/login"
										onClick={() => onClose()}
										className="block px-4 py-3 text-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-fast"
									>
										Sign In
									</Link>
								</div>

								{/* Mobile CTA */}
								<div
									className={getCtaClasses()}
									onMouseEnter={() => setCtaHover(true)}
									onMouseLeave={() => setCtaHover(false)}
									onMouseDown={() => setCtaTap(true)}
									onMouseUp={() => setCtaTap(false)}
								>
									<Link
										href={ctaHref}
										onClick={() => onClose()}
										className="flex-center w-full px-6 py-3 mt-4 bg-linear-to-r from-primary to-primary/80 text-primary-foreground font-medium text-sm rounded-xl hover:from-primary/90 hover:to-primary/70 transition-all duration-fast shadow-lg"
									>
										{ctaText}
										<ArrowRight className="ml-2 size-4" />
									</Link>
								</div>
							</>
						)}
					</nav>
				</div>
			</SheetContent>
		</Sheet>
	)
}
