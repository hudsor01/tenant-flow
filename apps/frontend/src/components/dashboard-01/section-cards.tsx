import { MetricsCard } from '@/components/charts/metrics-card'
import {
	Building,
	DollarSign,
	FileText,
	TrendingUp,
	Users,
	Wrench
} from 'lucide-react'
import type { DashboardStats, LeaseStatsResponse } from '@repo/shared'

interface SectionCardsProps {
	dashboardStats?: DashboardStats | null
	propertyStats?: {
		totalProperties: number
		totalUnits: number
		occupiedUnits: number
		occupancyRate: number
		totalRevenue: number
		vacantUnits: number
		maintenanceUnits: number
	} | null
	leaseStats?: LeaseStatsResponse | null
}

// Native formatters using Intl API
const currencyFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 0
})

const percentageFormatter = new Intl.NumberFormat('en-US', {
	style: 'percent',
	minimumFractionDigits: 1,
	maximumFractionDigits: 1
})

export function SectionCards({ dashboardStats, propertyStats, leaseStats }: SectionCardsProps) {
	// Extract data from actual API responses - no fallbacks, just use real data
	const totalProperties = propertyStats?.totalProperties || 0
	const totalTenants = dashboardStats?.tenants?.total || dashboardStats?.totalTenants || 0
	const monthlyRevenue = dashboardStats?.revenue?.monthly || propertyStats?.totalRevenue || 0
	const occupancyRate = propertyStats?.occupancyRate || 0
	const occupiedUnits = propertyStats?.occupiedUnits || 0
	const totalUnits = propertyStats?.totalUnits || 0
	const activeLeases = leaseStats?.activeLeases || 0
	const maintenanceRequests = dashboardStats?.maintenance?.open || 0

	return (
		<div
			className="grid grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-4"
			style={{
				gap: 'var(--dashboard-card-gap)',
				padding: '0 var(--dashboard-content-padding)'
			}}
		>
			<MetricsCard
				title="Total Properties"
				value={totalProperties}
				description="Portfolio properties"
				icon={Building}
				colorVariant="property"
				role="region"
				aria-label="Total Properties metric"
			/>

			<MetricsCard
				title="Total Tenants"
				value={totalTenants}
				description="Active tenants"
				icon={Users}
				colorVariant="primary"
				role="region"
				aria-label="Total Tenants metric"
			/>

			<MetricsCard
				title="Monthly Revenue"
				value={currencyFormatter.format(monthlyRevenue)}
				description="Current month"
				icon={DollarSign}
				colorVariant="revenue"
				role="region"
				aria-label="Monthly Revenue metric"
			/>

			<MetricsCard
				title="Occupancy Rate"
				value={percentageFormatter.format(occupancyRate / 100)}
				description={`${occupiedUnits} of ${totalUnits} units occupied`}
				icon={TrendingUp}
				colorVariant="success"
				role="region"
				aria-label="Occupancy Rate metric"
			/>

			<MetricsCard
				title="Active Leases"
				value={activeLeases}
				description="Current agreements"
				icon={FileText}
				colorVariant="info"
				role="region"
				aria-label="Active Leases metric"
			/>

			<MetricsCard
				title="Maintenance Requests"
				value={maintenanceRequests}
				description="Open requests"
				icon={Wrench}
				colorVariant="warning"
				role="region"
				aria-label="Maintenance Requests metric"
			/>
		</div>
	)
}
