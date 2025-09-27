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
import { z } from 'zod'

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

// Zod schema for safe number coercion
const numberSchema = z.coerce.number().default(0)

export function SectionCards({ dashboardStats, propertyStats, leaseStats }: SectionCardsProps) {
	// Use Zod for safe number coercion
	const totalProperties = numberSchema.parse(
		dashboardStats?.totalProperties ??
		dashboardStats?.properties?.totalProperties ??
		propertyStats?.totalProperties
	)

	const totalTenants = numberSchema.parse(
		dashboardStats?.totalTenants ??
		dashboardStats?.tenants?.totalTenants
	)

	const monthlyRevenue = numberSchema.parse(
		dashboardStats?.revenue?.monthly ??
		dashboardStats?.totalRevenue ??
		propertyStats?.totalRevenue
	)

	const occupancyRate = numberSchema.parse(
		dashboardStats?.occupancyRate ??
		dashboardStats?.units?.occupancyRate ??
		propertyStats?.occupancyRate
	)

	const occupiedUnits = numberSchema.parse(propertyStats?.occupiedUnits)
	const totalUnits = numberSchema.parse(propertyStats?.totalUnits)

	const activeLeases = numberSchema.parse(
		leaseStats?.activeLeases ??
		dashboardStats?.leases?.active
	)

	const maintenanceRequests = numberSchema.parse(
		dashboardStats?.maintenanceRequests ??
		dashboardStats?.maintenance?.open
	)

	return (
		<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
			<MetricsCard
				title="Total Properties"
				value={totalProperties}
				description="Portfolio properties"
				icon={Building}
				colorVariant="property"
			/>

			<MetricsCard
				title="Total Tenants"
				value={totalTenants}
				description="Active tenants"
				icon={Users}
				colorVariant="primary"
			/>

			<MetricsCard
				title="Monthly Revenue"
				value={currencyFormatter.format(monthlyRevenue)}
				description="Current month"
				icon={DollarSign}
				colorVariant="revenue"
			/>

			<MetricsCard
				title="Occupancy Rate"
				value={percentageFormatter.format(occupancyRate / 100)}
				description={`${occupiedUnits} of ${totalUnits} units occupied`}
				icon={TrendingUp}
				colorVariant="success"
			/>

			<MetricsCard
				title="Active Leases"
				value={activeLeases}
				description="Current agreements"
				icon={FileText}
				colorVariant="info"
			/>

			<MetricsCard
				title="Maintenance Requests"
				value={maintenanceRequests}
				description="Open requests"
				icon={Wrench}
				colorVariant="warning"
			/>
		</div>
	)
}
