'use client'

import { useState } from 'react'
import { motion } from '@/lib/lazy-motion'
import { useAuth } from '@/hooks/use-auth'
<<<<<<< HEAD
import type { ActivityItem, ActivityType } from '@repo/shared'
=======
>>>>>>> origin/main
import {
	useDashboardOverview,
	useDashboardActivity
} from '../../hooks/api/use-dashboard'
import {
	DashboardHeader,
	DashboardMetrics,
	DashboardQuickActions,
	DashboardActivityFeed,
	contentVariants
} from './index'
import { DashboardErrorBoundary } from './dashboard-error-boundary'
import { DashboardStatsLoading } from './dashboard-stats-loading'
<<<<<<< HEAD
import { logger } from '@/lib/logger/logger'
=======
import { logger } from '@/lib/logger'
>>>>>>> origin/main

function DashboardContent() {
	const { user } = useAuth()
	const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>(
		'30d'
	)

	// Use React Query hooks for dashboard data
	const {
		data: stats,
		isLoading: isStatsLoading,
		error: statsError
	} = useDashboardOverview({
		enabled: !!user?.id,
		refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
	})

	const {
		data: activities,
		isLoading: isActivitiesLoading,
		error: activitiesError
	} = useDashboardActivity({
		enabled: !!user?.id
	})

	// Quick action handlers with router navigation
	const handleAddProperty = () => {
		logger.info('Add property clicked', { component: 'dashboard' })
		window.location.href = '/properties/new'
	}

	const handleNewTenant = () => {
		logger.info('New tenant clicked', { component: 'dashboard' })
		window.location.href = '/tenants/new'
	}

	const handleScheduleMaintenance = () => {
		logger.info('Schedule maintenance clicked', { component: 'dashboard' })
		window.location.href = '/maintenance/new'
	}

	const handleGenerateReport = () => {
		logger.info('Generate report clicked', { component: 'dashboard' })
		window.location.href = '/reports'
	}

	// Loading states
	if (isStatsLoading) {
		return <DashboardStatsLoading />
	}

	// Error handling - throw to be caught by error boundary
	if (statsError || activitiesError) {
<<<<<<< HEAD
		throw new Error(
			statsError?.message ||
				activitiesError?.message ||
				'Dashboard loading failed'
		)
=======
		throw statsError || activitiesError
>>>>>>> origin/main
	}

	return (
		<motion.div
			variants={contentVariants}
			initial="hidden"
			animate="visible"
			className="space-y-8"
		>
			{/* Header Section */}
			<DashboardHeader
				userEmail={user?.email}
				selectedPeriod={selectedPeriod}
				onPeriodChange={setSelectedPeriod}
			/>

			{/* Metrics Grid */}
			<DashboardMetrics
				stats={stats ?? null}
				isLoading={isStatsLoading}
			/>

			{/* Quick Actions and Recent Activity */}
			<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
				{/* Quick Actions */}
				<DashboardQuickActions
					onAddProperty={handleAddProperty}
					onNewTenant={handleNewTenant}
					onScheduleMaintenance={handleScheduleMaintenance}
					onGenerateReport={handleGenerateReport}
				/>

				{/* Recent Activity */}
				<DashboardActivityFeed
<<<<<<< HEAD
					activities={
						(activities?.filter(
							activity => activity.type !== undefined
						) as Array<ActivityItem & { type: ActivityType }>) ?? []
					}
=======
					activities={activities ?? []}
>>>>>>> origin/main
					isLoading={isActivitiesLoading}
				/>
			</div>
		</motion.div>
	)
}

export default function Dashboard() {
	return (
		<DashboardErrorBoundary>
			<DashboardContent />
		</DashboardErrorBoundary>
	)
}
