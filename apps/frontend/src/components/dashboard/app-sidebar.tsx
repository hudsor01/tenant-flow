'use client'

import {
	BarChart3,
	Building2,
	ClipboardList,
	FileText,
	HelpCircle,
	Home,
	Receipt,
	Search,
	Settings,
	Sparkles,
	Users,
	Wrench,
	type LucideIcon
} from 'lucide-react'

import { NavDocuments } from '#components/dashboard/nav-documents'
import { NavMain } from '#components/dashboard/nav-main'
import { NavSecondary } from '#components/dashboard/nav-secondary'
import { NavUser } from '#components/dashboard/nav-user'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from '#components/ui/sidebar'

const data = {
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
		}
	],
	navCollapsible: [
		{
			title: 'Analytics',
			url: '/analytics',
			icon: BarChart3,
			items: [
				{ title: 'Overview', url: '/analytics/overview' },
				{ title: 'Financial', url: '/analytics/financial' },
				{ title: 'Property Performance', url: '/analytics/property-performance' },
				{ title: 'Leases', url: '/analytics/leases' },
				{ title: 'Maintenance', url: '/analytics/maintenance' },
				{ title: 'Occupancy', url: '/analytics/occupancy' }
			]
		},
		{
			title: 'Reports',
			url: '/reports',
			icon: FileText,
			items: [{ title: 'Generate Reports', url: '/reports/generate' }]
		},
		{
			title: 'Financials',
			url: '/financials',
			icon: Receipt,
			items: [
				{ title: 'Income Statement', url: '/financials/income-statement' },
				{ title: 'Cash Flow', url: '/financials/cash-flow' },
				{ title: 'Balance Sheet', url: '/financials/balance-sheet' },
				{ title: 'Tax Documents', url: '/financials/tax-documents' }
			]
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
			name: 'Generate Lease',
			url: '/leases/new',
			icon: FileText
		},
		{
			name: 'Lease Template',
			url: '/documents/lease-template',
			icon: ClipboardList
		}
	]
} satisfies {
	navMain: { title: string; url: string; icon: LucideIcon }[]
	navCollapsible: {
		title: string
		url: string
		icon: LucideIcon
		items: { title: string; url: string }[]
	}[]
	navSecondary: { title: string; url: string; icon: LucideIcon }[]
	documents: { name: string; url: string; icon: LucideIcon }[]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="offcanvas" data-tour="sidebar-nav" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className="data-[slot=sidebar-menu-button]:!p-1.5"
						>
							<a href="/dashboard">
								<Sparkles className="!size-5" />
								<span className="text-base font-semibold">TenantFlow</span>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} collapsibleItems={data.navCollapsible} />
				<NavDocuments items={data.documents} />
				<NavSecondary items={data.navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
		</Sidebar>
	)
}
