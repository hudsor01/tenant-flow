'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useOwnerDashboardData } from '#hooks/api/use-owner-dashboard'
import type { DashboardStats, ActivityItem, PropertyPerformance } from '@repo/shared/types/core'
import type { MetricTrend, TimeSeriesDataPoint } from '@repo/shared/types/dashboard-repository'

interface DashboardData {
	stats: DashboardStats
	activity: ActivityItem[]
	metricTrends: {
		occupancyRate: MetricTrend | null
		activeTenants: MetricTrend | null
		monthlyRevenue: MetricTrend | null
		openMaintenance: MetricTrend | null
	}
	timeSeries: {
		occupancyRate: TimeSeriesDataPoint[]
		monthlyRevenue: TimeSeriesDataPoint[]
	}
	propertyPerformance: PropertyPerformance[]
}

interface DashboardContextValue {
	data: DashboardData | undefined
	isLoading: boolean
	error: Error | null
	refetch: () => void
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined)

interface DashboardProviderProps {
	children: ReactNode
}

export function DashboardProvider({ children }: DashboardProviderProps) {
	const { data, isLoading, error, refetch } = useOwnerDashboardData()

	const contextValue: DashboardContextValue = {
		data,
		isLoading,
		error,
		refetch
	}

	return (
		<DashboardContext.Provider value={contextValue}>
			{children}
		</DashboardContext.Provider>
	)
}

export function useDashboardContext(): DashboardContextValue {
	const context = useContext(DashboardContext)
	if (context === undefined) {
		throw new Error('useDashboardContext must be used within a DashboardProvider')
	}
	return context
}
export function useDashboardStats() {
	const { data, isLoading } = useDashboardContext()
	return { stats: data?.stats, isLoading }
}

export function useDashboardTrends() {
	const { data, isLoading } = useDashboardContext()
	return { metricTrends: data?.metricTrends, timeSeries: data?.timeSeries, isLoading }
}

export function useDashboardActivity() {
	const { data, isLoading } = useDashboardContext()
	return { activity: data?.activity, isLoading }
}

export function usePropertyPerformance() {
	const { data, isLoading } = useDashboardContext()
	return { properties: data?.propertyPerformance, isLoading }
}