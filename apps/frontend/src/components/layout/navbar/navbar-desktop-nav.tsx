'use client'

import type { KeyboardEvent } from 'react'

import { cn } from '#lib/utils'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'
import type { NavItem } from './types'

interface NavbarDesktopNavProps {
	navItems: NavItem[]
	pathname: string
}

export function NavbarDesktopNav({ navItems, pathname }: NavbarDesktopNavProps) {
	const [openDropdown, setOpenDropdown] = useState<string | null>(null)
	const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null)
	const [hoveredDropdownItem, setHoveredDropdownItem] = useState<string | null>(null)
	const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const handleDropdownOpen = (itemName: string) => {
		// Clear any pending close timeout
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current)
			closeTimeoutRef.current = null
		}
		setOpenDropdown(itemName)
	}

	const handleDropdownClose = () => {
		// Delay closing to allow mouse to move to dropdown
		closeTimeoutRef.current = setTimeout(() => {
			setOpenDropdown(null)
			closeTimeoutRef.current = null
		}, 150)
	}

	const isActiveLink = (href: string) => {
		if (href === '/') return pathname === '/'
		return pathname === href || pathname.startsWith(`${href}/`)
	}

	const getNavItemStyle = (itemName: string) => ({
		transform:
			hoveredNavItem === itemName ? `scale(var(--scale-hover))` : 'scale(1)',
		transition: `transform var(--duration-fast) var(--ease-out)`
	})

	const getDropdownItemStyle = (itemName: string) => ({
		transform:
			hoveredDropdownItem === itemName
				? `translateX(var(--translate-hover-x))`
				: 'translateX(0)',
		transition: `transform var(--duration-fast) var(--ease-out)`
	})

	const handleKeyDown = (
		event: KeyboardEvent,
		item: NavItem,
		dropdownIndex?: number
	) => {
		if (!item.hasDropdown || !item.dropdownItems) return

		const currentIndex = dropdownIndex ?? -1
		const maxIndex = item.dropdownItems.length - 1

		switch (event.key) {
			case 'Escape':
				setOpenDropdown(null)
				event.preventDefault()
				break
			case 'ArrowDown':
				event.preventDefault()
				if (openDropdown !== item.name) {
					setOpenDropdown(item.name)
				} else if (currentIndex < maxIndex) {
					const nextIndex = currentIndex + 1
					const nextEl = document.querySelector(
						`[data-dropdown-item="${item.name}-${nextIndex}"]`
					) as HTMLElement
					nextEl?.focus()
				}
				break
			case 'ArrowUp':
				event.preventDefault()
				if (currentIndex > 0) {
					const prevIndex = currentIndex - 1
					const prevEl = document.querySelector(
						`[data-dropdown-item="${item.name}-${prevIndex}"]`
					) as HTMLElement
					prevEl?.focus()
				} else {
					setOpenDropdown(null)
				}
				break
			case 'Enter':
				if (openDropdown === item.name && currentIndex === -1) {
					event.preventDefault()
					setOpenDropdown(null)
				}
				break
		}
	}

	return (
		<div className="hidden md:flex items-center space-x-1">
			{navItems.map(item => (
				<div
					key={item.name}
					className="relative"
					onMouseEnter={() => {
						if (item.hasDropdown) handleDropdownOpen(item.name)
						setHoveredNavItem(item.name)
					}}
					onMouseLeave={() => {
						if (item.hasDropdown) handleDropdownClose()
						setHoveredNavItem(null)
					}}
				>
					<div style={getNavItemStyle(item.name)}>
						<Link
							href={item.href}
							onKeyDown={e => handleKeyDown(e, item)}
							className={cn(
								'relative flex items-center px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-muted/50 transition-all duration-fast',
								isActiveLink(item.href) &&
									'text-foreground after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-accent-main after:animate-in after:slide-in-from-bottom-1'
							)}
						>
							{item.name}
							{item.hasDropdown && (
								<ChevronDown className="ml-1 size-4 transition-transform duration-fast" />
							)}
						</Link>
					</div>

					{/* Dropdown Menu */}
					{item.hasDropdown && openDropdown === item.name && (
						<div
							className={cn(
								'absolute top-full left-0 mt-2 w-56 bg-background/98 backdrop-blur-lg rounded-xl shadow-xl border border-border/50 py-2',
								'enter-modal'
							)}
							onMouseEnter={() => handleDropdownOpen(item.name)}
							onMouseLeave={handleDropdownClose}
						>
							{item.dropdownItems?.map((dropdownItem, index) => (
								<div
									key={dropdownItem.name}
									style={getDropdownItemStyle(dropdownItem.name)}
									onMouseEnter={() => setHoveredDropdownItem(dropdownItem.name)}
									onMouseLeave={() => setHoveredDropdownItem(null)}
								>
									<Link
										href={dropdownItem.href}
										data-dropdown-item={`${item.name}-${index}`}
										onKeyDown={e => handleKeyDown(e, item, index)}
										className="block px-4 py-2.5 text-foreground hover:bg-primary/5 hover:text-primary transition-all duration-fast font-medium text-sm"
									>
										{dropdownItem.name}
									</Link>
								</div>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	)
}
