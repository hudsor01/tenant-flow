'use client'

import { useState } from 'react'
import {
	Home,
	UserCircle,
	FileText,
	CreditCard,
	Wrench,
	Settings,
	ChevronDown,
	ChevronUp,
	HelpCircle,
	type LucideIcon
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface NavigationItem {
	label: string
	href: string
	icon: LucideIcon
	children?: { label: string; href: string }[]
}

interface TenantNavProps {
	onNavigate?: () => void
}

// Core navigation items for tenant portal
const coreItems: NavigationItem[] = [
	{ label: 'Dashboard', href: '/tenant', icon: Home },
	{ label: 'My Profile', href: '/tenant/profile', icon: UserCircle },
	{ label: 'My Lease', href: '/tenant/lease', icon: FileText },
	{ label: 'Maintenance', href: '/tenant/maintenance', icon: Wrench },
	{ label: 'Documents', href: '/tenant/documents', icon: FileText }
]

// Collapsible Payments section
const paymentsSection: NavigationItem = {
	label: 'Payments',
	href: '/tenant/payments',
	icon: CreditCard,
	children: [
		{ label: 'Autopay', href: '/tenant/payments/autopay' },
		{ label: 'Payment Methods', href: '/tenant/payments/methods' },
		{ label: 'Payment History', href: '/tenant/payments/history' }
	]
}

// Settings menu
function SettingsMenu({ onNavigate }: { onNavigate: () => void }) {
	const [isOpen, setIsOpen] = useState(false)

	const handleLinkClick = () => {
		setIsOpen(false)
		onNavigate()
	}

	return (
		<div className="mt-auto pt-4 border-t border-border relative">
			{/* Dropdown menu - opens upward */}
			{isOpen && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={() => setIsOpen(false)}
					/>
					<div className="absolute bottom-full left-0 right-0 mb-2 mx-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
						<div className="py-1">
							<Link
								href="/help"
								onClick={handleLinkClick}
								className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
							>
								<HelpCircle className="w-4 h-4 text-muted-foreground" />
								Help & Support
							</Link>
						</div>
					</div>
				</>
			)}

			<button
				onClick={() => setIsOpen(!isOpen)}
				className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors ${isOpen ? 'bg-muted' : ''}`}
			>
				<div className="flex items-center gap-3">
					<Settings className="w-5 h-5 text-muted-foreground" />
					Settings
				</div>
				<ChevronUp
					className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
				/>
			</button>
		</div>
	)
}

export function TenantNav({ onNavigate }: TenantNavProps) {
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
	const pathname = usePathname()

	// Always define a handler function (noop if not provided)
	const handleNavigate = () => {
		onNavigate?.()
	}

	const isActive = (href: string) => {
		if (href === '/tenant') return pathname === '/tenant'
		return pathname.startsWith(href)
	}

	const toggleExpanded = (label: string) => {
		setExpandedItems(prev => {
			const next = new Set(prev)
			if (next.has(label)) {
				next.delete(label)
			} else {
				next.add(label)
			}
			return next
		})
	}

	const renderNavItem = (item: NavigationItem) => {
		const hasChildren = item.children && item.children.length > 0
		const isExpanded = expandedItems.has(item.label)
		const active = isActive(item.href)
		const Icon = item.icon

		if (hasChildren) {
			return (
				<div key={item.label}>
					<button
						onClick={() => toggleExpanded(item.label)}
						className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
					>
						<div className="flex items-center gap-3">
							<Icon className="w-5 h-5 text-muted-foreground" />
							{item.label}
						</div>
						<ChevronDown
							className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
								isExpanded ? 'rotate-180' : ''
							}`}
						/>
					</button>
					<div
						className={`overflow-hidden transition-all duration-200 ${
							isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
						}`}
					>
						<div className="ml-8 py-1 space-y-0.5">
							{item.children!.map(child => {
								const childActive = pathname === child.href
								return (
									<Link
										key={child.href}
										href={child.href}
										onClick={handleNavigate}
										className={`
											w-full flex items-center gap-3 px-3 py-2 rounded-lg
											text-sm transition-colors
											${
												childActive
													? 'text-primary font-medium bg-primary/5'
													: 'text-muted-foreground hover:text-foreground hover:bg-muted'
											}
										`}
									>
										{child.label}
									</Link>
								)
							})}
						</div>
					</div>
				</div>
			)
		}

		return (
			<Link
				key={item.href}
				href={item.href}
				onClick={handleNavigate}
				className={`
					w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
					text-sm font-medium transition-colors
					${active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}
				`}
			>
				<Icon className={active ? 'w-5 h-5 text-primary' : 'w-5 h-5 text-muted-foreground'} />
				{item.label}
			</Link>
		)
	}

	return (
		<nav className="flex-1 flex flex-col px-3 py-2 overflow-y-auto">
			{/* Core navigation */}
			<div className="space-y-0.5">{coreItems.map(renderNavItem)}</div>

			{/* Payments section */}
			<div className="mt-6 pt-4 border-t border-border space-y-0.5">
				{renderNavItem(paymentsSection)}
			</div>

			{/* Settings */}
			<SettingsMenu onNavigate={handleNavigate} />
		</nav>
	)
}
