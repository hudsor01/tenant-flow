'use client'

import {
	Home,
	Building2,
	Users,
	ClipboardList,
	Wrench,
	BarChart3,
	FileText,
	Receipt,
	Sparkles
} from 'lucide-react'
import { AppShell } from './AppShell'

interface ShellWrapperProps {
	children?: React.ReactNode
}

/**
 * ShellWrapper - Provides TenantFlow navigation for screen design previews
 *
 * Synced with: apps/frontend/src/components/dashboard/app-sidebar.tsx
 */
export function ShellWrapper({ children }: ShellWrapperProps) {
	// Main navigation items (from navMain in app-sidebar.tsx)
	const navigationItems = [
		{
			label: 'Dashboard',
			href: '/dashboard',
			icon: <Home className="w-5 h-5" />
		},
		{
			label: 'Properties',
			href: '/properties',
			icon: <Building2 className="w-5 h-5" />
		},
		{
			label: 'Tenants',
			href: '/tenants',
			icon: <Users className="w-5 h-5" />
		},
		{
			label: 'Leases',
			href: '/leases',
			icon: <ClipboardList className="w-5 h-5" />
		},
		{
			label: 'Maintenance',
			href: '/maintenance',
			icon: <Wrench className="w-5 h-5" />
		},
		// Collapsible sections (from navCollapsible in app-sidebar.tsx)
		{
			label: 'Analytics',
			href: '/analytics',
			icon: <BarChart3 className="w-5 h-5" />,
			children: [
				{ label: 'Overview', href: '/analytics/overview' },
				{ label: 'Financial', href: '/analytics/financial' },
				{
					label: 'Property Performance',
					href: '/analytics/property-performance'
				},
				{ label: 'Leases', href: '/analytics/leases' },
				{ label: 'Maintenance', href: '/analytics/maintenance' },
				{ label: 'Occupancy', href: '/analytics/occupancy' }
			]
		},
		{
			label: 'Reports',
			href: '/reports',
			icon: <FileText className="w-5 h-5" />,
			children: [{ label: 'Generate Reports', href: '/reports/generate' }]
		},
		{
			label: 'Financials',
			href: '/financials',
			icon: <Receipt className="w-5 h-5" />,
			children: [
				{ label: 'Rent Collection', href: '/rent-collection' },
				{ label: 'Income Statement', href: '/financials/income-statement' },
				{ label: 'Cash Flow', href: '/financials/cash-flow' },
				{ label: 'Balance Sheet', href: '/financials/balance-sheet' },
				{ label: 'Tax Documents', href: '/financials/tax-documents' }
			]
		}
	]

	// Document items (from documents in app-sidebar.tsx)
	const documentItems = [
		{
			label: 'Generate Lease',
			href: '/leases/new',
			icon: <FileText className="w-5 h-5" />
		},
		{
			label: 'Lease Template',
			href: '/documents/lease-template',
			icon: <ClipboardList className="w-5 h-5" />
		}
	]

	const user = {
		name: 'Demo User',
		email: 'demo@tenantflow.io'
	}

	return (
		<AppShell
			navigationItems={navigationItems}
			documentItems={documentItems}
			user={user}
			productName="TenantFlow"
			productIcon={<Sparkles className="w-5 h-5" />}
			onNavigate={href => console.log('Navigate to:', href)}
			onLogout={() => console.log('Logout')}
			onHelp={() => console.log('Help')}
			onSearch={() => console.log('Search')}
		>
			{children}
		</AppShell>
	)
}

export default ShellWrapper
