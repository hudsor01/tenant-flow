import { MetricsCard } from '@/components/charts/metrics-card'
import { ChartAreaInteractive } from '@/components/dashboard-01/chart-area-interactive'
import { DataTable } from '@/components/dashboard-01/data-table'
import { getDashboardPageData } from '@/lib/api/dashboard-server'
import {
	Building,
	DollarSign,
	FileText,
	TrendingUp,
	Users,
	Wrench
} from 'lucide-react'

// Enable ISR with 60 second revalidation for better performance
export const revalidate = 60

// Enable dynamic rendering for authenticated content
export const dynamic = 'force-dynamic'

export default async function Page() {
	// Fetch all dashboard data server-side for better performance
	const { dashboardStats, propertyStats, leaseStats } =
		await getDashboardPageData()

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Dashboard Overview Metrics */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
				<MetricsCard
					title="Total Properties"
					value={
						dashboardStats.totalProperties || propertyStats.totalProperties || 0
					}
					description="Portfolio properties"
					icon={Building}
					colorVariant="property"
				/>

				<MetricsCard
					title="Total Tenants"
					value={dashboardStats.totalTenants || 0}
					description="Active tenants"
					icon={Users}
					colorVariant="primary"
				/>

				<MetricsCard
					title="Monthly Revenue"
					value={new Intl.NumberFormat('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0
					}).format(
						dashboardStats.revenue?.monthly ||
							dashboardStats.totalRevenue ||
							propertyStats.totalRevenue ||
							0
					)}
					description="Current month"
					icon={DollarSign}
					colorVariant="revenue"
				/>

				<MetricsCard
					title="Occupancy Rate"
					value={`${(dashboardStats.occupancyRate || propertyStats.occupancyRate || 0).toFixed(1)}%`}
					description={`${propertyStats.occupiedUnits || 0} of ${propertyStats.totalUnits || 0} units`}
					icon={TrendingUp}
					colorVariant="success"
				/>

				<MetricsCard
					title="Active Leases"
					value={leaseStats.activeLeases || 0}
					description="Current agreements"
					icon={FileText}
					colorVariant="info"
				/>

				<MetricsCard
					title="Maintenance"
					value={
						dashboardStats.maintenanceRequests ||
						dashboardStats.maintenance?.open ||
						0
					}
					description="Open requests"
					icon={Wrench}
					colorVariant="warning"
				/>
			</div>

			<div className="px-4 lg:px-6">
				<ChartAreaInteractive />
			</div>

			<DataTable data={[]} />
		</div>
	)
}
