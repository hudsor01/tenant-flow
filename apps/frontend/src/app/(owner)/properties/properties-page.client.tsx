'use client'

import { Alert, AlertDescription, AlertTitle } from '#components/ui/alert'
import { Button } from '#components/ui/button'
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import {
	Empty,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import { Skeleton } from '#components/ui/skeleton'
import { propertyQueries } from '#hooks/api/queries/property-queries'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PropertyStats } from '@repo/shared/types/core'
import {
	AlertCircle,
	Building2,
	Plus,
	RefreshCw,
	TrendingDown,
	TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { PropertiesViewClient } from './properties-view.client'
import { PropertyBulkImportDialog } from '#components/properties/bulk-import-dialog'
import { PropertyGridSkeleton } from './property-card-skeleton'
import { ErrorBoundary } from '#components/error-boundary/error-boundary'
import { toast } from 'sonner'
import { useCallback, useState } from 'react'

/**
 * PropertiesPageSkeleton - Full page loading skeleton with staggered animations
 */
function PropertiesPageSkeleton() {
	return (
		<div className="flex-1 flex flex-col gap-8">
			{/* Header Card Skeleton */}
			<div className="card-standard shadow-md p-6 animate-in fade-in slide-in-from-bottom-4">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex-1 space-y-3">
						<div className="flex items-center gap-4">
							<Skeleton className="size-10 rounded-xl" />
							<div className="space-y-2">
								<Skeleton className="h-8 w-40" />
								<Skeleton className="h-4 w-64" />
							</div>
						</div>
					</div>
					<div className="flex flex-wrap gap-3 lg:gap-4">
						{[1, 2, 3].map(i => (
							<Skeleton
								key={i}
								className="h-16 w-28 rounded-xl animate-in fade-in"
								style={{ animationDelay: `${i * 100}ms` }}
							/>
						))}
					</div>
				</div>
				<div className="border-t mt-6 pt-5">
					<div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<Skeleton className="h-4 w-48" />
						<div className="flex gap-3">
							<Skeleton className="h-11 w-32 rounded-md" />
							<Skeleton className="h-11 w-36 rounded-md" />
						</div>
					</div>
				</div>
			</div>

			{/* Stats Cards Skeleton */}
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{[1, 2, 3, 4].map(i => (
					<div
						key={i}
						className="card-standard p-6 animate-in fade-in slide-in-from-bottom-4"
						style={{ animationDelay: `${i * 75}ms` }}
					>
						<div className="space-y-3">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-8 w-16" />
						</div>
						<div className="mt-4 pt-4 border-t space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-40" />
						</div>
					</div>
				))}
			</div>

			{/* Properties View Skeleton */}
			<div className="space-y-4">
				<div className="flex-between">
					<Skeleton className="h-7 w-24" />
					<Skeleton className="h-9 w-20 rounded-md" />
				</div>
				{/* Search and Filter Controls Skeleton */}
				<div className="flex-between gap-3 flex-wrap">
					<Skeleton className="h-10 flex-1 min-w-[200px] max-w-md rounded-md" />
					<div className="flex items-center gap-2">
						<Skeleton className="h-10 w-36 rounded-md" />
						<Skeleton className="h-10 w-40 rounded-md" />
					</div>
				</div>
				{/* Property Grid Skeleton */}
				<PropertyGridSkeleton count={6} />
			</div>
		</div>
	)
}

const defaultStats: PropertyStats = {
	total: 0,
	occupied: 0,
	vacant: 0,
	occupancyRate: 0,
	totalMonthlyRent: 0,
	averageRent: 0
}

/**
 * PropertiesErrorFallback - Professional and friendly error state with retry functionality
 */
function PropertiesErrorFallback({
	error,
	onRetry,
	isRetrying
}: {
	error: Error | null
	onRetry: () => void
	isRetrying: boolean
}) {
	return (
		<Empty className="flex-1 py-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
			<EmptyMedia
				variant="icon"
				className="bg-destructive/10 text-destructive size-14 rounded-xl"
			>
				<AlertCircle className="size-7" />
			</EmptyMedia>
			<EmptyTitle className="text-xl">
				We couldn&apos;t load your properties
			</EmptyTitle>
			<EmptyDescription className="max-w-md">
				Don&apos;t worry — this is likely a temporary issue. Your data is safe,
				and we just need to reconnect.
				{error?.message && (
					<span className="block mt-3 font-mono text-xs bg-muted/50 rounded-lg p-3 text-left">
						{error.message}
					</span>
				)}
			</EmptyDescription>
			<div className="flex flex-col items-center gap-3 mt-2">
				<Button
					onClick={onRetry}
					disabled={isRetrying}
					size="lg"
					className="min-h-12 px-8 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
				>
					{isRetrying ? (
						<>
							<RefreshCw className="size-4 mr-2 animate-spin" />
							Reconnecting...
						</>
					) : (
						<>
							<RefreshCw className="size-4 mr-2" />
							Try Again
						</>
					)}
				</Button>
				<p className="text-xs text-muted-foreground text-center max-w-sm">
					If this keeps happening, check your internet connection or{' '}
					<a
						href="mailto:support@tenantflow.com"
						className="text-primary hover:underline"
					>
						contact support
					</a>
				</p>
			</div>
		</Empty>
	)
}

export function PropertiesPageClient() {
	const queryClient = useQueryClient()
	const [isRetrying, setIsRetrying] = useState(false)

	const {
		data: propertiesResponse,
		isLoading: propertiesLoading,
		error: propertiesError,
		refetch: refetchProperties
	} = useQuery(propertyQueries.list())
	const properties = propertiesResponse?.data ?? []
	const {
		data: stats = defaultStats,
		isLoading: statsLoading,
		refetch: refetchStats
	} = useQuery(propertyQueries.stats())

	const isLoading = propertiesLoading || statsLoading
	const hasError = !!propertiesError
	const errorMessage =
		propertiesError instanceof Error
			? propertiesError.message
			: 'Failed to load properties'

	// Retry handler with toast feedback
	const handleRetry = useCallback(async () => {
		setIsRetrying(true)
		toast.loading('Refreshing properties...', { id: 'properties-retry' })

		try {
			await Promise.all([
				refetchProperties(),
				refetchStats(),
				queryClient.invalidateQueries({ queryKey: propertyQueries.all() })
			])
			toast.success('Properties refreshed successfully', {
				id: 'properties-retry'
			})
		} catch {
			toast.error('Failed to refresh properties. Please try again.', {
				id: 'properties-retry'
			})
		} finally {
			setIsRetrying(false)
		}
	}, [refetchProperties, refetchStats, queryClient])

	if (isLoading) {
		return <PropertiesPageSkeleton />
	}

	// Show error fallback if there's an error and no cached data
	if (hasError && properties.length === 0) {
		return (
			<PropertiesErrorFallback
				error={propertiesError instanceof Error ? propertiesError : null}
				onRetry={handleRetry}
				isRetrying={isRetrying}
			/>
		)
	}

	return (
		<div className="flex-1 flex flex-col gap-8">
			{/* Header Card - Enhanced with mockup-quality styling */}
			<Card className="card-standard shadow-md hover:shadow-lg transition-shadow duration-300">
				<CardHeader className="pb-6">
					<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
						{/* Title Section with icon-container-md */}
						<div className="flex-1 space-y-3">
							<div className="flex items-center gap-4">
								<div className="icon-container-md bg-primary/10 text-primary border border-primary/20 transition-transform duration-200 hover:scale-105">
									<Building2 className="size-5" />
								</div>
								<div>
									<h1 className="text-3xl font-semibold tracking-tight leading-none">
										{' '}
										Properties{' '}
									</h1>
									<CardDescription className="text-base mt-1">
										Manage your property portfolio and track performance
									</CardDescription>
								</div>
							</div>
						</div>

						{/* Quick Stats - Enhanced visual hierarchy */}
						<div className="flex flex-wrap gap-3 lg:gap-4">
							<div className="flex-col-center rounded-xl border border-border bg-card/50 px-5 py-3.5 min-w-[110px] transition-all duration-200 hover:border-primary/30 hover:bg-card">
								<div className="text-2xl font-semibold text-foreground">
									{stats.total ?? properties.length}
								</div>
								<div className="text-xs text-muted-foreground font-medium mt-0.5">
									{' '}
									Total{' '}
								</div>
							</div>
							<div className="flex-col-center rounded-xl border border-border bg-card/50 px-5 py-3.5 min-w-[110px] transition-all duration-200 hover:border-primary/30 hover:bg-card">
								<div className="text-2xl font-semibold text-foreground">
									{stats.occupied ?? 0}
								</div>
								<div className="text-xs text-muted-foreground font-medium mt-0.5">
									{' '}
									Occupied{' '}
								</div>
							</div>
							<div className="flex-col-center rounded-xl border border-border bg-card/50 px-5 py-3.5 min-w-[110px] transition-all duration-200 hover:border-primary/30 hover:bg-card">
								<div className="text-2xl font-semibold text-foreground">
									{stats.vacant ?? 0}
								</div>
								<div className="text-xs text-muted-foreground font-medium mt-0.5">
									{' '}
									Vacant{' '}
								</div>
							</div>
						</div>
					</div>
				</CardHeader>

				{/* Action Buttons - Enhanced with hover effects and refined spacing */}
				<CardFooter className="border-t bg-muted/10 pt-5 pb-5">
					<div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						{/* Left side - Quick info with better typography */}
						<div className="flex items-center gap-3 text-sm text-muted-foreground">
							<span className="font-medium text-foreground">
								{stats.occupancyRate?.toFixed(0) ?? 0} % occupancy
							</span>
							<span className="text-border">•</span>
							<span className="font-medium text-foreground">
								${(stats.totalMonthlyRent ?? 0).toLocaleString()}/mo
							</span>
						</div>

						{/* Right side - Action buttons with enhanced hover effects */}
						<div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
							<PropertyBulkImportDialog />
							<Button
								asChild
								size="default"
								className="min-h-11 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
							>
								<Link href="/properties/new">
									<Plus className="size-4 mr-2" />
									New Property
								</Link>
							</Button>
						</div>
					</div>
				</CardFooter>
			</Card>

			{/* Error Alert with retry - shown when we have cached data but refresh failed */}
			{hasError && errorMessage && properties.length > 0 && (
				<Alert
					variant="destructive"
					className="animate-in fade-in slide-in-from-top-2 duration-300"
				>
					<AlertCircle className="size-4" />
					<AlertTitle>Unable to refresh properties</AlertTitle>
					<AlertDescription className="flex items-center justify-between gap-4">
						<span>{errorMessage}</span>
						<Button
							variant="outline"
							size="sm"
							onClick={handleRetry}
							disabled={isRetrying}
							className="shrink-0"
						>
							{isRetrying ? (
								<RefreshCw className="size-3.5 animate-spin" />
							) : (
								<RefreshCw className="size-3.5" />
							)}
							<span className="ml-1.5">Retry</span>
						</Button>
					</AlertDescription>
				</Alert>
			)}

			{/* Stats Cards */}
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardDescription>Total Properties </CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.total ?? properties.length}
						</CardTitle>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							Active properties <TrendingUp className="size-4" />
						</div>
						<div className="text-muted-foreground">
							Properties under management
						</div>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader>
						<CardDescription>Occupancy Rate </CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.occupancyRate?.toFixed(1) ?? 0} %
						</CardTitle>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							{(stats.occupancyRate ?? 0) >= 90
								? 'Strong performance'
								: 'Room for improvement'}
							{(stats.occupancyRate ?? 0) >= 90 ? (
								<TrendingUp className="size-4" />
							) : (
								<TrendingDown className="size-4" />
							)}
						</div>
						<div className="text-muted-foreground">
							{stats.occupied ?? 0} occupied of {stats.total ?? 0} units total
						</div>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader>
						<CardDescription>Vacant Units </CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.vacant ?? 0}
						</CardTitle>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							Available units
							<TrendingDown className="size-4" />
						</div>
						<div className="text-muted-foreground">
							Units ready for new tenants
						</div>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader>
						<CardDescription>Total Monthly Rent </CardDescription>
						<CardTitle className="text-2xl font-semibold">
							${(stats.totalMonthlyRent ?? 0).toLocaleString()}
						</CardTitle>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							Monthly income <TrendingUp className="size-4" />
						</div>
						<div className="text-muted-foreground">
							Avg: ${(stats.averageRent ?? 0).toLocaleString()}/unit
						</div>
					</CardFooter>
				</Card>
			</div>

			{/* Properties View with Grid/Table Toggle - wrapped in ErrorBoundary */}
			<ErrorBoundary
				fallback={
					<Empty className="py-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
						<EmptyMedia
							variant="icon"
							className="bg-destructive/10 text-destructive size-14 rounded-xl"
						>
							<AlertCircle className="size-7" />
						</EmptyMedia>
						<EmptyTitle className="text-xl">
							Unable to display properties
						</EmptyTitle>
						<EmptyDescription className="max-w-sm">
							Something unexpected happened while rendering your property list.
							Your data is safe — a quick refresh should fix this.
						</EmptyDescription>
						<Button
							onClick={handleRetry}
							disabled={isRetrying}
							size="lg"
							className="mt-2 min-h-12 px-8 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
						>
							{isRetrying ? (
								<>
									<RefreshCw className="size-4 mr-2 animate-spin" />
									Refreshing...
								</>
							) : (
								<>
									<RefreshCw className="size-4 mr-2" />
									Refresh Page
								</>
							)}
						</Button>
					</Empty>
				}
			>
				<PropertiesViewClient properties={properties} />
			</ErrorBoundary>
		</div>
	)
}
