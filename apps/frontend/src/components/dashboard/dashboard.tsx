'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { motion } from '@/lib/framer-motion'
import { useAuth } from '../../hooks/use-auth'
import {
	useDashboardStats,
	useDashboardActivity
} from '../../hooks/api/use-dashboard'
import { Spinner } from '@/components/ui/spinner'
import {
	DashboardHeader,
	DashboardMetrics,
	DashboardQuickActions,
	DashboardActivityFeed,
	contentVariants
} from './index'
import {
	ErrorScreen,
	LoadingScreen
} from '@/components/common/centered-container'
import { PropertyFormDialog } from '@/components/properties/property-form-dialog'
import { MaintenanceRequestModal } from '@/components/maintenance/maintenance-request-modal'

export default function Dashboard() {
	const { user } = useAuth()
	const router = useRouter()
	const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>(
		'30d'
	)

	// Modal state management
	const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false)
	const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false)

	// Use React Query hooks for dashboard data
	const {
		data: stats,
		isLoading: isStatsLoading,
		error: statsError
	} = useDashboardStats({
		enabled: !!user?.id,
		refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
	})

	const {
		data: activities,
		isLoading: isActivitiesLoading,
		error: activitiesError
	} = useDashboardActivity(10, {
		enabled: !!user?.id
	})

	const isLoading = isStatsLoading || isActivitiesLoading
	const hasError = statsError || activitiesError

	// Quick action handlers
	const handleAddProperty = () => {
		setIsPropertyModalOpen(true)
		logger.info('Add property clicked', { component: 'dashboard' })
	}

	const handleNewTenant = () => {
		router.push('/tenants/new')
		logger.info('New tenant clicked', { component: 'dashboard' })
	}

	const handleScheduleMaintenance = () => {
		setIsMaintenanceModalOpen(true)
		logger.info('Schedule maintenance clicked', { component: 'dashboard' })
	}

	const handleGenerateReport = () => {
		router.push('/reports')
		logger.info('Generate report clicked', { component: 'dashboard' })
	}

	if (hasError) {
		return (
			<ErrorScreen>
				<Spinner size="xl" color="red" className="mx-auto mb-4" />
				<p className="mb-2 text-white/70">
					Failed to load dashboard data
				</p>
				<button
					onClick={() => window.location.reload()}
					className="text-[#60a5fa] hover:underline"
				>
					Try refreshing the page
				</button>
			</ErrorScreen>
		)
	}

	if (isLoading) {
		return (
			<LoadingScreen>
				<Spinner size="xl" color="blue" className="mx-auto mb-4" />
				<p className="text-white/70">Loading dashboard...</p>
			</LoadingScreen>
		)
	}

	return (
		<>
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
					stats={stats || null}
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
						activities={activities || []}
						isLoading={isActivitiesLoading}
					/>
				</div>
			</motion.div>

			{/* Modals */}
			<PropertyFormDialog
				open={isPropertyModalOpen}
				onOpenChange={setIsPropertyModalOpen}
				mode="create"
			/>

			<MaintenanceRequestModal
				open={isMaintenanceModalOpen}
				onOpenChange={setIsMaintenanceModalOpen}
			/>
		</>
	)
}
