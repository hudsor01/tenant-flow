import { ChartArea } from '@/components/dashboard/chart-area'
import { DataTable } from '@/components/dashboard/data-table'
import { Card } from '@/components/ui/card'
import { dashboardApi } from '@/lib/api-client'
import { createLogger } from '@repo/shared'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2, DollarSign, Users, Wrench } from 'lucide-react'

const logger = createLogger({ component: 'DashboardPage' })

// Simple dashboard data fetcher
async function getDashboardData() {
	const [stats, activity] = await Promise.all([
		dashboardApi.getStats(),
		dashboardApi.getActivity()
	])

	return {
		stats,
		activity,
		chartData: []
	}
}

// Fallback data for when API is unavailable
const fallbackData = {
	stats: {
		properties: {
			total: 0,
			occupied: 0,
			vacant: 0,
			occupancyRate: 0,
			totalMonthlyRent: 0,
			averageRent: 0
		},
		tenants: { total: 0, active: 0, inactive: 0, newThisMonth: 0 },
		units: {
			total: 0,
			occupied: 0,
			vacant: 0,
			maintenance: 0,
			averageRent: 0,
			available: 0,
			occupancyRate: 0,
			occupancyChange: 0,
			totalPotentialRent: 0,
			totalActualRent: 0
		},
		leases: { total: 0, active: 0, expired: 0, expiringSoon: 0 },
		maintenance: {
			total: 0,
			open: 0,
			inProgress: 0,
			completed: 0,
			completedToday: 0,
			avgResolutionTime: 0,
			byPriority: { low: 0, medium: 0, high: 0, emergency: 0 }
		},
		revenue: { monthly: 0, yearly: 0, growth: 0 }
	},
	activity: { activities: [] },
	chartData: []
}

interface ActivityRow {
	type: string
	action: string
	details: string
	timestamp: string
}

// Column definitions for the activity table
const activityColumns: ColumnDef<ActivityRow>[] = [
	{
		accessorKey: 'type',
		header: 'Type',
		cell: ({ row }) => (
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-2)'
				}}
			>
				<span
					style={{
						display: 'inline-block',
						width: '8px',
						height: '8px',
						borderRadius: '50%',
						background:
							row.original.type === 'Property'
								? 'var(--color-system-blue)'
								: row.original.type === 'Tenant'
									? 'var(--color-system-green)'
									: row.original.type === 'Lease'
										? 'var(--color-system-yellow)'
										: 'var(--color-system-orange)'
					}}
				/>
				<span>{row.original.type}</span>
			</div>
		)
	},
	{
		accessorKey: 'action',
		header: 'Action'
	},
	{
		accessorKey: 'details',
		header: 'Details',
		cell: ({ row }) => (
			<span
				style={{
					fontSize: 'var(--font-caption-1)',
					color: 'var(--color-label-secondary)'
				}}
			>
				{row.original.details}
			</span>
		)
	},
	{
		accessorKey: 'timestamp',
		header: 'Time',
		cell: ({ row }) => (
			<span
				style={{
					fontSize: 'var(--font-caption-1)',
					color: 'var(--color-label-tertiary)'
				}}
			>
				{new Date(row.original.timestamp).toLocaleTimeString([], {
					hour: '2-digit',
					minute: '2-digit'
				})}
			</span>
		)
	}
]

// Format currency helper
const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0
	}).format(amount)
}

export default async function Page() {
	// Fetch dashboard data server-side
	let dashboardData
	try {
		dashboardData = await getDashboardData()
	} catch (error) {
		logger.error('Failed to fetch dashboard data', {
			message: error instanceof Error ? error.message : String(error)
		})
		dashboardData = fallbackData
	}

	const { stats, activity, chartData } = dashboardData

	return (
		<div
			className="flex flex-1 flex-col"
			style={{
				gap: 'var(--spacing-4)',
				padding: 'var(--spacing-3) var(--spacing-3) 0'
			}}
		>
			{/* Top Stats Cards */}
			<div
				className="grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-4"
				style={{ gap: 'var(--spacing-3)' }}
			>
				<Card
					className="card-glass-premium flex items-center justify-center"
					style={{
						background: 'var(--color-system-blue-10)',
						borderColor: 'var(--color-system-blue-25)',
						padding: 'var(--spacing-6)',
						aspectRatio: '16/9'
					}}
				>
					<div className="text-center">
						<Building2
							style={{
								width: 'var(--spacing-8)',
								height: 'var(--spacing-8)',
								margin: '0 auto var(--spacing-2)',
								color: 'var(--color-system-blue)'
							}}
						/>
						<p
							style={{
								fontSize: 'var(--font-footnote)',
								fontWeight: 600,
								color: 'var(--color-system-blue-85)',
								marginBottom: 'var(--spacing-1)'
							}}
						>
							Total Properties
						</p>
						<p
							style={{
								fontSize: 'var(--font-title-1)',
								fontWeight: 700,
								color: 'var(--color-label-primary)'
							}}
						>
							{stats?.properties?.total?.toLocaleString() || 0}
						</p>
					</div>
				</Card>
				<Card
					className="card-glass-premium flex items-center justify-center"
					style={{
						background: 'var(--color-system-green-10)',
						borderColor: 'var(--color-system-green-25)',
						padding: 'var(--spacing-6)',
						aspectRatio: '16/9'
					}}
				>
					<div className="text-center">
						<Users
							style={{
								width: 'var(--spacing-8)',
								height: 'var(--spacing-8)',
								margin: '0 auto var(--spacing-2)',
								color: 'var(--color-system-green)'
							}}
						/>
						<p
							style={{
								fontSize: 'var(--font-footnote)',
								fontWeight: 600,
								color: 'var(--color-system-green-85)',
								marginBottom: 'var(--spacing-1)'
							}}
						>
							Active Tenants
						</p>
						<p
							style={{
								fontSize: 'var(--font-title-1)',
								fontWeight: 700,
								color: 'var(--color-label-primary)'
							}}
						>
							{stats?.tenants?.active?.toLocaleString() || 0}
						</p>
					</div>
				</Card>
				<Card
					className="card-glass-premium flex items-center justify-center"
					style={{
						background: 'var(--color-accent-10)',
						borderColor: 'var(--color-accent-25)',
						padding: 'var(--spacing-6)',
						aspectRatio: '16/9'
					}}
				>
					<div className="text-center">
						<DollarSign
							style={{
								width: 'var(--spacing-8)',
								height: 'var(--spacing-8)',
								margin: '0 auto var(--spacing-2)',
								color: 'var(--color-accent-main)'
							}}
						/>
						<p
							style={{
								fontSize: 'var(--font-footnote)',
								fontWeight: 600,
								color: 'var(--color-accent-85)',
								marginBottom: 'var(--spacing-1)'
							}}
						>
							Monthly Revenue
						</p>
						<p
							style={{
								fontSize: 'var(--font-title-1)',
								fontWeight: 700,
								color: 'var(--color-label-primary)'
							}}
						>
							{formatCurrency(stats?.revenue?.monthly || 0)}
						</p>
					</div>
				</Card>
				<Card
					className="card-glass-premium flex items-center justify-center"
					style={{
						background: 'var(--color-system-orange-10)',
						borderColor: 'var(--color-system-orange-25)',
						padding: 'var(--spacing-6)',
						aspectRatio: '16/9'
					}}
				>
					<div className="text-center">
						<Wrench
							style={{
								width: 'var(--spacing-8)',
								height: 'var(--spacing-8)',
								margin: '0 auto var(--spacing-2)',
								color: 'var(--color-system-orange)'
							}}
						/>
						<p
							style={{
								fontSize: 'var(--font-footnote)',
								fontWeight: 600,
								color: 'var(--color-system-orange-85)',
								marginBottom: 'var(--spacing-1)'
							}}
						>
							Maintenance Requests
						</p>
						<p
							style={{
								fontSize: 'var(--font-title-1)',
								fontWeight: 700,
								color: 'var(--color-label-primary)'
							}}
						>
							{stats?.maintenance?.total?.toLocaleString() || 0}
						</p>
					</div>
				</Card>
			</div>

			{/* Chart Section */}
			<div style={{ width: '100%' }}>
				<ChartArea
					data={chartData || []}
					title="Revenue & Expenses"
					description="Monthly revenue and expenses overview"
				/>
			</div>

			{/* Activity Table */}
			<div style={{ width: '100%' }}>
				<DataTable
					columns={activityColumns}
					data={activity?.activities || []}
					title="Recent Activity"
					description="Latest updates across your properties"
				/>
			</div>
		</div>
	)
}
