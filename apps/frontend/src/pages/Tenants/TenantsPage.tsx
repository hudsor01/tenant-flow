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
import InviteTenantModal from '@/components/tenant-management/InviteTenantModal'
import TenantCard from '@/components/tenant-management/TenantCard'
import { useTenants } from '@/hooks/useTenants'
import { EmptyState } from '@/components/ui/empty-state'
import type { Tenant } from '@/types/entities'

const TenantsPage: React.FC = () => {
	const router = useRouter()
	const { data: tenants = [], isLoading, error } = useTenants()
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [activeTab, setActiveTab] = useState('all')

	// Filter tenants based on search and tab
	const filteredTenants = tenants.filter(tenant => {
		const matchesSearch =
			tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			tenant.phone?.toLowerCase().includes(searchTerm.toLowerCase())

		const matchesTab = (() => {
			switch (activeTab) {
				case 'active':
					return (
						tenant.invitationStatus === 'ACCEPTED' &&
						tenant.leases?.some(
							(lease: { status: string }) =>
								lease.status === 'ACTIVE'
						)
					)
				case 'pending':
					return tenant.invitationStatus === 'PENDING'
				case 'inactive':
					return (
						tenant.invitationStatus === 'ACCEPTED' &&
						!tenant.leases?.some(
							(lease: { status: string }) =>
								lease.status === 'ACTIVE'
						)
					)
				default:
					return true
			}
		})()

		return matchesSearch && matchesTab
	})

	// Calculate stats for tabs
	const stats = {
		all: tenants.length,
		active: tenants.filter(
			t =>
				t.invitationStatus === 'ACCEPTED' &&
				t.leases?.some(
					(lease: { status: string }) => lease.status === 'ACTIVE'
				)
		).length,
		pending: tenants.filter(t => t.invitationStatus === 'PENDING').length,
		inactive: tenants.filter(
			t =>
				t.invitationStatus === 'ACCEPTED' &&
				!t.leases?.some(
					(lease: { status: string }) => lease.status === 'ACTIVE'
				)
		).length
	}

	const handleViewTenant = (tenant: Tenant) => {
		router.navigate({ to: `/tenants/${tenant.id}` })
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

	return (
		<div className="space-y-6 p-1">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5 }}
				>
					<h1 className="text-foreground text-3xl font-bold tracking-tight">
						Tenant Management
					</h1>
					<p className="text-muted-foreground mt-1">
						Manage tenants, track leases, and monitor property
						assignments
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, scale: 0.5 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5 }}
					className="flex items-center gap-2"
				>
					<Button
						variant="outline"
						size="sm"
						className="hidden sm:flex"
					>
						<Filter className="mr-2 h-4 w-4" />
						Advanced Filter
					</Button>
					<Button
						data-testid="invite-tenant-button"
						onClick={() => setIsInviteModalOpen(true)}
						className="bg-primary hover:bg-primary/90 text-primary-foreground"
					>
						<UserPlus className="mr-2 h-5 w-5" />
						Invite Tenant
					</Button>
				</motion.div>
			</div>

			{/* Search Bar */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.1 }}
			>
				<div className="relative max-w-md">
					<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
					<Input
						placeholder="Search tenants by name, email, or phone..."
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
						className="pl-10"
					/>
				</div>
			</motion.div>

			{/* Enhanced Tabs with Stats */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.2 }}
			>
				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<div className="bg-card/90 border-border/50 relative overflow-hidden rounded-2xl border p-2 shadow-lg shadow-black/5 backdrop-blur-sm">
						<TabsListEnhanced
							variant="premium"
							className="grid h-auto w-full grid-cols-2 gap-1 bg-transparent p-0 sm:grid-cols-3 lg:grid-cols-4"
						>
							<TabsTriggerWithIcon
								value="all"
								icon={<Users className="h-4 w-4" />}
								label={`All (${stats.all})`}
							/>
							<TabsTriggerWithIcon
								value="active"
								icon={<UserCheck className="h-4 w-4" />}
								label={`Active (${stats.active})`}
							/>
							<TabsTriggerWithIcon
								value="pending"
								icon={<Clock className="h-4 w-4" />}
								label={`Pending (${stats.pending})`}
							/>
							<TabsTriggerWithIcon
								value="inactive"
								icon={<Building className="h-4 w-4" />}
								label={`No Lease (${stats.inactive})`}
							/>
						</TabsListEnhanced>
					</div>

					{/* All Tabs Content */}
					{['all', 'active', 'pending', 'inactive'].map(tabValue => (
						<TabsContent
							key={tabValue}
							value={tabValue}
							className="mt-6"
						>
							{/* Loading State */}
							{isLoading && (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
									{[...Array(6)].map((_, i) => (
										<div key={i} className="animate-pulse">
											<div className="bg-card space-y-4 rounded-lg border p-6">
												<div className="flex items-center space-x-4">
													<div className="bg-muted h-12 w-12 rounded-xl"></div>
													<div className="flex-1">
														<div className="bg-muted mb-2 h-4 w-3/4 rounded"></div>
														<div className="bg-muted h-3 w-1/2 rounded"></div>
													</div>
												</div>
												<div className="space-y-2">
													<div className="bg-muted h-3 rounded"></div>
													<div className="bg-muted h-3 w-5/6 rounded"></div>
												</div>
											</div>
										</div>
									))}
								</div>
							)}

							{/* Tenants Grid */}
							{!isLoading && filteredTenants.length > 0 && (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
									{filteredTenants.map((tenant, index) => (
										<TenantCard
											key={tenant.id}
											tenant={{
												...tenant,
												leases: tenant.leases?.map(
													lease => ({
														...lease,
														monthlyRent:
															lease.rentAmount
													})
												)
											}}
											onViewDetails={handleViewTenant}
											delay={index * 0.05}
										/>
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
														onClick: () =>
															setIsInviteModalOpen(
																true
															)
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

			<InviteTenantModal
				isOpen={isInviteModalOpen}
				onClose={() => setIsInviteModalOpen(false)}
			/>
		</div>
	)
}

export default TenantsPage
