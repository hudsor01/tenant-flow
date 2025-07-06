import { useEffect, useState, useRef, useMemo } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import type { MaintenanceRequest } from '@/types/entities'

interface RealtimeMaintenanceEvent {
	eventType: 'INSERT' | 'UPDATE' | 'DELETE'
	old?: MaintenanceRequest
	new?: MaintenanceRequest
	timestamp: number
}

/**
 * Hook for real-time maintenance request updates using Supabase Realtime
 */
export function useRealtimeMaintenanceRequests() {
	const { user } = useAuth()
	const [latestEvent, setLatestEvent] =
		useState<RealtimeMaintenanceEvent | null>(null)
	const [isConnected, setIsConnected] = useState(false)
	const queryClient = useQueryClient()
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

	useEffect(() => {
		if (!user?.id) return

		logger.info(
			'Setting up Supabase realtime for maintenance requests',
			undefined,
			{ userId: user.id }
		)

		// Create Supabase realtime channel for maintenance requests
		const channel = supabase
			.channel('maintenance_requests_realtime')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'maintenance_requests',
					filter: `owner_id=eq.${user.id}`
				},
				payload => {
					logger.debug(
						'Realtime maintenance event received',
						undefined,
						{
							eventType: payload.eventType,
							recordId: payload.new?.id || payload.old?.id
						}
					)

					const event: RealtimeMaintenanceEvent = {
						eventType: payload.eventType as
							| 'INSERT'
							| 'UPDATE'
							| 'DELETE',
						old: payload.old as MaintenanceRequest,
						new: payload.new as MaintenanceRequest,
						timestamp: Date.now()
					}

					setLatestEvent(event)

					// Invalidate relevant queries to trigger refetch
					queryClient.invalidateQueries({ queryKey: ['maintenance'] })
					queryClient.invalidateQueries({
						queryKey: ['maintenanceRequests']
					})
					queryClient.invalidateQueries({
						queryKey: ['pendingMaintenanceRequests']
					})
					queryClient.invalidateQueries({
						queryKey: ['maintenance-alerts']
					})
				}
			)
			.subscribe(status => {
				logger.debug('Realtime subscription status', undefined, {
					status
				})
				setIsConnected(status === 'SUBSCRIBED')
			})

		channelRef.current = channel

		return () => {
			logger.debug(
				'Cleaning up realtime maintenance subscription',
				undefined,
				{ userId: user.id }
			)
			setIsConnected(false)
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current)
				channelRef.current = null
			}
		}
	}, [user?.id, queryClient])

	return {
		latestEvent,
		isConnected,
		clearLatestEvent: () => setLatestEvent(null)
	}
}

/**
 * Hook to get maintenance request statistics in real-time
 */
export function useRealtimeMaintenanceStats() {
	const { user } = useAuth()
	const { latestEvent } = useRealtimeMaintenanceRequests()

	// Get current maintenance requests for stats calculation
	const { data: maintenanceRequests = [] } = useQuery({
		queryKey: ['maintenanceRequests', user?.id],
		queryFn: async () => {
			if (!user?.id) return []
			return await apiClient.maintenance.getAll()
		},
		enabled: !!user?.id
	})

	// Calculate real-time stats from actual data
	const stats = useMemo(
		() => ({
			total: maintenanceRequests.length,
			open: maintenanceRequests.filter(req => req.status === 'OPEN')
				.length,
			inProgress: maintenanceRequests.filter(
				req => req.status === 'IN_PROGRESS'
			).length,
			completed: maintenanceRequests.filter(
				req => req.status === 'COMPLETED'
			).length,
			urgent: maintenanceRequests.filter(
				req => req.priority === 'EMERGENCY'
			).length,
			high: maintenanceRequests.filter(req => req.priority === 'HIGH')
				.length,
			avgResponseTime: calculateAverageResponseTime(maintenanceRequests),
			recentRequests: maintenanceRequests.filter(req => {
				const daysSinceCreated =
					(Date.now() - new Date(req.createdAt).getTime()) /
					(1000 * 60 * 60 * 24)
				return daysSinceCreated <= 7 // Last 7 days
			}).length
		}),
		[maintenanceRequests]
	)

	// Log stats update when realtime event occurs
	useEffect(() => {
		if (!user?.id || !latestEvent) return

		logger.debug('Maintenance stats updated via realtime', undefined, {
			eventType: latestEvent.eventType,
			recordId: latestEvent.new?.id || latestEvent.old?.id,
			newStats: stats
		})
	}, [latestEvent, user?.id, stats])

	return stats
}

// Helper function to calculate average response time
function calculateAverageResponseTime(requests: MaintenanceRequest[]): number {
	const completedRequests = requests.filter(
		req => req.status === 'COMPLETED' && req.completedAt && req.createdAt
	)

	if (completedRequests.length === 0) return 0

	const totalResponseTime = completedRequests.reduce((sum, req) => {
		const created = new Date(req.createdAt).getTime()
		const completed = new Date(req.completedAt!).getTime()
		return sum + (completed - created)
	}, 0)

	// Return average in hours
	return Math.round(
		totalResponseTime / completedRequests.length / (1000 * 60 * 60)
	)
}
