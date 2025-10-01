'use client'

import {
	BarChart3,
	Building2,
	CircleDollarSign,
	ClipboardList,
	Home,
	LayoutDashboard,
	LineChart,
	PieChart,
	Settings,
	TrendingUp,
	Users,
	Wrench,
	type LucideIcon
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { NavDocuments } from '@/components/dashboard-01/nav-documents'
import { NavMain } from '@/components/dashboard-01/nav-main'
import { NavSecondary } from '@/components/dashboard-01/nav-secondary'
import { NavUser } from '@/components/dashboard-01/nav-user'
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
			url: '/dashboard',
			icon: Home
		},
		{
			title: 'Properties',
			url: '/dashboard/properties',
			icon: Building2
		},
		{
			title: 'Tenants',
			url: '/dashboard/tenants',
			icon: Users
		},
		{
			title: 'Leases',
			url: '/dashboard/leases',
			icon: ClipboardList
		},
		{
			title: 'Maintenance',
			url: '/dashboard/maintenance',
			icon: Wrench
		},
		{
			title: 'Analytics',
			url: '/dashboard/analytics',
			icon: BarChart3,
			children: [
				{
					title: 'Overview',
					url: '/dashboard/analytics/overview',
					icon: LayoutDashboard
				},
				{
					title: 'Financial Analytics',
					url: '/dashboard/analytics/financial',
					icon: CircleDollarSign
				},
				{
					title: 'Property Performance',
					url: '/dashboard/analytics/property-performance',
					icon: TrendingUp
				},
				{
					title: 'Lease Analytics',
					url: '/dashboard/analytics/leases',
					icon: ClipboardList
				},
				{
					title: 'Maintenance Insights',
					url: '/dashboard/analytics/maintenance',
					icon: Wrench
				},
				{
					title: 'Occupancy Trends',
					url: '/dashboard/analytics/occupancy',
					icon: LineChart
				}
			]
		}
	],
	navSecondary: [
		{
			title: 'Reports',
			url: '/dashboard/reports',
			icon: PieChart
		},
		{
			title: 'Settings',
			url: '/dashboard/settings',
			icon: Settings
		}
	],
	documents: [
		{
			name: 'Lease Template',
			url: '/dashboard/documents/lease-template',
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
