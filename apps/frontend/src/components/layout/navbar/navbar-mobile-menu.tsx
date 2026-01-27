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

	const isActiveLink = (href: string) => {
		if (href === '/') return pathname === '/'
		return pathname === href || pathname.startsWith(`${href}/`)
	}

	const handleDropdownToggle = (itemName: string) => {
		setOpenDropdown(openDropdown === itemName ? null : itemName)
	}

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-[300px] sm:w-[350px]">
				<SheetHeader>
					<SheetTitle className="text-left">Menu</SheetTitle>
				</SheetHeader>
				<div className="mt-6">
					<nav className="flex flex-col gap-1">
						{navItems.map(item => (
							<div key={item.name}>
								<Link
									href={item.href}
									onClick={() => !item.hasDropdown && onClose()}
									className={cn(
										'flex items-center justify-between px-4 py-3 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-fast',
										isActiveLink(item.href) && 'text-foreground bg-muted/50'
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

								{/* Mobile Dropdown */}
								{item.hasDropdown && openDropdown === item.name && (
									<div className="ml-4 mt-1 space-y-1">
										{item.dropdownItems?.map(dropdownItem => (
											<Link
												key={dropdownItem.name}
												href={dropdownItem.href}
												onClick={() => onClose()}
												className="block px-4 py-2.5 text-foreground/60 hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors duration-fast text-sm"
											>
												{dropdownItem.name}
											</Link>
										))}
									</div>
								)}
							</div>
						))}

						{/* Divider */}
						<div className="my-2 border-t border-border/50" />

						{/* Mobile Auth Links */}
						{isLoading ? (
							<div className="px-4 py-3 text-foreground/50 text-sm">Loading...</div>
						) : isAuthenticated ? (
							<>
								<div className="px-4 py-2 text-foreground/60 text-sm">
									{user?.email?.split('@')[0]}
								</div>
								<button
									onClick={onSignOut}
									className="w-full text-left px-4 py-3 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-fast"
								>
									Sign Out
								</button>
							</>
						) : (
							<>
								<Link
									href="/login"
									onClick={() => onClose()}
									className="block px-4 py-3 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-fast"
								>
									Sign In
								</Link>

								{/* Mobile CTA - Solid dark button */}
								<Link
									href={ctaHref}
									onClick={() => onClose()}
									className="flex items-center justify-center w-full px-6 py-3 mt-2 bg-foreground text-background font-medium text-sm rounded-lg hover:bg-foreground/90 transition-colors duration-fast"
								>
									{ctaText}
									<ArrowRight className="ml-2 size-4" />
								</Link>
							</>
						)}
					</nav>
				</div>
			</SheetContent>
		</Sheet>
	)
}
