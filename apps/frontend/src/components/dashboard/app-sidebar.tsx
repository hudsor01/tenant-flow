'use client'

import {
	BarChart3,
	Building2,
	Calculator,
	Calendar,
	CircleDollarSign,
	ClipboardList,
	FileText,
	FolderOpen,
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
import * as React from 'react'

import { NavDocuments } from '@/components/dashboard/nav-documents'
import { NavMain } from '@/components/dashboard/nav-main'
import { NavSecondary } from '@/components/dashboard/nav-secondary'
import { NavUser } from '@/components/dashboard/nav-user'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from '@/components/ui/sidebar'

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
			url: '/manage',
			icon: Home
		},
		{
			title: 'Properties',
			url: '/manage/properties',
			icon: Building2
		},
		{
			title: 'Tenants',
			url: '/manage/tenants',
			icon: Users
		},
		{
			title: 'Leases',
			url: '/manage/leases',
			icon: ClipboardList
		},
		{
			title: 'Maintenance',
			url: '/manage/maintenance',
			icon: Wrench
		},
		{
			title: 'Analytics',
			url: '/manage/analytics',
			icon: BarChart3,
			children: [
				{
					title: 'Overview',
					url: '/manage/analytics/overview',
					icon: LayoutDashboard
				},
				{
					title: 'Financial Analytics',
					url: '/manage/analytics/financial',
					icon: CircleDollarSign
				},
				{
					title: 'Property Performance',
					url: '/manage/analytics/property-performance',
					icon: TrendingUp
				},
				{
					title: 'Lease Analytics',
					url: '/manage/analytics/leases',
					icon: ClipboardList
				},
				{
					title: 'Maintenance Insights',
					url: '/manage/analytics/maintenance',
					icon: Wrench
				},
				{
					title: 'Occupancy Trends',
					url: '/manage/analytics/occupancy',
					icon: LineChart
				}
			]
		},
		{
			title: 'Reports',
			url: '/manage/reports',
			icon: FileText,
			children: [
				{
					title: 'Generate Reports',
					url: '/manage/reports/generate',
					icon: PieChart
				},
				{
					title: 'Report Library',
					url: '/manage/reports/library',
					icon: FolderOpen
				},
				{
					title: 'Schedule Reports',
					url: '/manage/reports/schedule',
					icon: Calendar
				}
			]
		},
		{
			title: 'Financials',
			url: '/manage/financials',
			icon: Receipt,
			children: [
				{
					title: 'Income Statement',
					url: '/manage/financials/income-statement',
					icon: TrendingUp
				},
				{
					title: 'Cash Flow',
					url: '/manage/financials/cash-flow',
					icon: Wallet
				},
				{
					title: 'Balance Sheet',
					url: '/manage/financials/balance-sheet',
					icon: Calculator
				},
				{
					title: 'Tax Documents',
					url: '/manage/financials/tax-documents',
					icon: Receipt
				}
			]
		}
	],
	navSecondary: [
		{
			title: 'Settings',
			url: '/manage/settings',
			icon: Settings
		}
	],
	documents: [
		{
			name: 'Lease Template',
			url: '/manage/documents/lease-template',
			icon: ClipboardList
		}
	]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="offcanvas" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className="data-[slot=sidebar-menu-button]:!p-1.5"
						>
							<Link href="/">
								<Home className="size-5" />
								<span className="text-base font-semibold">TenantFlow</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={navigation.navMain} />
				<NavDocuments items={navigation.documents} />
				<NavSecondary items={navigation.navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
		</Sidebar>
	)
}
