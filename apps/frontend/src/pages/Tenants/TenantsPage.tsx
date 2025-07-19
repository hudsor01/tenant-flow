import React, { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Tabs,
	TabsContent,
	TabsListEnhanced,
	TabsTriggerWithIcon
} from '@/components/ui/tabs'
import {
	Users,
	Search,
	UserPlus,
	UserCheck,
	Clock,
	Building,
	Filter
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useTenants } from '@/hooks/trpc/useTenants'
import { EmptyState } from '@/components/ui/empty-state'
import type { TenantWithRelations } from '@/types/tenant-types'
import { getTenantLeases } from '@/types/tenant-types'

const TenantsPage: React.FC = () => {
	const router = useRouter()
	const { data: tenantsData, isLoading, error } = useTenants()
	const tenants = tenantsData?.tenants || []
	const [searchTerm, setSearchTerm] = useState('')
	const [activeTab, setActiveTab] = useState('all')

	// Filter tenants based on search and tab
	const filteredTenants = tenants.filter((tenant) => {
		if (!tenant) return false;
		const tenantWithRelations = tenant as TenantWithRelations;
		const matchesSearch =
			tenantWithRelations.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			tenantWithRelations.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			tenantWithRelations.phone?.toLowerCase().includes(searchTerm.toLowerCase())

		const matchesTab = (() => {
			switch (activeTab) {
				case 'active':
					return (
						tenantWithRelations.invitationStatus === 'ACCEPTED' &&
						getTenantLeases(tenantWithRelations).some(
							(lease) =>
								lease.status === 'ACTIVE'
						)
					)
				case 'pending':
					return tenantWithRelations.invitationStatus === 'PENDING'
				case 'inactive':
					return (
						tenantWithRelations.invitationStatus === 'ACCEPTED' &&
						!getTenantLeases(tenantWithRelations).some(
							(lease) =>
								lease.status === 'ACTIVE'
						)
					)
				default:
					return true
			}
		})()

		return matchesSearch && matchesTab
	}) as TenantWithRelations[]

	// Calculate stats for tabs
	const stats = {
		all: tenants.length,
		active: tenants.filter(
			(t) =>
				t !== null &&
				(t as TenantWithRelations).invitationStatus === 'ACCEPTED' &&
				getTenantLeases(t as TenantWithRelations).some(
					(lease) => lease.status === 'ACTIVE'
				)
		).length,
		pending: tenants.filter((t) => 
			t !== null && (t as TenantWithRelations).invitationStatus === 'PENDING'
		).length,
		inactive: tenants.filter(
			(t) =>
				t !== null &&
				(t as TenantWithRelations).invitationStatus === 'ACCEPTED' &&
				!getTenantLeases(t as TenantWithRelations).some(
					(lease) => lease.status === 'ACTIVE'
				)
		).length
	}

	const handleViewTenant = (tenantId: string) => {
		router.navigate({ to: `/tenants/${tenantId}` })
	}

	if (error) {
		return (
			<div className="flex min-h-[300px] items-center justify-center sm:min-h-[400px]">
				<div className="text-center">
					<div className="text-lg font-semibold text-red-500">
						Error loading tenants
					</div>
					<p className="text-muted-foreground mt-2">
						Please try refreshing the page
					</p>
				</div>
			</div>
		)
	}

	const getEmptyStateContent = () => {
		switch (activeTab) {
			case 'active':
				return {
					title: 'No Active Tenants',
					description:
						'No tenants with active leases found. Invite tenants and assign them to properties to get started.'
				}
			case 'pending':
				return {
					title: 'No Pending Invitations',
					description:
						"All invitations have been accepted or you haven't sent any invitations yet."
				}
			case 'inactive':
				return {
					title: 'No Inactive Tenants',
					description: 'All accepted tenants have active leases.'
				}
			default:
				return {
					title: searchTerm ? 'No Tenants Found' : 'No Tenants Yet',
					description: searchTerm
						? "Try adjusting your search criteria to find the tenant you're looking for."
						: 'Get started by inviting your first tenant to the platform.'
				}
		}
	}

	const tabs = [
		{
			value: 'all',
			label: 'All Tenants',
			icon: <Users className="mr-2 h-4 w-4" />,
			count: stats.all
		},
		{
			value: 'active',
			label: 'Active',
			icon: <UserCheck className="mr-2 h-4 w-4" />,
			count: stats.active
		},
		{
			value: 'pending',
			label: 'Pending',
			icon: <Clock className="mr-2 h-4 w-4" />,
			count: stats.pending
		},
		{
			value: 'inactive',
			label: 'Inactive',
			icon: <Building className="mr-2 h-4 w-4" />,
			count: stats.inactive
		}
	]

	return (
		<div className="space-y-8">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<h1 className="text-3xl font-bold text-foreground">
					Tenants
				</h1>
				<Button onClick={() => {}}>
					<UserPlus className="mr-2 h-4 w-4" />
					Invite Tenant
				</Button>
			</motion.div>

			{/* Tabs and Content */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.1 }}
			>
				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<div className="mb-6">
						<TabsListEnhanced>
							{tabs.map((tab) => (
								<TabsTriggerWithIcon
									key={tab.value}
									value={tab.value}
									icon={tab.icon}
									badge={tab.count}
								>
									{tab.label}
								</TabsTriggerWithIcon>
							))}
						</TabsListEnhanced>
					</div>

					{tabs.map((tab) => (
						<TabsContent key={tab.value} value={tab.value}>
							{/* Search Bar */}
							<div className="mb-6 flex items-center gap-4">
								<div className="relative flex-1">
									<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										placeholder="Search by name, email, or phone..."
										value={searchTerm}
										onChange={(e) =>
											setSearchTerm(e.target.value)
										}
										className="pl-10"
									/>
								</div>
								<Button
									variant="outline"
									size="icon"
									className="shrink-0"
								>
									<Filter className="h-4 w-4" />
								</Button>
							</div>

							{/* Loading State */}
							{isLoading && (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
									{[1, 2, 3].map((i) => (
										<div
											key={i}
											className="h-48 animate-pulse rounded-lg bg-muted"
										/>
									))}
								</div>
							)}

							{/* Tenants Grid */}
							{!isLoading && filteredTenants.length > 0 && (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
									{filteredTenants.map((tenant, index: number) => (
										<motion.div
											key={tenant.id}
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: index * 0.05 }}
											className="rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer hover:shadow-md transition-shadow"
											onClick={() => handleViewTenant(tenant.id)}
										>
											<div className="p-6">
												<div className="flex items-center justify-between">
													<div>
														<h3 className="font-semibold text-lg">{tenant.name}</h3>
														<p className="text-muted-foreground text-sm">{tenant.email}</p>
													</div>
													<div className="text-right">
														<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
															tenant.invitationStatus === 'ACCEPTED' 
																? 'bg-green-100 text-green-800' 
																: 'bg-yellow-100 text-yellow-800'
														}`}>
															{tenant.invitationStatus.toLowerCase()}
														</span>
													</div>
												</div>
												{tenant.phone && (
													<p className="text-muted-foreground text-sm mt-2">{tenant.phone}</p>
												)}
											</div>
										</motion.div>
									))}
								</div>
							)}

							{/* Empty State */}
							{!isLoading && filteredTenants.length === 0 && (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.5 }}
								>
									<EmptyState
										icon={<Users className="h-8 w-8" />}
										title={getEmptyStateContent().title}
										description={
											getEmptyStateContent().description
										}
										action={
											!searchTerm && activeTab === 'all'
												? {
														label: 'Invite Your First Tenant',
														onClick: () => {}
													}
												: undefined
										}
									/>
								</motion.div>
							)}
						</TabsContent>
					))}
				</Tabs>
			</motion.div>

		</div>
	)
}

export default TenantsPage
