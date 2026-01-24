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
	const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const handleDropdownOpen = (itemName: string) => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current)
			closeTimeoutRef.current = null
		}
		setOpenDropdown(itemName)
	}

	const handleDropdownClose = () => {
		closeTimeoutRef.current = setTimeout(() => {
			setOpenDropdown(null)
			closeTimeoutRef.current = null
		}, 150)
	}

	const isActiveLink = (href: string) => {
		if (href === '/') return pathname === '/'
		return pathname === href || pathname.startsWith(`${href}/`)
	}

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
		<div className="hidden md:flex items-center gap-1">
			{navItems.map(item => (
				<div
					key={item.name}
					className="relative"
					onMouseEnter={() => item.hasDropdown && handleDropdownOpen(item.name)}
					onMouseLeave={() => item.hasDropdown && handleDropdownClose()}
				>
					<Link
						href={item.href}
						onKeyDown={e => handleKeyDown(e, item)}
						className={cn(
							'flex items-center px-3 py-2 text-foreground/70 hover:text-foreground font-medium text-sm rounded-lg transition-colors duration-fast',
							isActiveLink(item.href) && 'text-foreground'
						)}
					>
						{item.name}
						{item.hasDropdown && (
							<ChevronDown
								className={cn(
									'ml-1 size-3.5 transition-transform duration-fast',
									openDropdown === item.name && 'rotate-180'
								)}
							/>
						)}
					</Link>

					{/* Dropdown Menu */}
					{item.hasDropdown && openDropdown === item.name && (
						<div
							className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1 animate-in fade-in-0 zoom-in-95 duration-150"
							onMouseEnter={() => handleDropdownOpen(item.name)}
							onMouseLeave={handleDropdownClose}
						>
							{item.dropdownItems?.map((dropdownItem, index) => (
								<Link
									key={dropdownItem.name}
									href={dropdownItem.href}
									data-dropdown-item={`${item.name}-${index}`}
									onKeyDown={e => handleKeyDown(e, item, index)}
									className="block px-4 py-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors duration-fast text-sm"
								>
									{dropdownItem.name}
								</Link>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	)
}
