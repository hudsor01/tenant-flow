'use client'

import {
	BarChart3,
	Building2,
	Calculator,
	CircleDollarSign,
	ClipboardList,
	FileText,
	Home,
	LayoutDashboard,
	LineChart,
	PieChart,
	Receipt,
	Settings,
	TrendingUp,
	Users,
	Wallet,
	Wrench,
	type LucideIcon
} from 'lucide-react'
import Link from 'next/link'

import { NavDocuments } from '#components/dashboard/nav-documents'
import { NavMain } from '#components/dashboard/nav-main'
import { NavSecondary } from '#components/dashboard/nav-secondary'

const navigation: {
	navMain: {
		title: string
		url: string
		icon?: LucideIcon
		children?: {
			title: string
			url: string
			icon?: LucideIcon
		}[]
	}[]
	navSecondary: {
		title: string
		url: string
		icon: LucideIcon
	}[]
	documents: {
		name: string
		url: string
		icon: LucideIcon
	}[]
} = {
	navMain: [
		{
			title: 'Dashboard',
			url: '/dashboard',
			icon: Home
		},
		{
			title: 'Properties',
			url: '/properties',
			icon: Building2
		},
		{
			title: 'Tenants',
			url: '/tenants',
			icon: Users
		},
		{
			title: 'Leases',
			url: '/leases',
			icon: ClipboardList
		},
		{
			title: 'Maintenance',
			url: '/maintenance',
			icon: Wrench
		},
		{
			title: 'Analytics',
			url: '/analytics',
			icon: BarChart3,
			children: [
				{
					title: 'Overview',
					url: '/analytics/overview',
					icon: LayoutDashboard
				},
				{
					title: 'Financial Analytics',
					url: '/analytics/financial',
					icon: CircleDollarSign
				},
				{
					title: 'Property Performance',
					url: '/analytics/property-performance',
					icon: TrendingUp
				},
				{
					title: 'Lease Analytics',
					url: '/analytics/leases',
					icon: ClipboardList
				},
				{
					title: 'Maintenance Insights',
					url: '/analytics/maintenance',
					icon: Wrench
				},
				{
					title: 'Occupancy Trends',
					url: '/analytics/occupancy',
					icon: LineChart
				}
			]
		},
		{
			title: 'Reports',
			url: '/reports',
			icon: FileText,
			children: [
				{
					title: 'Generate Reports',
					url: '/reports/generate',
					icon: PieChart
				}
			]
		},
		{
			title: 'Financials',
			url: '/financials',
			icon: Receipt,
			children: [
				{
					title: 'Income Statement',
					url: '/financials/income-statement',
					icon: TrendingUp
				},
				{
					title: 'Cash Flow',
					url: '/financials/cash-flow',
					icon: Wallet
				},
				{
					title: 'Balance Sheet',
					url: '/financials/balance-sheet',
					icon: Calculator
				},
				{
					title: 'Tax Documents',
					url: '/financials/tax-documents',
					icon: Receipt
				}
			]
		}
	],
	navSecondary: [
		{
			title: 'Settings',
			url: '/dashboard/settings',
			icon: Settings
		}
	],
	documents: [
		{
			name: 'Generate Lease',
			url: '/leases/generate',
			icon: FileText
		},
		{
			name: 'Lease Template',
			url: '/documents/lease-template',
			icon: ClipboardList
		}
	]
}

export function AppSidebar() {
	return (
		<div className="flex h-full flex-col gap-4 p-4">
			{/* Card 1: Brand */}
			<div className="rounded-xl border border-gray-200 bg-white p-4">
				<Link href="/dashboard" className="flex items-center gap-2">
					<Home className="w-5 h-5" />
					<span className="text-base font-semibold">TenantFlow</span>
				</Link>
			</div>

			{/* Card 2: Search */}
			<div className="rounded-xl border border-gray-200 bg-white p-4">
				<div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
					<span className="text-sm text-gray-400">Search</span>
					<kbd className="ml-auto rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-500">
						⌘K
					</kbd>
				</div>
			</div>

			{/* Card 3: Navigation */}
			<div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
				<div className="flex h-full flex-col overflow-y-auto p-4">
					<NavMain items={navigation.navMain} />
					<NavDocuments items={navigation.documents} />
				</div>
			</div>

			{/* Card 4: Settings */}
			<div className="rounded-xl border border-gray-200 bg-white p-2">
				<NavSecondary items={navigation.navSecondary} />
			</div>
		</div>
	)
}
