/**
 * Supabase Realtime Subscription Hooks
 * Real-time data synchronization with React Query integration
 */

'use client'

import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
import { logger } from '@repo/shared/lib/frontend-logger'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

interface UseRealtimeSubscriptionOptions {
	table: string
	schema?: string
	filter?: string
	event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
	onInsert?: (payload: unknown) => void
	onUpdate?: (payload: unknown) => void
	onDelete?: (payload: unknown) => void
	enabled?: boolean
}

/**
 * Hook for subscribing to Supabase Realtime events
 * Automatically invalidates React Query cache on data changes
 *
 * Example:
 * useRealtimeSubscription({
 *   table: 'tenants',
 *   event: '*',
 *   onUpdate: (payload) => {
 *     // Handle tenant update
 *   }
 * })
 */
export function useRealtimeSubscription({
	table,
	schema = 'public',
	filter,
	event = '*',
	onInsert,
	onUpdate,
	onDelete,
	enabled = true
}: UseRealtimeSubscriptionOptions) {
	const queryClient = useQueryClient()
	const channelRef = useRef<RealtimeChannel | null>(null)
	const supabase = getSupabaseClientInstance()

	useEffect(() => {
		if (!enabled) return

		// Create channel name with filter for uniqueness
		const channelName = `${schema}:${table}${filter ? `:${filter}` : ''}`

		// Subscribe to table changes
		// Type assertion needed due to Supabase overload resolution
		type OnMethod = (
			event: string,
			config: { event: string; schema: string; table: string; filter?: string },
			callback: (payload: {
				eventType: string
				new?: unknown
				old?: unknown
			}) => void
		) => RealtimeChannel

		const subscribeOptions: {
			event: string
			schema: string
			table: string
			filter?: string
		} = {
			event,
			schema,
			table
		}
		if (filter) subscribeOptions.filter = filter

		const channel = (supabase.channel(channelName).on as OnMethod)(
			'postgres_changes',
			subscribeOptions,
			(payload: { eventType: string; new?: unknown; old?: unknown }) => {
				logger.debug('Realtime event received', {
					action: 'realtime_event',
					metadata: { table, event: payload.eventType }
				})

				// Invalidate relevant queries
				queryClient.invalidateQueries({ queryKey: [table] })

				// Call event-specific handlers
				switch (payload.eventType) {
					case 'INSERT':
						onInsert?.(payload.new)
						break
					case 'UPDATE':
						onUpdate?.(payload.new)
						break
					case 'DELETE':
						onDelete?.(payload.old)
						break
				}
			}
		).subscribe((status: string) => {
			if (status === 'SUBSCRIBED') {
				logger.info('Realtime subscription active', {
					action: 'realtime_subscribed',
					metadata: { table, channel: channelName }
				})
			} else if (status === 'CHANNEL_ERROR') {
				logger.error('Realtime subscription error', {
					action: 'realtime_error',
					metadata: { table, channel: channelName }
				})
			}
		})

		channelRef.current = channel

		// Cleanup on unmount
		return () => {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current)
				logger.debug('Realtime subscription cleaned up', {
					action: 'realtime_cleanup',
					metadata: { table }
				})
			}
		}
	}, [
		enabled,
		table,
		schema,
		filter,
		event,
		onInsert,
		onUpdate,
		onDelete,
		queryClient,
		supabase
	])

	return {
		unsubscribe: () => {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current)
			}
		}
	}
}

/**
 * Hook for subscribing to specific row changes
 * Useful for detail views that need real-time updates
 *
 * Example:
 * useRealtimeRow({
 *   table: 'tenants',
 *   id: tenant_id,
 *   onUpdate: (tenant) => {
 *     // Handle tenant update
 *   }
 * })
 */
export function useRealtimeRow<T = unknown>({
	table,
	id,
	schema = 'public',
	onUpdate,
	enabled = true
}: {
	table: string
	id: string
	schema?: string
	onUpdate?: (data: T) => void
	enabled?: boolean
}) {
	const queryClient = useQueryClient()

	useRealtimeSubscription({
		table,
		schema,
		filter: `id=eq.${id}`,
		event: 'UPDATE',
		onUpdate: payload => {
			// Update query cache with new data
			queryClient.setQueryData([table, 'detail', id], payload)
			onUpdate?.(payload as T)
		},
		enabled: enabled && !!id
	})
}

/**
 * Hook for subscribing to table changes with optimistic updates
 * Automatically updates React Query cache for list queries
 *
 * Example:
 * useRealtimeTable({
 *   table: 'tenants',
 *   queryKey: ['tenants', 'list']
 * })
 */
export function useRealtimeTable<T = unknown>({
	table,
	queryKey,
	schema = 'public',
	enabled = true
}: {
	table: string
	queryKey: unknown[]
	schema?: string
	enabled?: boolean
}) {
	const queryClient = useQueryClient()

	useRealtimeSubscription({
		table,
		schema,
		event: '*',
		onInsert: payload => {
			// Add new item to cache
			queryClient.setQueryData<T[]>(queryKey, old => {
				if (!old) return [payload as T]
				return [payload as T, ...old]
			})
		},
		onUpdate: payload => {
			// Update item in cache
			queryClient.setQueryData<T[]>(queryKey, old => {
				if (!old) return [payload as T]
				return old.map(item =>
					(item as { id: string }).id === (payload as { id: string }).id
						? (payload as T)
						: item
				)
			})
		},
		onDelete: payload => {
			// Remove item from cache
			queryClient.setQueryData<T[]>(queryKey, old => {
				if (!old) return []
				return old.filter(
					item => (item as { id: string }).id !== (payload as { id: string }).id
				)
			})
		},
		enabled
	})
}
