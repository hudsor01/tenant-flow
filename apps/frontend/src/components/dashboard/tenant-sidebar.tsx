'use client'

import {
	CreditCard,
	FileText,
	Home,
	Settings,
	Sparkles,
	UserCircle,
	Wrench,
	HelpCircle,
	type LucideIcon
} from 'lucide-react'

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
import { Skeleton } from '#components/ui/skeleton'
import { useIsMounted } from '#hooks/use-is-mounted'

/**
 * Tenant Portal Navigation Structure
 *
 * Per spec:
 * - Dashboard (Home) -> /tenant
 * - My Profile (UserCircle) -> /tenant/profile
 * - My Lease (FileText) -> /tenant/lease
 * - Payments (CreditCard) -> collapsible with sub-items
 *   - Autopay -> /tenant/payments/autopay
 *   - Payment Methods -> /tenant/payments/methods
 *   - Payment History -> /tenant/payments/history
 * - Maintenance (Wrench) -> /tenant/maintenance
 * - Documents (FileText) -> /tenant/documents
 * - Settings -> /tenant/settings (secondary nav)
 */
const navigation = {
	navMain: [
		{
			title: 'Dashboard',
			url: '/tenant',
			icon: Home
		},
		{
			title: 'My Profile',
			url: '/tenant/profile',
			icon: UserCircle
		},
		{
			title: 'My Lease',
			url: '/tenant/lease',
			icon: FileText
		},
		{
			title: 'Maintenance',
			url: '/tenant/maintenance',
			icon: Wrench
		},
		{
			title: 'Documents',
			url: '/tenant/documents',
			icon: FileText
		}
	] satisfies { title: string; url: string; icon: LucideIcon }[],
	navCollapsible: [
		{
			title: 'Payments',
			url: '/tenant/payments',
			icon: CreditCard,
			items: [
				{ title: 'Autopay', url: '/tenant/payments/autopay' },
				{ title: 'Payment Methods', url: '/tenant/payments/methods' },
				{ title: 'Payment History', url: '/tenant/payments/history' }
			]
		}
	] satisfies {
		title: string
		url: string
		icon: LucideIcon
		items: { title: string; url: string }[]
	}[],
	navSecondary: [
		{
			title: 'Settings',
			url: '/tenant/settings',
			icon: Settings
		},
		{
			title: 'Get Help',
			url: '/help',
			icon: HelpCircle
		}
	] satisfies { title: string; url: string; icon: LucideIcon }[]
}

/**
 * TenantSidebar - Navigation sidebar for the tenant portal
 *
 * Features:
 * - Consistent with owner dashboard sidebar pattern
 * - Collapsible Payments section with sub-navigation
 * - Mobile responsive (Sheet on mobile via Sidebar component)
 * - User menu in footer
 * - Light/dark mode support
 */
export function TenantSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const isMounted = useIsMounted()

	return (
		<Sidebar collapsible="offcanvas" data-tour="tenant-sidebar-nav" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className="data-[slot=sidebar-menu-button]:p-1.5!"
						>
							<a href="/tenant">
								<Sparkles className="size-5!" />
								<span className="text-base font-semibold">TenantFlow</span>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{isMounted ? (
					<>
						<NavMain
							items={navigation.navMain}
							collapsibleItems={navigation.navCollapsible}
						/>
						<NavSecondary items={navigation.navSecondary} className="mt-auto" />
					</>
				) : (
					<div className="flex flex-col gap-2 p-2">
						{[...Array(8)].map((_, i) => (
							<Skeleton key={i} className="h-8 w-full rounded-md" />
						))}
					</div>
				)}
			</SidebarContent>
			<SidebarFooter>
				{isMounted ? (
					<NavUser />
				) : (
					<div className="flex items-center gap-2 p-2">
						<Skeleton className="size-10 rounded-lg" />
						<div className="flex-1 space-y-1">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-32" />
						</div>
					</div>
				)}
			</SidebarFooter>
		</Sidebar>
	)
}
