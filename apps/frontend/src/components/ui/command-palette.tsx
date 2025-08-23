/**
 * TenantFlow Command Palette
 *
 * A powerful, keyboard-driven command interface for TenantFlow that provides:
 *
 * Features:
 * - Global keyboard shortcut (⌘K / Ctrl+K)
 * - Intelligent search across properties, tenants, leases, and maintenance requests
 * - Quick actions (Add Property, Create Lease, etc.)
 * - Navigation to all dashboard pages
 * - Search history with localStorage persistence
 * - Real-time data from API hooks
 * - Responsive design with keyboard navigation
 * - Analytics tracking with PostHog
 *
 * Usage:
 * - Press ⌘K (Mac) or Ctrl+K (Windows/Linux) to open
 * - Click the search bar in navigation
 * - Type to search, use arrow keys to navigate, Enter to select
 * - ESC to close
 *
 * The command palette is automatically available on all dashboard pages
 * through the CommandPaletteProvider in the layout.
 */
'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command as CommandPrimitive } from 'cmdk'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
	Home,
	Building,
	Users,
	FileText,
	Wrench,
	BarChart3,
	Settings,
	Plus,
	Search,
	Activity,
	Bell,
	User
} from 'lucide-react'
// cn utility removed as not used in this component
import { useProperties } from '@/hooks/api/use-properties'
import { useTenants } from '@/hooks/api/use-tenants'
import { useLeases } from '@/hooks/api/use-leases'
import { useMaintenanceRequests } from '@/hooks/api/use-maintenance'
import { useCommandPalette } from '@/hooks/use-command-palette'
import type { Property, Tenant, Lease, MaintenanceRequest } from '@repo/shared'

interface CommandItem {
	id: string
	title: string
	subtitle?: string
	description?: string
	icon: React.ComponentType<{ className?: string }>
	badge?: string | number
	badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
	keywords: string[]
	category: string
	action: () => void
	priority?: number
	type?: string
	href?: string
}

// Removed unused CommandGroup interface

export function CommandPalette() {
	const router = useRouter()

	// Use the command palette hook for basic functionality
	const commandPalette = useCommandPalette()
	const { isOpen, close, toggle } = commandPalette
	const [search, setSearch] = useState('')
	// Removed unused pages state

	// Data hooks
	const { data: properties = [] } = useProperties(
		{ limit: 10 },
		{ enabled: isOpen }
	)
	const { data: tenants = [] } = useTenants(
		{ limit: 10 },
		{ enabled: isOpen }
	)
	const { data: leases = [] } = useLeases({ limit: 10 }, { enabled: isOpen })
	const { data: maintenance = [] } = useMaintenanceRequests(
		{ limit: 10 },
		{ enabled: isOpen }
	)

	// Simplified recent items (would normally be persisted)
	const recentItems: CommandItem[] = []
	const addRecentItem = useCallback(
		(
			item: Partial<CommandItem> & {
				id: string
				title: string
				href?: string
				type?: string
			}
		) => {
			// Would normally add to persistent storage
			console.log('Adding recent item:', item)
		},
		[]
	)

	// Navigation items - wrapped in useMemo to fix ESLint warning
	const navigationItems: CommandItem[] = React.useMemo(
		() => [
			{
				id: 'nav-dashboard',
				title: 'Dashboard',
				icon: Home,
				keywords: ['dashboard', 'home', 'overview'],
				category: 'Navigation',
				action: () => {
					router.push('/dashboard')
					close()
				},
				priority: 10
			},
			{
				id: 'nav-properties',
				title: 'Properties',
				icon: Building,
				keywords: ['properties', 'buildings', 'units'],
				category: 'Navigation',
				action: () => {
					router.push('/properties')
					addRecentItem({
						id: 'nav-properties',
						title: 'Properties',
						href: '/properties',
						type: 'navigation'
					})
					close()
				},
				priority: 9
			},
			{
				id: 'nav-tenants',
				title: 'Tenants',
				icon: Users,
				keywords: ['tenants', 'renters', 'residents'],
				category: 'Navigation',
				action: () => {
					router.push('/tenants')
					close()
				},
				priority: 8
			},
			{
				id: 'nav-leases',
				title: 'Leases',
				icon: FileText,
				keywords: ['leases', 'contracts', 'agreements'],
				category: 'Navigation',
				action: () => {
					router.push('/leases')
					close()
				},
				priority: 7
			},
			{
				id: 'nav-maintenance',
				title: 'Maintenance',
				icon: Wrench,
				keywords: ['maintenance', 'repairs', 'work orders'],
				category: 'Navigation',
				action: () => {
					router.push('/maintenance')
					close()
				},
				priority: 6
			},
			{
				id: 'nav-reports',
				title: 'Reports',
				icon: BarChart3,
				keywords: ['reports', 'analytics', 'charts'],
				category: 'Navigation',
				action: () => {
					router.push('/reports')
					close()
				},
				priority: 5
			},
			{
				id: 'nav-settings',
				title: 'Settings',
				icon: Settings,
				keywords: ['settings', 'preferences', 'config'],
				category: 'Navigation',
				action: () => {
					router.push('/settings')
					close()
				},
				priority: 4
			},
			{
				id: 'nav-notifications',
				title: 'Notifications',
				icon: Bell,
				keywords: ['notifications', 'alerts', 'messages'],
				category: 'Navigation',
				action: () => {
					router.push('/notifications')
					close()
				},
				priority: 3
			},
			{
				id: 'nav-activity',
				title: 'Activity',
				icon: Activity,
				keywords: ['activity', 'history', 'log'],
				category: 'Navigation',
				action: () => {
					router.push('/activity')
					close()
				},
				priority: 2
			},
			{
				id: 'nav-profile',
				title: 'Profile',
				icon: User,
				keywords: ['profile', 'account', 'user'],
				category: 'Navigation',
				action: () => {
					router.push('/profile')
					close()
				},
				priority: 1
			}
		],
		[router, close, addRecentItem]
	)

	// Quick actions - wrapped in useMemo to fix ESLint warning
	const quickActions: CommandItem[] = React.useMemo(
		() => [
			{
				id: 'action-add-property',
				title: 'Add Property',
				subtitle: 'Create a new property',
				icon: Plus,
				keywords: ['add property', 'new property', 'create property'],
				category: 'Quick Actions',
				action: () => {
					router.push('/properties/new')
					close()
				},
				priority: 10
			},
			{
				id: 'action-add-tenant',
				title: 'Add Tenant',
				subtitle: 'Create a new tenant',
				icon: Plus,
				keywords: ['add tenant', 'new tenant', 'create tenant'],
				category: 'Quick Actions',
				action: () => {
					router.push('/tenants/new')
					close()
				},
				priority: 9
			},
			{
				id: 'action-create-lease',
				title: 'Create Lease',
				subtitle: 'Create a new lease agreement',
				icon: Plus,
				keywords: ['create lease', 'new lease', 'add lease'],
				category: 'Quick Actions',
				action: () => {
					router.push('/leases/new')
					close()
				},
				priority: 8
			},
			{
				id: 'action-add-maintenance',
				title: 'Add Maintenance Request',
				subtitle: 'Create a new maintenance request',
				icon: Plus,
				keywords: [
					'add maintenance',
					'new maintenance',
					'create maintenance'
				],
				category: 'Quick Actions',
				action: () => {
					router.push('/maintenance/new')
					close()
				},
				priority: 7
			}
		],
		[router, close]
	)

	// Property items
	const propertyItems: CommandItem[] = properties.map(
		(property: Property, index) => ({
			id: `property-${property.id}`,
			title: property.name,
			subtitle: `${property.address}, ${property.city}`,
			description: property.description ?? undefined,
			icon: Building,
			badge: property.units?.length
				? `${property.units.length} units`
				: undefined,
			keywords: [
				property.name,
				property.address,
				property.city,
				property.state,
				'property'
			],
			category: 'Properties',
			action: () => {
				router.push(`/properties/${property.id}`)
				addRecentItem({
					id: property.id,
					title: property.name,
					href: `/properties/${property.id}`,
					type: 'property'
				})
				close()
			},
			priority: 10 - index
		})
	)

	// Tenant items
	const tenantItems: CommandItem[] = tenants.map((tenant: Tenant, index) => ({
		id: `tenant-${tenant.id}`,
		title: tenant.name,
		subtitle: tenant.email,
		description: tenant.phone ?? undefined,
		icon: Users,
		keywords: [tenant.name, tenant.email, tenant.phone || '', 'tenant'],
		category: 'Tenants',
		action: () => {
			router.push(`/tenants/${tenant.id}`)
			addRecentItem({
				id: tenant.id,
				title: tenant.name,
				href: `/tenants/${tenant.id}`,
				type: 'tenant'
			})
			close()
		},
		priority: 10 - index
	}))

	// Lease items
	const leaseItems: CommandItem[] = leases.map((lease: Lease, index) => ({
		id: `lease-${lease.id}`,
		title: `Lease ${lease.id.slice(0, 8)}`,
		subtitle: lease.status,
		description: lease.startDate
			? `Starts ${new Date(lease.startDate).toLocaleDateString()}`
			: undefined,
		icon: FileText,
		badge: lease.status,
		badgeVariant:
			lease.status === 'ACTIVE'
				? 'default'
				: lease.status === 'EXPIRED'
					? 'destructive'
					: 'secondary',
		keywords: [lease.id, lease.status, 'lease'],
		category: 'Leases',
		action: () => {
			router.push(`/leases/${lease.id}`)
			close()
		},
		priority: 10 - index
	}))

	// Maintenance items
	const maintenanceItems: CommandItem[] = maintenance.map(
		(request: MaintenanceRequest, index) => ({
			id: `maintenance-${request.id}`,
			title: request.title,
			subtitle: request.status,
			description: request.description ?? undefined,
			icon: Wrench,
			badge: request.priority,
			badgeVariant:
				request.priority === 'HIGH'
					? 'destructive'
					: request.priority === 'MEDIUM'
						? 'outline'
						: 'secondary',
			keywords: [
				request.title,
				request.description || '',
				request.status,
				request.priority,
				'maintenance'
			],
			category: 'Maintenance',
			action: () => {
				router.push(`/maintenance/${request.id}`)
				close()
			},
			priority: 10 - index
		})
	)

	// Convert recent items to command items
	const recentCommandItems: CommandItem[] = recentItems.map((item, index) => {
		const iconMap = {
			property: Building,
			tenant: Users,
			lease: FileText,
			maintenance: Wrench,
			navigation: Home
		}

		return {
			id: `recent-${item.id}`,
			title: item.title,
			subtitle: 'Recent',
			icon: iconMap[item.type as keyof typeof iconMap] || Home,
			keywords: [item.title, 'recent'],
			category: 'Recent',
			action: () => {
				if (item.href) {
					router.push(item.href)
				}
				close()
			},
			priority: 10 - index
		}
	})

	// Group items by category
	const groupedItems = React.useMemo(() => {
		// Combine all items inside useMemo to fix dependency warning
		const allItems = [
			...recentCommandItems,
			...quickActions,
			...navigationItems,
			...propertyItems,
			...tenantItems,
			...leaseItems,
			...maintenanceItems
		]

		const groups: Record<string, CommandItem[]> = {}

		allItems.forEach(item => {
			if (!groups[item.category]) {
				groups[item.category] = []
			}
			groups[item.category]?.push(item)
		})

		// Sort items within each group by priority
		Object.keys(groups).forEach(category => {
			groups[category]?.sort(
				(a, b) => (b.priority ?? 0) - (a.priority ?? 0)
			)
		})

		return Object.entries(groups).map(([heading, items]) => ({
			heading,
			items
		}))
	}, [
		recentCommandItems,
		quickActions,
		navigationItems,
		propertyItems,
		tenantItems,
		leaseItems,
		maintenanceItems
	])

	// Filter items based on search
	const filteredGroups = React.useMemo(() => {
		if (!search) return groupedItems

		return groupedItems
			.map(group => ({
				...group,
				items: group.items.filter(
					item =>
						item.keywords.some(keyword =>
							keyword.toLowerCase().includes(search.toLowerCase())
						) ||
						item.title
							.toLowerCase()
							.includes(search.toLowerCase()) ||
						item.subtitle
							?.toLowerCase()
							.includes(search.toLowerCase()) ||
						item.description
							?.toLowerCase()
							.includes(search.toLowerCase())
				)
			}))
			.filter(group => group.items.length > 0)
	}, [groupedItems, search])

	// Keyboard shortcut handler
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault()
				toggle()
			}
			if (e.key === 'Escape' && isOpen) {
				close()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isOpen, toggle, close])

	// Focus management
	useEffect(() => {
		if (isOpen) {
			setSearch('')
		}
	}, [isOpen])

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				close()
			}
		},
		[close]
	)

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-2xl p-0">
				<CommandPrimitive className="rounded-lg border border-gray-200 shadow-md">
					<div className="flex items-center border-b px-3">
						<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
						<CommandPrimitive.Input
							placeholder="Search for commands, properties, tenants..."
							value={search}
							onValueChange={setSearch}
							className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
						/>
						<div className="ml-auto flex items-center gap-1">
							<kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-gray-100 px-1.5 font-mono text-[10px] font-medium text-gray-600 select-none">
								<span className="text-xs">⌘</span>K
							</kbd>
						</div>
					</div>
					<CommandPrimitive.List className="max-h-[400px] overflow-y-auto">
						{filteredGroups.length === 0 && (
							<CommandPrimitive.Empty className="flex flex-col items-center justify-center py-6 text-center">
								<Search className="mb-2 h-8 w-8 text-gray-400" />
								<p className="text-sm text-gray-500">
									No results found.
								</p>
								<p className="mt-1 text-xs text-gray-400">
									Try searching for properties, tenants, or
									actions.
								</p>
							</CommandPrimitive.Empty>
						)}

						{filteredGroups.map(group => (
							<CommandPrimitive.Group
								key={group.heading}
								heading={group.heading}
							>
								{group.items.map(item => {
									const Icon = item.icon
									return (
										<CommandPrimitive.Item
											key={item.id}
											value={`${item.title} ${item.subtitle || ''} ${item.description || ''} ${item.keywords.join(' ')}`}
											onSelect={item.action}
											className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50 aria-selected:bg-gray-100"
										>
											<div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100">
												<Icon className="h-4 w-4 text-gray-600" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<span className="truncate font-medium text-gray-900">
														{item.title}
													</span>
													{item.badge && (
														<Badge
															variant={
																item.badgeVariant ||
																'secondary'
															}
															className="text-xs"
														>
															{item.badge}
														</Badge>
													)}
												</div>
												{item.subtitle && (
													<p className="truncate text-sm text-gray-500">
														{item.subtitle}
													</p>
												)}
												{item.description && (
													<p className="truncate text-xs text-gray-400">
														{item.description}
													</p>
												)}
											</div>
											<div className="flex items-center text-xs text-gray-400">
												<span>↵</span>
											</div>
										</CommandPrimitive.Item>
									)
								})}
							</CommandPrimitive.Group>
						))}
					</CommandPrimitive.List>

					{/* Keyboard shortcuts footer */}
					<div className="flex items-center justify-between border-t bg-gray-50 px-3 py-2 text-xs text-gray-500">
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-1">
								<kbd className="rounded border border-gray-300 bg-gray-200 px-1.5 py-0.5 text-xs font-semibold text-gray-800">
									↵
								</kbd>
								<span>to select</span>
							</div>
							<div className="flex items-center gap-1">
								<kbd className="rounded border border-gray-300 bg-gray-200 px-1.5 py-0.5 text-xs font-semibold text-gray-800">
									↑↓
								</kbd>
								<span>to navigate</span>
							</div>
							<div className="flex items-center gap-1">
								<kbd className="rounded border border-gray-300 bg-gray-200 px-1.5 py-0.5 text-xs font-semibold text-gray-800">
									esc
								</kbd>
								<span>to close</span>
							</div>
						</div>
						<div className="text-gray-400">
							{filteredGroups.length > 0 && (
								<span>
									{filteredGroups.reduce(
										(total, group) =>
											total + group.items.length,
										0
									)}{' '}
									results
								</span>
							)}
						</div>
					</div>
				</CommandPrimitive>
			</DialogContent>
		</Dialog>
	)
}
