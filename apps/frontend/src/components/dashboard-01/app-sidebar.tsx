'use client'

import {
	BarChart3,
	Building2,
	FileCheck,
	FileText,
	Home,
	PieChart,
	Settings,
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

const data: {
	user: {
		name: string
		email: string
		avatar: string
	}
	navMain: {
		title: string
		url: string
		icon?: LucideIcon
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
	user: {
		name: 'TenantFlow User',
		email: 'user@tenantflow.app',
		avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TenantFlow'
	},
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
			icon: FileText
		},
		{
			title: 'Maintenance',
			url: '/dashboard/maintenance',
			icon: Wrench
		},
		{
			title: 'Analytics',
			url: '/dashboard/analytics',
			icon: BarChart3
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
			icon: FileCheck
		},
		{
			name: 'Property Guide',
			url: '/dashboard/documents/property-guide',
			icon: FileText
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
				<NavMain items={data.navMain} />
				<NavDocuments items={data.documents} />
				<NavSecondary items={data.navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
		</Sidebar>
	)
}
