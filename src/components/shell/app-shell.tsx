'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import {
	Home,
	Building2,
	Users,
	ClipboardList,
	Wrench,
	BarChart3,
	FileText,
	Receipt,
	FilePlus,
	FileCheck,
	Bell,
	Settings,
	HelpCircle
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { QuickActionsDock } from './quick-actions-dock'
import { generateBreadcrumbs } from '#lib/breadcrumbs'
import { useSupabaseUser } from '#hooks/api/use-auth'
import { useSignOutMutation } from '#hooks/api/use-auth-mutations'
import { usePropertyList } from '#hooks/api/use-properties'
import { useTenantList } from '#hooks/api/use-tenant'
import { AppShellSidebar } from './app-shell-sidebar'
import { AppShellHeader } from './app-shell-header'
import { AppShellSearch } from './app-shell-search'

export interface AppShellProps {
	children: ReactNode
	showQuickActionsDock?: boolean
}

export function AppShell({ children, showQuickActionsDock = true }: AppShellProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [commandOpen, setCommandOpen] = useState(false)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const sidebarRef = useRef<HTMLElement>(null)
	const pathname = usePathname()
	const breadcrumbs = generateBreadcrumbs(pathname)
	const { data: user } = useSupabaseUser()
	const signOutMutation = useSignOutMutation()
	const router = useRouter()
	const { data: properties } = usePropertyList({ limit: 6 })
	const { data: tenantsResponse } = useTenantList(1, 6)

	// Get user initials
	const userName = user?.user_metadata?.full_name || user?.email || 'User'
	const userEmail = user?.email || ''
	const userInitials = userName
		.split(' ')
		.map((n: string) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

	const tenantItems = (() => {
		const tenants = tenantsResponse?.data ?? []
		return tenants.map(tenant => {
			const fullName =
				tenant.name ||
				(tenant.first_name && tenant.last_name
					? `${tenant.first_name} ${tenant.last_name}`.trim()
					: tenant.first_name || tenant.last_name || 'Unknown')
			return {
				id: tenant.id,
				label: fullName,
				subtitle: tenant.email ?? '',
				href: `/tenants/${tenant.id}`
			}
		})
	})()

	const propertyItems = (properties ?? []).map(property => ({
		id: property.id,
		label: property.name,
		subtitle: [property.city, property.state].filter(Boolean).join(', '),
		href: `/properties/${property.id}`
	}))

	const commandGroups = [
			{
				heading: 'Navigation',
				items: [
					{ label: 'Dashboard', href: '/dashboard', icon: Home },
					{ label: 'Properties', href: '/properties', icon: Building2 },
					{ label: 'Tenants', href: '/tenants', icon: Users },
					{ label: 'Leases', href: '/leases', icon: ClipboardList },
					{ label: 'Maintenance', href: '/maintenance', icon: Wrench }
				]
			},
			{
				heading: 'Analytics & Reports',
				items: [
					{ label: 'Analytics Overview', href: '/analytics/overview', icon: BarChart3 },
					{ label: 'Financial Analytics', href: '/analytics/financial', icon: BarChart3 },
					{ label: 'Property Performance', href: '/analytics/property-performance', icon: BarChart3 },
					{ label: 'Leases Analytics', href: '/analytics/leases', icon: BarChart3 },
					{ label: 'Maintenance Analytics', href: '/analytics/maintenance', icon: BarChart3 },
					{ label: 'Occupancy Analytics', href: '/analytics/occupancy', icon: BarChart3 },
					{ label: 'Reports', href: '/reports', icon: FileText },
					{ label: 'Generate Report', href: '/reports/generate', icon: FileText }
				]
			},
			{
				heading: 'Financials',
				items: [
					{ label: 'Financials', href: '/financials', icon: Receipt },
					{ label: 'Income Statement', href: '/financials/income-statement', icon: Receipt },
					{ label: 'Cash Flow', href: '/financials/cash-flow', icon: Receipt },
					{ label: 'Balance Sheet', href: '/financials/balance-sheet', icon: Receipt },
					{ label: 'Tax Documents', href: '/financials/tax-documents', icon: Receipt }
				]
			},
			{
				heading: 'Documents',
				items: [
					{ label: 'Generate Lease', href: '/leases/new', icon: FilePlus },
					{ label: 'Lease Template', href: '/documents/lease-template', icon: FileCheck }
				]
			}
	]

	const commandActions = [
		{ label: 'Notifications', href: '/settings?tab=notifications', icon: Bell },
		{ label: 'Settings', href: '/settings', icon: Settings },
		{ label: 'Profile', href: '/profile', icon: Settings },
		{ label: 'Help & Support', href: '/help', icon: HelpCircle }
	]

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
				event.preventDefault()
				setCommandOpen(prev => !prev)
			}
		}

		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	const closeSidebar = () => {
		setSidebarOpen(false)
		triggerRef.current?.focus()
	}

	// Escape key handler + focus trap for mobile sidebar
	useEffect(() => {
		if (!sidebarOpen) return
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setSidebarOpen(false)
				triggerRef.current?.focus()
				return
			}
			if (e.key === 'Tab' && sidebarRef.current) {
				const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
					'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
				)
				if (focusable.length === 0) return
				const first = focusable[0]!
				const last = focusable[focusable.length - 1]!
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault()
					last.focus()
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault()
					first.focus()
				}
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [sidebarOpen])

	const handleCommandSelect = (href: string) => {
		setCommandOpen(false)
		router.push(href)
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Skip to content */}
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
			>
				Skip to content
			</a>

			{/* Mobile sidebar overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
					onClick={closeSidebar}
				/>
			)}

			<AppShellSidebar
				sidebarRef={sidebarRef}
				sidebarOpen={sidebarOpen}
				closeSidebar={closeSidebar}
				onCommandOpen={() => setCommandOpen(true)}
			/>

			{/* Main content area */}
			<div className="lg:pl-56 flex flex-col min-h-screen">
				<AppShellHeader
					triggerRef={triggerRef}
					onSidebarOpen={() => setSidebarOpen(true)}
					breadcrumbs={breadcrumbs}
					user={user ?? null}
					userInitials={userInitials}
					userName={userName}
					userEmail={userEmail}
					onSignOut={() => signOutMutation.mutate()}
				/>

				{/* Page content */}
				<main id="main-content" className="flex-1 bg-muted/30 pb-24 sm:pb-6">
					<div className="p-4 lg:p-6">{children}</div>
				</main>
			</div>

			{/* Quick Actions Dock */}
			{showQuickActionsDock && <QuickActionsDock />}

			<AppShellSearch
				open={commandOpen}
				onOpenChange={setCommandOpen}
				propertyItems={propertyItems}
				tenantItems={tenantItems}
				commandGroups={commandGroups}
				commandActions={commandActions}
				user={user}
				onSelect={handleCommandSelect}
				onSignOut={() => signOutMutation.mutate()}
			/>
		</div>
	)
}
