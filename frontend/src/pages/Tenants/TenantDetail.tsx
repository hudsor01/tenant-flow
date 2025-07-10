import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, DollarSign, AlertCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Tabs,
	TabsContent,
	TabsListEnhanced,
	TabsTriggerWithIcon
} from '@/components/ui/tabs'
import { useTenantDetailData } from '@/hooks/useTenantDetailData'
import { useTenantActions } from '@/hooks/useTenantActions'
import TenantHeaderSection from '@/components/tenant-management/TenantHeaderSection'
import TenantOverviewSection from '@/components/tenant-management/TenantOverviewSection'
import TenantLeaseSection from '@/components/tenant-management/TenantLeaseSection'
import TenantMaintenanceSection from '@/components/tenant-management/TenantMaintenanceSection'
import PaymentsList from '@/components/payments/PaymentsList'

/**
 * Tenant detail page component
 * Uses decomposed sections for better maintainability:
 * - TenantHeaderSection: Navigation, contact info, and actions
 * - TenantOverviewSection: Statistics and personal information
 * - TenantLeaseSection: Lease history display
 * - TenantMaintenanceSection: Maintenance requests history
 */
export default function TenantDetail() {
	const { tenantId } = useParams<{ tenantId: string }>()

	const {
		tenant,
		isLoading,
		error,
		maintenanceRequests,
		stats,
		currentLeaseInfo
	} = useTenantDetailData({ tenantId })

	const {
		activeTab,
		setActiveTab,
		handleSendEmail,
		handleCall,
		handleBackToTenants
	} = useTenantActions({ tenant })

	if (isLoading) {
		return (
			<div className="animate-pulse space-y-6">
				<div className="flex items-center space-x-4">
					<div className="h-10 w-10 rounded bg-gray-200" />
					<div className="h-8 w-64 rounded bg-gray-200" />
				</div>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					{[...Array(3)].map((_, i) => (
						<div key={i} className="h-32 rounded-lg bg-gray-200" />
					))}
				</div>
			</div>
		)
	}

	if (error || !tenant) {
		return (
			<div className="flex min-h-[400px] flex-col items-center justify-center">
				<User className="text-muted-foreground mb-4 h-12 w-12" />
				<h3 className="text-lg font-semibold">Tenant not found</h3>
				<p className="text-muted-foreground mt-2">
					The tenant you're looking for doesn't exist.
				</p>
				<Button onClick={handleBackToTenants} className="mt-4">
					Back to Tenants
				</Button>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<TenantHeaderSection
				tenant={tenant}
				currentLeaseInfo={currentLeaseInfo}
				onBackToTenants={handleBackToTenants}
				onSendEmail={handleSendEmail}
				onCall={handleCall}
			/>

			<TenantOverviewSection
				tenant={tenant}
				stats={stats}
				currentLeaseInfo={currentLeaseInfo}
			/>

			{/* Enhanced Tabs */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3 }}
			>
				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="space-y-6"
				>
					<div className="bg-card/90 border-border/50 relative overflow-hidden rounded-2xl border p-2 shadow-lg shadow-black/5 backdrop-blur-sm">
						<TabsListEnhanced
							variant="premium"
							className="grid h-auto w-full grid-cols-2 gap-1 bg-transparent p-0 sm:grid-cols-3 lg:grid-cols-4"
						>
							<TabsTriggerWithIcon
								value="overview"
								icon={<User className="h-4 w-4" />}
								label="Overview"
							/>
							<TabsTriggerWithIcon
								value="leases"
								icon={<FileText className="h-4 w-4" />}
								label="Lease History"
							/>
							<TabsTriggerWithIcon
								value="payments"
								icon={<DollarSign className="h-4 w-4" />}
								label="Payments"
							/>
							<TabsTriggerWithIcon
								value="maintenance"
								icon={<AlertCircle className="h-4 w-4" />}
								label="Maintenance"
							/>
						</TabsListEnhanced>
					</div>

					<TenantLeaseSection leases={tenant.leases} />

					<TabsContent value="payments" className="space-y-4">
						<PaymentsList
							tenantId={tenantId}
							showAddButton={true}
							title="Payment History"
							description={`All payments made by ${tenant.name}`}
						/>
					</TabsContent>

					<TenantMaintenanceSection
						maintenanceRequests={maintenanceRequests}
					/>
				</Tabs>
			</motion.div>
		</div>
	)
}
