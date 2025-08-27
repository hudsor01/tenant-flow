import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useSidebar } from './sidebar-provider'
import { SidebarNavItem, type NavItem } from './sidebar-nav-item'

// Enhanced Navigation items with activity tracking and descriptions
const navItems: NavItem[] = [
	{
		title: 'Dashboard',
		url: '/dashboard',
		icon: <i className="i-lucide-home inline-block h-4 w-4"  />,
		isActive: true,
		description: 'Overview of your property portfolio',
		shortcut: '⌘+D',
		hasActivity: false
	},
	{
		title: 'Properties',
		url: '/properties',
		icon: <i className="i-lucide-building-2 inline-block h-4 w-4"  />,
		badge: '24',
		description: 'Manage your property portfolio',
		shortcut: '⌘+P',
		hasActivity: false,
		items: [
			{
				title: 'All Properties',
				url: '/properties',
				icon: <i className="i-lucide-building-2 inline-block h-3 w-3"  />,
				description: 'View all properties in your portfolio'
			},
			{
				title: 'Add Property',
				url: '/properties/new',
				icon: <i className="i-lucide-plus inline-block h-3 w-3"  />,
				description: 'Add a new property to your portfolio'
			},
			{
				title: 'Property Types',
				url: '/properties/types',
				icon: <i className="i-lucide-building-2 inline-block h-3 w-3"  />,
				description: 'Configure property categories'
			}
		]
	},
	{
		title: 'Tenants',
		url: '/tenants',
		icon: <i className="i-lucide-users inline-block h-4 w-4"  />,
		badge: '1,284',
		description: 'Manage tenant relationships',
		shortcut: '⌘+T',
		hasActivity: true,
		activityCount: 5,
		items: [
			{
				title: 'Active Tenants',
				url: '/tenants/active',
				icon: <i className="i-lucide-users inline-block h-3 w-3"  />,
				description: 'View all active tenant accounts'
			},
			{
				title: 'Applications',
				url: '/tenants/applications',
				icon: <i className="i-lucide-file-text inline-block h-3 w-3"  />,
				badge: '5',
				hasActivity: true,
				activityCount: 5,
				description: 'Review pending tenant applications'
			},
			{
				title: 'Add Tenant',
				url: '/tenants/new',
				icon: <i className="i-lucide-plus inline-block h-3 w-3"  />,
				description: 'Add a new tenant to the system'
			}
		]
	},
	{
		title: 'Leases',
		url: '/leases',
		icon: <i className="i-lucide-file-text inline-block h-4 w-4"  />,
		description: 'Manage lease agreements',
		shortcut: '⌘+L',
		hasActivity: true,
		activityCount: 18,
		items: [
			{
				title: 'Active Leases',
				url: '/leases/active',
				icon: <i className="i-lucide-file-text inline-block h-3 w-3"  />,
				description: 'View all active lease agreements'
			},
			{
				title: 'Expiring Soon',
				url: '/leases/expiring',
				icon: <i className="i-lucide-calendar inline-block h-3 w-3"  />,
				badge: '18',
				hasActivity: true,
				activityCount: 18,
				description: 'Leases requiring renewal attention'
			},
			{
				title: 'Generate Lease',
				url: '/leases/generate',
				icon: <i className="i-lucide-plus inline-block h-3 w-3"  />,
				description: 'Create new lease agreement'
			}
		]
	},
	{
		title: 'Documents',
		// Documents feature not yet implemented
		url: '#',
		icon: <i className="i-lucide-file-text inline-block h-4 w-4"  />,
		description: 'Manage property documents and files',
		shortcut: '⌘+Shift+D',
		hasActivity: false,
		items: [
			{
				title: 'All Documents',
				// Documents feature not yet implemented
				url: '#',
				icon: <i className="i-lucide-file-text inline-block h-3 w-3"  />,
				description: 'View all uploaded documents'
			},
			{
				title: 'Upload Document',
				// Upload feature not yet implemented
				url: '#',
				icon: <i className="i-lucide-plus inline-block h-3 w-3"  />,
				description: 'Upload new document or file'
			}
		]
	},
	{
		title: 'Maintenance',
		url: '/maintenance',
		icon: <i className="i-lucide-wrench inline-block h-4 w-4"  />,
		badge: '7',
		description: 'Track property maintenance requests',
		shortcut: '⌘+M',
		hasActivity: true,
		activityCount: 7,
		items: [
			{
				title: 'Open Requests',
				url: '/maintenance/open',
				icon: <i className="i-lucide-wrench inline-block h-3 w-3"  />,
				badge: '7',
				hasActivity: true,
				activityCount: 7,
				description: 'Maintenance requests awaiting attention'
			},
			{
				title: 'In Progress',
				url: '/maintenance/progress',
				icon: <i className="i-lucide-settings inline-block h-3 w-3"  />,
				badge: '3',
				hasActivity: true,
				activityCount: 3,
				description: 'Active maintenance work orders'
			},
			{
				title: 'Completed',
				url: '/maintenance/completed',
				icon: <i className="i-lucide-file-text inline-block h-3 w-3"  />,
				description: 'Completed maintenance history'
			}
		]
	},
	{
		title: 'Finances',
		url: '/finances',
		icon: <i className="i-lucide-dollar-sign inline-block h-4 w-4"  />,
		description: 'Financial management and reporting',
		shortcut: '⌘+F',
		hasActivity: false,
		items: [
			{
				title: 'Overview',
				url: '/finances',
				icon: <i className="i-lucide-bar-chart-3 inline-block h-3 w-3"  />,
				description: 'Financial performance overview'
			},
			{
				title: 'Rent Collection',
				url: '/finances/rent',
				icon: <i className="i-lucide-dollar-sign inline-block h-3 w-3"  />,
				description: 'Monthly rent collection tracking'
			},
			{
				title: 'Expenses',
				url: '/finances/expenses',
				icon: <i className="i-lucide-file-text inline-block h-3 w-3"  />,
				description: 'Property expense management'
			},
			{
				title: 'Reports',
				url: '/finances/reports',
				icon: <i className="i-lucide-bar-chart-3 inline-block h-3 w-3"  />,
				description: 'Generate financial reports'
			}
		]
	}
]

const bottomNavItems: NavItem[] = [
	{
		title: 'Analytics',
		url: '/analytics',
		icon: <i className="i-lucide-bar-chart-3 inline-block h-4 w-4"  />,
		description: 'Business intelligence and insights',
		shortcut: '⌘+A'
	},
	{
		title: 'Settings',
		url: '/settings',
		icon: <i className="i-lucide-settings inline-block h-4 w-4"  />,
		description: 'Application and account settings',
		shortcut: '⌘+,'
	},
	{
		title: 'Help & Support',
		url: '/help',
		icon: <i className="i-lucide-help-circle inline-block h-4 w-4"  />,
		description: 'Get help and contact support',
		shortcut: '⌘+?'
	}
]

// Sidebar Navigation Content
export function SidebarContent() {
	const { collapsed } = useSidebar()

	return (
		<div className="flex flex-1 flex-col overflow-y-auto py-4">
			{/* Enhanced Search with Keyboard Shortcuts */}
			{!collapsed && (
				<div className="px-4 pb-4">
					<div className="group relative">
						<i className="i-lucide-search inline-block text-sidebar-foreground/60 group-focus-within:text-primary absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors"  />
						<Input
							placeholder="Search properties, tenants..."
							className="bg-sidebar-accent/50 border-sidebar-border focus:bg-background focus:border-primary/50 h-9 w-full pl-9 pr-16 text-sm transition-all duration-200 focus:shadow-sm"
						/>
						<kbd className="text-sidebar-foreground/60 bg-sidebar-accent/80 border-sidebar-border absolute right-3 top-1/2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-xs">
							⌘K
						</kbd>
					</div>
				</div>
			)}

			{/* Enhanced Quick Actions */}
			{!collapsed && (
				<div className="px-4 pb-4">
					<div className="flex gap-2">
						<Button
							size="sm"
							className="h-8 flex-1 text-xs shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
						>
							<i className="i-lucide-plus inline-block mr-1 h-3 w-3"  />
							Add Property
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="hover:bg-sidebar-accent/50 hover:border-primary/30 h-8 flex-1 text-xs transition-all duration-200 hover:scale-105 active:scale-95"
						>
							<i className="i-lucide-users inline-block mr-1 h-3 w-3"  />
							Add Tenant
						</Button>
					</div>
				</div>
			)}

			{/* Main Navigation */}
			<nav className="flex-1 space-y-2 px-3">
				{navItems.map((item, index) => (
					<SidebarNavItem key={index} item={item} />
				))}
			</nav>

			<Separator className="mx-4 my-4" />

			{/* Bottom Navigation */}
			<nav className="space-y-2 px-3">
				{bottomNavItems.map((item, index) => (
					<SidebarNavItem key={index} item={item} />
				))}
			</nav>
		</div>
	)
}
