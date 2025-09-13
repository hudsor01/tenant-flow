'use client'

import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { DataTable } from '@/components/data-table'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { SectionCards } from '@/components/section-cards'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { useProperties } from '@/hooks/api/properties'
import { useDashboardStats } from '@/hooks/api/use-dashboard'
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Tables } from '@repo/shared'
import { ErrorBoundary } from 'react-error-boundary'

// Enhanced error fallback component
function DashboardErrorFallback({
	error,
	resetErrorBoundary
}: {
	error: Error
	resetErrorBoundary: () => void
}) {
	const [isOnline, setIsOnline] = useState(
		typeof navigator !== 'undefined' ? navigator.onLine : true
	)

	useEffect(() => {
		const handleOnline = () => setIsOnline(true)
		const handleOffline = () => setIsOnline(false)

		window.addEventListener('online', handleOnline)
		window.addEventListener('offline', handleOffline)

		return () => {
			window.removeEventListener('online', handleOnline)
			window.removeEventListener('offline', handleOffline)
		}
	}, [])

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="px-4 lg:px-6">
				<Card className="border-destructive/20">
					<CardHeader>
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-destructive" />
							<CardTitle className="text-destructive">
								Dashboard Error
							</CardTitle>
						</div>
						<CardDescription>
							Something went wrong while loading the dashboard data.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert>
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>Error Details</AlertTitle>
							<AlertDescription>{error.message}</AlertDescription>
						</Alert>

						{!isOnline && (
							<Alert>
								<WifiOff className="h-4 w-4" />
								<AlertTitle>Connection Issue</AlertTitle>
								<AlertDescription>
									You appear to be offline. Check your internet connection and
									try again.
								</AlertDescription>
							</Alert>
						)}

						<div className="flex items-center gap-2">
							{isOnline && <Wifi className="h-4 w-4 text-success" />}
							{!isOnline && <WifiOff className="h-4 w-4 text-destructive" />}
							<span className="text-sm text-muted-foreground">
								Status: {isOnline ? 'Online' : 'Offline'}
							</span>
						</div>

						<div className="flex gap-2">
							<Button
								onClick={resetErrorBoundary}
								className="flex items-center gap-2"
								variant="default"
							>
								<RefreshCw className="h-4 w-4" />
								Retry Dashboard
							</Button>
							<Button
								onClick={() => window.location.reload()}
								variant="outline"
							>
								Refresh Page
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

// Enhanced retry component for individual sections
function RetryableSection({
	error,
	onRetry,
	title,
	children
}: {
	error: Error | null
	onRetry: () => void
	title: string
	children: React.ReactNode
}) {
	if (error) {
		return (
			<Alert className="border-destructive/20 bg-destructive/5">
				<AlertTriangle className="h-4 w-4" />
				<AlertTitle>Failed to load {title}</AlertTitle>
				<AlertDescription className="flex items-center justify-between">
					<span>{error.message}</span>
					<Button
						onClick={onRetry}
						size="sm"
						variant="outline"
						className="ml-2 flex items-center gap-1"
					>
						<RefreshCw className="h-3 w-3" />
						Retry
					</Button>
				</AlertDescription>
			</Alert>
		)
	}

	return <>{children}</>
}

function DashboardContent() {
	const {
		data: dashboardStats,
		isLoading,
		error,
		refetch
	} = useDashboardStats()
	const {
		data: propertiesData,
		isLoading: propertiesLoading,
		error: propertiesError,
		refetch: refetchProperties
	} = useProperties()

	// Loading state
	if (isLoading) {
		return (
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-center h-32">
					<LoadingSpinner variant="primary" />
				</div>
			</div>
		)
	}

	return (
		<div className="dashboard-root dashboard-main flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Enhanced error display for dashboard stats */}
			<div className="dashboard-section">
				<RetryableSection
					error={error as Error | null}
					onRetry={() => refetch()}
					title="dashboard statistics"
				>
					<SectionCards data={dashboardStats} />
				</RetryableSection>
			</div>

			<div className="dashboard-section px-4 lg:px-6">
				<ChartAreaInteractive />
			</div>

			{/* Enhanced error handling for properties */}
			<div className="dashboard-section px-4 lg:px-6">
				<RetryableSection
					error={propertiesError as Error | null}
					onRetry={() => refetchProperties()}
					title="properties data"
				>
					{propertiesLoading ? (
						<div className="flex items-center justify-center h-32">
							<LoadingSpinner variant="primary" />
						</div>
					) : propertiesData ? (
						<DataTable
							data={propertiesData.map((property: Tables<'Property'>, index: number) => ({
								id: index + 1,
								name: property.name,
								type: property.propertyType === 'SINGLE_FAMILY' ? 'house' as const :
								      property.propertyType === 'MULTI_UNIT' ? 'apartment' as const :
								      property.propertyType === 'APARTMENT' ? 'apartment' as const :
								      property.propertyType === 'COMMERCIAL' ? 'commercial' as const :
								      property.propertyType === 'CONDO' ? 'condo' as const :
								      property.propertyType === 'TOWNHOUSE' ? 'townhouse' as const : 'house' as const,
								status: 'active' as const,
								occupiedUnits: Math.floor(Math.random() * 8) + 2,
								totalUnits: Math.floor(Math.random() * 10) + 5,
								revenue: Math.floor(Math.random() * 50000) + 10000,
								manager: 'Property Manager',
								location: `${property.city}, ${property.state}`,
								lastUpdated: new Date().toISOString().split('T')[0] || '2024-01-01'
							}))}
						/>
					) : null}
				</RetryableSection>
			</div>
		</div>
	)
}

export default function DashboardPage() {
	return (
		<QueryErrorResetBoundary>
			{({ reset }) => (
				<ErrorBoundary
					FallbackComponent={DashboardErrorFallback}
					onReset={reset}
					resetKeys={['dashboard-page']}
				>
					<DashboardContent />
				</ErrorBoundary>
			)}
		</QueryErrorResetBoundary>
	)
}
