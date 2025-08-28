/**
 * Native Supabase Realtime subscription for notifications
 * Using existing patterns from supabase client - no custom abstractions
 * Enhanced to handle edge cases and production scenarios
 */
import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { useAppActions } from '@/stores/app-store'
import { notifications } from '@/lib/toast'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'

export function useNotificationRealtime(userId: string | null) {
	const queryClient = useQueryClient()
	const { addNotification } = useAppActions()
	const channelRef = useRef<RealtimeChannel | null>(null)

	// Handler for new notifications - memoized to prevent recreating
	const handleNewNotification = useCallback((payload: any) => {
		try {
			// Safely extract notification data with fallbacks
			const dbNotification = payload?.new as Database['public']['Tables']['InAppNotification']['Row']
			
			// Validate we have minimum required data
			if (!dbNotification) {
				console.warn('Received malformed notification payload:', payload)
				return
			}

			// Safely get priority with fallback
			const priority = dbNotification.priority?.toUpperCase() || 'LOW'
			const title = dbNotification.title || 'Notification'
			const content = dbNotification.content || ''
			
			// Determine notification level for Zustand store
			let level: 'error' | 'warning' | 'info' = 'info'
			if (priority === 'HIGH' || priority === 'EMERGENCY') {
				level = 'error'
			} else if (priority === 'MEDIUM') {
				level = 'warning'
			}
			
			// Add to Zustand store with safe defaults
			addNotification({
				title,
				message: content,
				level,
				read: false,
				autoHide: true,
				duration: priority === 'EMERGENCY' ? 8000 : 5000
			})

			// Show toast notification with appropriate styling
			const priorityEmoji = 
				priority === 'EMERGENCY' ? '🚨' : 
				priority === 'HIGH' ? '⚠️' : 
				priority === 'MEDIUM' ? '🔔' : 
				'ℹ️'
			
			const toastTitle = `${priorityEmoji} ${title}`
			const toastOptions = content ? { description: content } : undefined
			
			// Use appropriate toast method based on priority
			if (priority === 'HIGH' || priority === 'EMERGENCY') {
				notifications.error(toastTitle, toastOptions)
			} else if (priority === 'MEDIUM') {
				notifications.warning(toastTitle, toastOptions)
			} else {
				notifications.info(toastTitle, toastOptions)
			}

			// Invalidate notifications queries to refresh UI
			queryClient.invalidateQueries({ queryKey: ['notifications'] })
			
		} catch (error) {
			// Gracefully handle any errors in notification processing
			console.error('Error processing notification:', error)
		}
	}, [addNotification, queryClient])

	// Handler for notification updates - memoized
	const handleNotificationUpdate = useCallback(() => {
		// Notification updated (e.g., marked as read) - refresh queries
		queryClient.invalidateQueries({ queryKey: ['notifications'] })
	}, [queryClient])

	useEffect(() => {
		// Early return if no user or Supabase not available
		if (!userId || !supabase) {
			return
		}

		// Cleanup any existing channel before creating new one
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current)
			channelRef.current = null
		}

		try {
			// Create channel for user's notifications using native Supabase patterns
			const channel = supabase
				.channel(`notifications:${userId}`)
				.on(
					'postgres_changes',
					{
						event: 'INSERT',
						schema: 'public',
						table: 'InAppNotification',
						filter: `userId=eq.${userId}`
					},
					handleNewNotification
				)
				.on(
					'postgres_changes',
					{
						event: 'UPDATE',
						schema: 'public',
						table: 'InAppNotification',
						filter: `userId=eq.${userId}`
					},
					handleNotificationUpdate
				)
				.subscribe((status) => {
					// Log subscription status for debugging
					if (status === 'SUBSCRIBED') {
						console.debug(`Notification channel subscribed for user: ${userId}`)
					} else if (status === 'CHANNEL_ERROR') {
						console.error(`Failed to subscribe to notification channel for user: ${userId}`)
					}
				})

			// Store channel reference
			channelRef.current = channel
			
		} catch (error) {
			console.error('Failed to setup notification subscription:', error)
		}

		// Cleanup function
		return () => {
			// Safely cleanup channel subscription
			if (channelRef.current) {
				try {
					supabase.removeChannel(channelRef.current)
				} catch (error) {
					// Silently handle cleanup errors (e.g., already closed)
					console.debug('Channel cleanup error (non-critical):', error)
				} finally {
					channelRef.current = null
				}
			}
		}
	}, [userId, handleNewNotification, handleNotificationUpdate])

	return {
		// Return channel ref for debugging and testing
		channel: channelRef.current
	}
}