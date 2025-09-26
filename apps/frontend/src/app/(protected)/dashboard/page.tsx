import { getDashboardData } from '@/app/actions/dashboard'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { Card } from '@/components/ui/card'
import { createLogger } from '@repo/shared'
import { Building2, DollarSign, Users, Wrench } from 'lucide-react'

const logger = createLogger({ component: 'DashboardPage' })

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

// SSR-safe currency formatter - deterministic output
const formatCurrency = (amount: number) => {
	const dollars = Math.floor(amount)
	// Use basic number formatting without locale dependency
	return `$${dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export default async function Page() {
	let result
	try {
		// Fetch dashboard data server-side using Server Actions
		result = await getDashboardData()
	} catch (error) {
		// Catch any server component rendering errors
		logger.error('Server component error in dashboard', {
			metadata: {
				error:
					error instanceof Error
						? error.message
						: error || 'Unknown server error',
				stack: error instanceof Error ? error.stack : undefined,
				errorType: typeof error,
				errorName: error instanceof Error ? error.name : 'NonErrorType',
				hasError: !!error
			}
		})
		result = { success: false, error: 'Server component failed to render' }
	}

	let stats, activity, chartData
	if (result.success && result.data) {
		stats = result.data.stats
		activity = result.data.activity
		chartData = result.data.chartData
	} else {
		// If authentication failed, redirect to login
		if (
			!result.success &&
			'shouldRedirect' in result &&
			result.shouldRedirect
		) {
			const { redirect } = await import('next/navigation')
			redirect(result.shouldRedirect)
		}

		logger.error('Failed to fetch dashboard data', {
			metadata: {
				error: result.success
					? 'No data returned'
					: result.error || 'Unknown API error',
				hasResult: !!result,
				resultType: typeof result,
				resultKeys: result ? Object.keys(result) : []
			}
		})
		stats = fallbackData.stats
		activity = fallbackData.activity
		chartData = fallbackData.chartData
	}

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
							{stats?.properties?.total
								?.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0'}
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
							{stats?.tenants?.active
								?.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0'}
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
							{stats?.maintenance?.total
								?.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0'}
						</p>
					</div>
				</Card>
			</div>

			{/* Client Components Wrapper - Fixes Hydration Error */}
			<DashboardClient
				chartData={chartData || []}
				activityData={(activity?.activities || []) as ActivityRow[]}
			/>
		</div>
	)
}
