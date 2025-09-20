'use client'

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar'
import { NavMain } from '@/components/nav-main'
import { NavDocuments } from '@/components/nav-documents'
import { NavSecondary } from '@/components/nav-secondary'
import { NavUser } from '@/components/nav-user'
import {
	Database,
	FileBarChart,
	FileEdit,
	FileText,
	FolderOpen,
	HelpCircle,
	Home,
	LayoutDashboard,
	List,
	Search,
	Settings,
	Users
} from 'lucide-react'
import * as React from 'react'




const data = {
	user: {
		name: 'TenantFlow User',
		email: 'user@tenantflow.app',
		avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TenantFlow'
	},
	navMain: [
		{
			title: 'Dashboard',
			url: '/dashboard',
			icon: LayoutDashboard
		},
		{
			title: 'Properties',
			url: '/dashboard/properties',
			icon: FolderOpen
		},
		{
			title: 'Tenants',
			url: '/dashboard/tenants',
			icon: Users
		},
		{
			title: 'Units',
			url: '/dashboard/properties/units',
			icon: List
		},
		{
			title: 'Leases',
			url: '/dashboard/leases',
			icon: FileText
		}
	],
	navSecondary: [
		{
			title: 'Settings',
			url: '/dashboard/settings',
			icon: Settings
		},
		{
			title: 'Get Help',
			url: '/help',
			icon: HelpCircle
		},
		{
			title: 'Search',
			url: '/search',
			icon: Search
		}
	],
	documents: [
		{
			name: 'Maintenance',
			url: '/dashboard/maintenance',
			icon: Database
		},
		{
			name: 'Reports',
			url: '/dashboard/reports',
			icon: FileBarChart
		},
		{
			name: 'Analytics',
			url: '/dashboard/analytics',
			icon: FileEdit
		}
	]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className="data-[slot=sidebar-menu-button]:!p-1.5"
						>
							<a href="/dashboard">
								<Home className="!size-5" />
								<span className="text-base font-semibold">TenantFlow</span>
							</a>
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
