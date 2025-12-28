'use client'

import { useState } from 'react'
import {
	Home,
	Building2,
	Users,
	FileText,
	Wrench,
	BarChart3,
	FileSpreadsheet,
	DollarSign,
	CreditCard,
	Settings,
	ChevronDown,
	ChevronUp,
	FilePlus,
	FileCheck,
	HelpCircle,
	MessageSquare,
	BookOpen,
	Keyboard
} from 'lucide-react'
import type { NavigationItem, DocumentItem } from './AppShell'

interface MainNavProps {
	items: NavigationItem[]
	documentItems?: DocumentItem[]
	onNavigate?: (href: string) => void
	onHelp?: () => void
}

// Default icons for navigation items
const defaultIcons: Record<string, React.ReactNode> = {
	dashboard: <Home className="w-5 h-5" />,
	properties: <Building2 className="w-5 h-5" />,
	tenants: <Users className="w-5 h-5" />,
	leases: <FileText className="w-5 h-5" />,
	payments: <CreditCard className="w-5 h-5" />,
	financials: <DollarSign className="w-5 h-5" />,
	maintenance: <Wrench className="w-5 h-5" />,
	analytics: <BarChart3 className="w-5 h-5" />,
	reports: <FileSpreadsheet className="w-5 h-5" />,
	settings: <Settings className="w-5 h-5" />
}

// Default document icons
const defaultDocIcons: Record<string, React.ReactNode> = {
	'generate-lease': <FilePlus className="w-5 h-5" />,
	'lease-template': <FileCheck className="w-5 h-5" />
}

function getIcon(label: string, icon?: React.ReactNode): React.ReactNode {
	if (icon) return icon
	const key = label.toLowerCase().replace(/\s+/g, '-')
	return defaultIcons[key] || <FileText className="w-5 h-5" />
}

function getDocIcon(label: string, icon?: React.ReactNode): React.ReactNode {
	if (icon) return icon
	const key = label.toLowerCase().replace(/\s+/g, '-')
	return defaultDocIcons[key] || <FileText className="w-5 h-5" />
}

// Settings menu with upward dropdown
function SettingsMenu({ onNavigate }: { onNavigate?: (href: string) => void }) {
	const [isOpen, setIsOpen] = useState(false)

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
							<button
								onClick={() => {
									onNavigate?.('/help')
									setIsOpen(false)
								}}
								className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
							>
								<HelpCircle className="w-4 h-4 text-muted-foreground" />
								Help & Support
							</button>
							<button
								onClick={() => {
									onNavigate?.('/docs')
									setIsOpen(false)
								}}
								className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
							>
								<BookOpen className="w-4 h-4 text-muted-foreground" />
								Documentation
							</button>
							<button
								onClick={() => {
									onNavigate?.('/feedback')
									setIsOpen(false)
								}}
								className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
							>
								<MessageSquare className="w-4 h-4 text-muted-foreground" />
								Send Feedback
							</button>
							<div className="my-1 border-t border-border" />
							<button
								onClick={() => {
									// Could trigger keyboard shortcut modal
									setIsOpen(false)
								}}
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

export function MainNav({
	items,
	documentItems = [],
	onNavigate
}: MainNavProps) {
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

	// Determine active nav from URL
	const path = window.location.pathname
	const getIsActive = (label: string) =>
		path.toLowerCase().includes(label.toLowerCase())

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

	// Separate core nav (Dashboard, Properties, Tenants, Leases, Maintenance) from analytics section
	const coreLabels = [
		'Dashboard',
		'Properties',
		'Tenants',
		'Leases',
		'Maintenance'
	]
	const analyticsLabels = ['Analytics', 'Reports', 'Financials']

	const coreItems = items.filter(
		item => coreLabels.includes(item.label) && !item.children
	)
	const analyticsItems = items.filter(
		item => analyticsLabels.includes(item.label) || item.children
	)
	const otherItems = items.filter(
		item =>
			!coreLabels.includes(item.label) &&
			!analyticsLabels.includes(item.label) &&
			!item.children
	)

	const renderNavItem = (item: NavigationItem) => {
		const hasChildren = item.children && item.children.length > 0
		const isExpanded = expandedItems.has(item.label)
		const isActive = getIsActive(item.label)

		if (hasChildren) {
			return (
				<div key={item.label}>
					<button
						onClick={() => toggleExpanded(item.label)}
						className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
					>
						<div className="flex items-center gap-3">
							<span className="text-muted-foreground">
								{getIcon(item.label, item.icon)}
							</span>
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
							{item.children!.map(child => (
								<button
									key={child.href}
									onClick={() => onNavigate?.(child.href)}
									className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg
                    text-sm transition-colors
                    ${
											child.isActive
												? 'text-primary font-medium bg-primary/5'
												: 'text-muted-foreground hover:text-foreground hover:bg-muted'
										}
                  `}
								>
									{child.label}
								</button>
							))}
						</div>
					</div>
				</div>
			)
		}

		return (
			<button
				key={item.href}
				onClick={() => onNavigate?.(item.href)}
				className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
          text-sm font-medium transition-colors
          ${
						isActive
							? 'bg-primary/10 text-primary'
							: 'text-foreground hover:bg-muted'
					}
        `}
			>
				<span className={isActive ? 'text-primary' : 'text-muted-foreground'}>
					{getIcon(item.label, item.icon)}
				</span>
				{item.label}
			</button>
		)
	}

	return (
		<nav className="flex-1 flex flex-col px-3 py-2 overflow-y-auto">
			{/* Core navigation - Dashboard, Properties, Tenants, Leases, Maintenance */}
			<div className="space-y-0.5">{coreItems.map(renderNavItem)}</div>

			{/* Analytics & Reports section - with visual separator */}
			{analyticsItems.length > 0 && (
				<div className="mt-6 pt-4 border-t border-border space-y-0.5">
					{analyticsItems.map(renderNavItem)}
				</div>
			)}

			{/* Other items */}
			{otherItems.length > 0 && (
				<div className="mt-4 space-y-0.5">{otherItems.map(renderNavItem)}</div>
			)}

			{/* Documents section */}
			{documentItems.length > 0 && (
				<div className="mt-6 pt-4 border-t border-border">
					<p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
						Documents
					</p>
					<div className="space-y-0.5">
						{documentItems.map(item => (
							<button
								key={item.href}
								onClick={() => onNavigate?.(item.href)}
								className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
							>
								<span className="text-muted-foreground">
									{getDocIcon(item.label, item.icon)}
								</span>
								{item.label}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Bottom - Settings with upward dropdown */}
			<SettingsMenu onNavigate={onNavigate} />
		</nav>
	)
}
