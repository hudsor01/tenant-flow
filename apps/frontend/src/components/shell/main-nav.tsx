'use client'

import { useState } from 'react'
import {
	Home,
	Building2,
	Users,
	FileText,
	Wrench,
	BarChart3,
	Receipt,
	Settings,
	ChevronDown,
	ChevronUp,
	FilePlus,
	FileCheck,
	HelpCircle,
	Keyboard,
	ClipboardList,
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

export interface DocumentItem {
	label: string
	href: string
	icon: LucideIcon
}

interface MainNavProps {
	onNavigate?: () => void
}

// Core navigation items
const coreItems: NavigationItem[] = [
	{ label: 'Dashboard', href: '/dashboard', icon: Home },
	{ label: 'Properties', href: '/properties', icon: Building2 },
	{ label: 'Tenants', href: '/tenants', icon: Users },
	{ label: 'Leases', href: '/leases', icon: ClipboardList },
	{ label: 'Maintenance', href: '/maintenance', icon: Wrench }
]

// Collapsible sections
const analyticsItems: NavigationItem[] = [
	{
		label: 'Analytics',
		href: '/analytics',
		icon: BarChart3,
		children: [
			{ label: 'Overview', href: '/analytics/overview' },
			{ label: 'Financial', href: '/analytics/financial' },
			{ label: 'Property Performance', href: '/analytics/property-performance' }
			// Domain-specific analytics (Leases, Maintenance, Occupancy) are now
			// available via "Insights" tabs on their respective main pages
		]
	},
	{
		label: 'Reports',
		href: '/reports',
		icon: FileText,
		children: [{ label: 'Generate Reports', href: '/reports/generate' }]
	},
	{
		label: 'Financials',
		href: '/financials',
		icon: Receipt,
		children: [
			{ label: 'Rent Collection', href: '/rent-collection' },
			{ label: 'Income Statement', href: '/financials/income-statement' },
			{ label: 'Cash Flow', href: '/financials/cash-flow' },
			{ label: 'Balance Sheet', href: '/financials/balance-sheet' },
			{ label: 'Tax Documents', href: '/financials/tax-documents' }
		]
	}
]

// Document items
const documentItems: DocumentItem[] = [
	{ label: 'Generate Lease', href: '/leases/new', icon: FilePlus },
	{ label: 'Lease Template', href: '/documents/lease-template', icon: FileCheck }
]

// Settings menu with upward dropdown
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
					{/* Backdrop */}
					<div
						className="fixed inset-0 z-40"
						onClick={() => setIsOpen(false)}
					/>
					{/* Menu */}
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
							<div className="my-1 border-t border-border" />
							<button
								onClick={() => setIsOpen(false)}
								className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
							>
								<div className="flex items-center gap-3">
									<Keyboard className="w-4 h-4 text-muted-foreground" />
									Keyboard Shortcuts
								</div>
								<kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border border-border">
									?
								</kbd>
							</button>
						</div>
					</div>
				</>
			)}

			{/* Settings button */}
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

export function MainNav({ onNavigate }: MainNavProps) {
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
	const pathname = usePathname()

	// Always define a handler function (noop if not provided)
	const handleNavigate = () => {
		onNavigate?.()
	}

	const isActive = (href: string) => {
		if (href === '/dashboard') return pathname === '/dashboard'
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

			{/* Analytics & Reports section */}
			<div className="mt-6 pt-4 border-t border-border space-y-0.5">
				{analyticsItems.map(renderNavItem)}
			</div>

			{/* Documents section */}
			<div className="mt-6 pt-4 border-t border-border">
				<p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
					Documents
				</p>
				<div className="space-y-0.5">
					{documentItems.map(item => {
						const Icon = item.icon
						return (
							<Link
								key={item.href}
								href={item.href}
								onClick={handleNavigate}
								className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
							>
								<Icon className="w-5 h-5 text-muted-foreground" />
								{item.label}
							</Link>
						)
					})}
				</div>
			</div>

			{/* Settings with upward dropdown */}
			<SettingsMenu onNavigate={handleNavigate} />
		</nav>
	)
}
