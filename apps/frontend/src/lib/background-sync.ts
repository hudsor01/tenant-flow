/**
 * Background Sync Optimization for TanStack Query
 * 
 * Provides intelligent background synchronization strategies
 * to keep data fresh without overwhelming the user interface.
 */

import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

/**
 * Background sync priorities
 */
export const SYNC_PRIORITIES = {
	critical: { interval: 30 * 1000, staleTime: 0 }, // 30 seconds
	high: { interval: 60 * 1000, staleTime: 30 * 1000 }, // 1 minute
	medium: { interval: 5 * 60 * 1000, staleTime: 2 * 60 * 1000 }, // 5 minutes
	low: { interval: 15 * 60 * 1000, staleTime: 10 * 60 * 1000 }, // 15 minutes
} as const

/**
 * Configuration for different data types
 */
export const SYNC_CONFIG = {
	// Real-time data that changes frequently
	realtime: {
		notifications: SYNC_PRIORITIES.critical,
		maintenance: SYNC_PRIORITIES.high,
		payments: SYNC_PRIORITIES.high,
	},
	// Business data that changes moderately
	business: {
		properties: SYNC_PRIORITIES.medium,
		tenants: SYNC_PRIORITIES.medium,
		subscriptions: SYNC_PRIORITIES.medium,
	},
	// Reference data that rarely changes
	reference: {
		auth: SYNC_PRIORITIES.low,
		settings: SYNC_PRIORITIES.low,
		blog: SYNC_PRIORITIES.low,
	},
} as const

/**
 * Background sync manager
 */
export class BackgroundSyncManager {
	private static instance: BackgroundSyncManager
	private queryClient: QueryClient
	private intervals = new Map<string, NodeJS.Timeout>()
	private isVisible = true
	private isOnline = true

	constructor(queryClient: QueryClient) {
		this.queryClient = queryClient
		this.setupEventListeners()
	}

	static getInstance(queryClient: QueryClient): BackgroundSyncManager {
		if (!BackgroundSyncManager.instance) {
			BackgroundSyncManager.instance = new BackgroundSyncManager(queryClient)
		}
		return BackgroundSyncManager.instance
	}

	/**
	 * Set up visibility and network change listeners
	 */
	private setupEventListeners() {
		// Page visibility changes
		document.addEventListener('visibilitychange', () => {
			this.isVisible = !document.hidden
			
			if (this.isVisible) {
				this.resumeSync()
			} else {
				this.pauseSync()
			}
		})

		// Network status changes
		window.addEventListener('online', () => {
			this.isOnline = true
			this.resumeSync()
		})

		window.addEventListener('offline', () => {
			this.isOnline = false
			this.pauseSync()
		})

		// Focus events for immediate sync
		window.addEventListener('focus', () => {
			if (this.isOnline) {
				this.syncCriticalData()
			}
		})
	}

	/**
	 * Start background sync for specific data types
	 */
	startSync(category: keyof typeof SYNC_CONFIG) {
		const config = SYNC_CONFIG[category]
		
		Object.entries(config).forEach(([dataType, priority]) => {
			const key = `${category}.${dataType}`
			
			// Clear existing interval if any
			const existingInterval = this.intervals.get(key)
			if (existingInterval) {
				clearInterval(existingInterval)
			}

			// Set up new interval
			const interval = setInterval(() => {
				if (this.shouldSync()) {
					this.syncDataType(category, dataType as any)
				}
			}, priority.interval)

			this.intervals.set(key, interval)
		})
	}

	/**
	 * Stop background sync for specific data types
	 */
	stopSync(category: keyof typeof SYNC_CONFIG) {
		const config = SYNC_CONFIG[category]
		
		Object.keys(config).forEach(dataType => {
			const key = `${category}.${dataType}`
			const interval = this.intervals.get(key)
			
			if (interval) {
				clearInterval(interval)
				this.intervals.delete(key)
			}
		})
	}

	/**
	 * Start all background sync
	 */
	startAllSync() {
		Object.keys(SYNC_CONFIG).forEach(category => {
			this.startSync(category as keyof typeof SYNC_CONFIG)
		})
	}

	/**
	 * Stop all background sync
	 */
	stopAllSync() {
		this.intervals.forEach(interval => clearInterval(interval))
		this.intervals.clear()
	}

	/**
	 * Pause sync (when page is hidden or offline)
	 */
	private pauseSync() {
		// Don't clear intervals, just stop syncing
		console.log('Background sync paused')
	}

	/**
	 * Resume sync (when page becomes visible or online)
	 */
	private resumeSync() {
		if (this.isOnline && this.isVisible) {
			// Immediately sync critical data
			this.syncCriticalData()
			console.log('Background sync resumed')
		}
	}

	/**
	 * Check if we should sync based on current conditions
	 */
	private shouldSync(): boolean {
		return this.isOnline && this.isVisible
	}

	/**
	 * Sync critical data immediately
	 */
	private async syncCriticalData() {
		const criticalQueries = [
			queryKeys.notifications.list(),
			queryKeys.auth.status(),
			queryKeys.subscriptions.current(),
		]

		const promises = criticalQueries.map(queryKey =>
			this.queryClient.refetchQueries({ 
				queryKey,
				stale: true // Only refetch if stale
			})
		)

		await Promise.allSettled(promises)
	}

	/**
	 * Sync specific data type
	 */
	private async syncDataType(category: string, dataType: string) {
		try {
			switch (category) {
				case 'realtime':
					await this.syncRealtimeData(dataType)
					break
				case 'business':
					await this.syncBusinessData(dataType)
					break
				case 'reference':
					await this.syncReferenceData(dataType)
					break
			}
		} catch (error) {
			console.warn(`Background sync failed for ${category}.${dataType}:`, error)
		}
	}

	/**
	 * Sync realtime data
	 */
	private async syncRealtimeData(dataType: string) {
		switch (dataType) {
			case 'notifications':
				await this.queryClient.refetchQueries({
					queryKey: queryKeys.notifications.list(),
					stale: true
				})
				break
			case 'maintenance':
				await this.queryClient.refetchQueries({
					queryKey: ['maintenance'],
					stale: true
				})
				break
			case 'payments':
				await this.queryClient.refetchQueries({
					queryKey: ['payments'],
					stale: true
				})
				break
		}
	}

	/**
	 * Sync business data
	 */
	private async syncBusinessData(dataType: string) {
		switch (dataType) {
			case 'properties':
				await this.queryClient.refetchQueries({
					queryKey: queryKeys.properties.lists(),
					stale: true
				})
				break
			case 'tenants':
				await this.queryClient.refetchQueries({
					queryKey: queryKeys.tenants.lists(),
					stale: true
				})
				break
			case 'subscriptions':
				await this.queryClient.refetchQueries({
					queryKey: queryKeys.subscriptions.current(),
					stale: true
				})
				break
		}
	}

	/**
	 * Sync reference data
	 */
	private async syncReferenceData(dataType: string) {
		switch (dataType) {
			case 'auth':
				await this.queryClient.refetchQueries({
					queryKey: queryKeys.auth.status(),
					stale: true
				})
				break
			case 'settings':
				await this.queryClient.refetchQueries({
					queryKey: queryKeys.settings.user(),
					stale: true
				})
				break
			case 'blog':
				// Blog data rarely needs background sync
				break
		}
	}

	/**
	 * Cleanup method
	 */
	cleanup() {
		this.stopAllSync()
		document.removeEventListener('visibilitychange', () => {})
		window.removeEventListener('online', () => {})
		window.removeEventListener('offline', () => {})
		window.removeEventListener('focus', () => {})
	}
}

/**
 * Smart background sync hook
 */
import React, { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useBackgroundSync(enabled = true) {
	const queryClient = useQueryClient()
	const syncManagerRef = useRef<BackgroundSyncManager>()

	useEffect(() => {
		if (!enabled) return

		// Initialize sync manager
		syncManagerRef.current = BackgroundSyncManager.getInstance(queryClient)
		
		// Start syncing based on current user context
		syncManagerRef.current.startAllSync()

		// Cleanup on unmount
		return () => {
			syncManagerRef.current?.cleanup()
		}
	}, [enabled, queryClient])

	return {
		startSync: (category: keyof typeof SYNC_CONFIG) => 
			syncManagerRef.current?.startSync(category),
		stopSync: (category: keyof typeof SYNC_CONFIG) => 
			syncManagerRef.current?.stopSync(category),
		startAllSync: () => syncManagerRef.current?.startAllSync(),
		stopAllSync: () => syncManagerRef.current?.stopAllSync(),
	}
}

/**
 * Selective background sync based on user activity
 */
export function useAdaptiveSync() {
	const queryClient = useQueryClient()
	const lastActivityRef = useRef(Date.now())
	const syncManagerRef = useRef<BackgroundSyncManager>()

	useEffect(() => {
		syncManagerRef.current = BackgroundSyncManager.getInstance(queryClient)

		// Track user activity
		const trackActivity = () => {
			lastActivityRef.current = Date.now()
		}

		const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
		events.forEach(event => {
			document.addEventListener(event, trackActivity, { passive: true })
		})

		// Adaptive sync based on activity
		const adaptiveInterval = setInterval(() => {
			const timeSinceActivity = Date.now() - lastActivityRef.current
			const isActiveUser = timeSinceActivity < 5 * 60 * 1000 // 5 minutes

			if (isActiveUser) {
				// User is active - sync normally
				syncManagerRef.current?.startAllSync()
			} else {
				// User is idle - only sync critical data
				syncManagerRef.current?.stopAllSync()
				syncManagerRef.current?.startSync('realtime')
			}
		}, 60 * 1000) // Check every minute

		return () => {
			events.forEach(event => {
				document.removeEventListener(event, trackActivity)
			})
			clearInterval(adaptiveInterval)
			syncManagerRef.current?.cleanup()
		}
	}, [queryClient])

	return {
		isActive: () => Date.now() - lastActivityRef.current < 5 * 60 * 1000,
		lastActivity: () => lastActivityRef.current,
	}
}

/**
 * Connection quality aware sync
 */
export function useConnectionAwareSync() {
	const queryClient = useQueryClient()
	const connectionRef = useRef<'slow' | 'fast' | 'unknown'>('unknown')

	useEffect(() => {
		// Detect connection quality
		const detectConnection = () => {
			const connection = (navigator as any).connection
			if (connection) {
				const { effectiveType, downlink } = connection
				
				if (effectiveType === '4g' && downlink > 1.5) {
					connectionRef.current = 'fast'
				} else if (effectiveType === '3g' || downlink < 0.5) {
					connectionRef.current = 'slow'
				} else {
					connectionRef.current = 'fast'
				}
			}
		}

		detectConnection()

		// Listen for connection changes
		const connection = (navigator as any).connection
		if (connection) {
			connection.addEventListener('change', detectConnection)
		}

		// Adjust sync frequency based on connection
		const syncManager = BackgroundSyncManager.getInstance(queryClient)
		
		if (connectionRef.current === 'slow') {
			// Reduce sync frequency for slow connections
			syncManager.stopSync('business')
			syncManager.stopSync('reference')
			syncManager.startSync('realtime') // Only critical data
		} else {
			// Normal sync for fast connections
			syncManager.startAllSync()
		}

		return () => {
			if (connection) {
				connection.removeEventListener('change', detectConnection)
			}
		}
	}, [queryClient])

	return {
		connectionQuality: connectionRef.current,
		isFastConnection: () => connectionRef.current === 'fast',
		isSlowConnection: () => connectionRef.current === 'slow',
	}
}