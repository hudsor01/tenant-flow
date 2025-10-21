'use client'

import {
	CreditCard,
	FileText,
	Home,
	Receipt,
	UserCircle,
	Wrench,
	type LucideIcon
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { NavMain } from '@/components/dashboard/nav-main'
import { NavSecondary } from '@/components/dashboard/nav-secondary'
import { Sidebar, SidebarContent } from '@/components/ui/sidebar'
import { Settings } from 'lucide-react'

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
} = {
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
			title: 'Payments',
			url: '/tenant/payments',
			icon: CreditCard,
			children: [
				{
					title: 'Payment Methods',
					url: '/tenant/payments/methods',
					icon: CreditCard
				},
				{
					title: 'Payment History',
					url: '/tenant/payments/history',
					icon: Receipt
				}
			]
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
	],
	navSecondary: [
		{
			title: 'Settings',
			url: '/tenant/settings',
			icon: Settings
		}
	]
}

export function TenantSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	return (
		<>
			{/* Card 1: Brand */}
			<div className="rounded-xl border border-gray-200 bg-white p-4">
				<Link href="/" className="flex items-center gap-2">
					<Home className="size-5" />
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
				<Sidebar
					collapsible="offcanvas"
					className="border-0 bg-transparent"
					{...props}
				>
					<SidebarContent className="overflow-visible">
						<NavMain items={navigation.navMain} />
					</SidebarContent>
				</Sidebar>
			</div>

			{/* Card 4: Settings */}
			<div className="rounded-xl border border-gray-200 bg-white p-2">
				<NavSecondary items={navigation.navSecondary} />
			</div>
		</>
	)
}
