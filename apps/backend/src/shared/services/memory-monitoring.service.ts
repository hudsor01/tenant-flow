import { Injectable, Logger } from '@nestjs/common'
import type { FastifyInstance } from 'fastify'

/**
 * Memory Usage Snapshot
 */
export interface MemoryUsage {
	timestamp: number
	heapUsed: number
	heapTotal: number
	rss: number
	external: number
	arrayBuffers: number
}

/**
 * Memory Statistics
 */
export interface MemoryStatistics {
	current: MemoryUsage
	trend: {
		direction: 'increasing' | 'stable' | 'decreasing'
		rate: number // MB per minute
		confidence: number // 0-1
	}
	thresholds: {
		heapWarning: number
		heapCritical: number
		rssWarning: number
		rssCritical: number
	}
	health: {
		status: 'healthy' | 'warning' | 'critical'
		issues: string[]
		gcRecommendation?: string
	}
	gc: {
		lastForced: number | null
		recommendForce: boolean
		frequency: number // GCs per minute estimate
	}
}

/**
 * Enhanced Memory Monitoring Service
 * 
 * Provides intelligent memory monitoring that works alongside
 * @fastify/under-pressure to provide early warnings and
 * proactive memory management.
 * 
 * Features:
 * - Memory trend analysis
 * - Intelligent GC recommendations
 * - Memory leak detection
 * - Integration with under-pressure alerts
 * - Configurable thresholds based on Railway limits
 */
@Injectable()
export class MemoryMonitoringService {
	private readonly logger = new Logger(MemoryMonitoringService.name)
	
	// Memory snapshots for trend analysis
	private readonly memoryHistory: MemoryUsage[] = []
	private readonly maxHistorySize = 360 // 30 minutes at 5-second intervals
	
	// Memory thresholds optimized for Railway (1GB default)
	private readonly thresholds = {
		heapWarning: 700 * 1024 * 1024, // 700MB
		heapCritical: 900 * 1024 * 1024, // 900MB
		rssWarning: 1100 * 1024 * 1024, // 1.1GB
		rssCritical: 1300 * 1024 * 1024 // 1.3GB (Railway limit ~1.25GB)
	}
	
	// GC tracking
	private lastForcedGC: number | null = null
	private gcEvents = 0
	private gcTrackingStart = Date.now()
	
	// Monitoring state
	private monitoringInterval: NodeJS.Timeout | null = null
	private readonly monitoringIntervalMs = 5000 // 5 seconds

	/**
	 * Start memory monitoring
	 * Should be called from main.ts after application startup
	 */
	startMonitoring(): void {
		if (this.monitoringInterval) {
			this.logger.warn('Memory monitoring already started')
			return
		}

		// Take initial snapshot
		this.takeMemorySnapshot()
		
		// Start periodic monitoring
		this.monitoringInterval = setInterval(() => {
			this.takeMemorySnapshot()
			this.analyzeMemoryHealth()
		}, this.monitoringIntervalMs)
		
		// Listen for GC events if available
		this.setupGCTracking()
		
		this.logger.log('Memory monitoring started', {
			intervalMs: this.monitoringIntervalMs,
			historySize: this.maxHistorySize,
			thresholds: {
				heapWarningMB: Math.round(this.thresholds.heapWarning / 1024 / 1024),
				heapCriticalMB: Math.round(this.thresholds.heapCritical / 1024 / 1024),
				rssWarningMB: Math.round(this.thresholds.rssWarning / 1024 / 1024),
				rssCriticalMB: Math.round(this.thresholds.rssCritical / 1024 / 1024)
			}
		})
	}

	/**
	 * Stop memory monitoring
	 */
	stopMonitoring(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval)
			this.monitoringInterval = null
			this.logger.log('Memory monitoring stopped')
		}
	}

	/**
	 * Take a memory usage snapshot
	 */
	private takeMemorySnapshot(): void {
		const usage = process.memoryUsage()
		
		const snapshot: MemoryUsage = {
			timestamp: Date.now(),
			heapUsed: usage.heapUsed,
			heapTotal: usage.heapTotal,
			rss: usage.rss,
			external: usage.external,
			arrayBuffers: usage.arrayBuffers || 0
		}
		
		// Add to history with circular buffer
		this.memoryHistory.push(snapshot)
		if (this.memoryHistory.length > this.maxHistorySize) {
			this.memoryHistory.shift()
		}
	}

	/**
	 * Analyze memory health and generate alerts
	 */
	private analyzeMemoryHealth(): void {
		const stats = this.getMemoryStatistics()
		
		// Log critical issues
		if (stats.health.status === 'critical') {
			this.logger.error('Critical memory condition detected', {
				heapUsedMB: Math.round(stats.current.heapUsed / 1024 / 1024),
				rssMB: Math.round(stats.current.rss / 1024 / 1024),
				issues: stats.health.issues,
				gcRecommendation: stats.health.gcRecommendation
			})
		} else if (stats.health.status === 'warning') {
			this.logger.warn('Memory warning condition detected', {
				heapUsedMB: Math.round(stats.current.heapUsed / 1024 / 1024),
				rssMB: Math.round(stats.current.rss / 1024 / 1024),
				issues: stats.health.issues,
				trend: stats.trend.direction,
				trendRate: stats.trend.rate
			})
		}
		
		// Force GC if recommended and conditions are met
		if (stats.gc.recommendForce && this.shouldForceGC(stats)) {
			this.forceGarbageCollection()
		}
	}

	/**
	 * Get comprehensive memory statistics
	 */
	getMemoryStatistics(): MemoryStatistics {
		const current = this.getCurrentMemoryUsage()
		const trend = this.calculateMemoryTrend()
		const health = this.assessMemoryHealth(current, trend)
		const gc = this.getGCStatistics()
		
		return {
			current,
			trend,
			thresholds: {
				heapWarning: this.thresholds.heapWarning,
				heapCritical: this.thresholds.heapCritical,
				rssWarning: this.thresholds.rssWarning,
				rssCritical: this.thresholds.rssCritical
			},
			health,
			gc
		}
	}

	/**
	 * Get current memory usage
	 */
	private getCurrentMemoryUsage(): MemoryUsage {
		const usage = process.memoryUsage()
		
		return {
			timestamp: Date.now(),
			heapUsed: usage.heapUsed,
			heapTotal: usage.heapTotal,
			rss: usage.rss,
			external: usage.external,
			arrayBuffers: usage.arrayBuffers || 0
		}
	}

	/**
	 * Calculate memory trend from historical data
	 */
	private calculateMemoryTrend(): MemoryStatistics['trend'] {
		if (this.memoryHistory.length < 10) {
			return {
				direction: 'stable',
				rate: 0,
				confidence: 0
			}
		}
		
		// Use last 20 data points for trend analysis (100 seconds)
		const recentHistory = this.memoryHistory.slice(-20)
		const oldestPoint = recentHistory[0]
		const newestPoint = recentHistory[recentHistory.length - 1]
		
		const timeDiffMinutes = (newestPoint.timestamp - oldestPoint.timestamp) / 1000 / 60
		const heapDiffMB = (newestPoint.heapUsed - oldestPoint.heapUsed) / 1024 / 1024
		const rate = heapDiffMB / timeDiffMinutes // MB per minute
		
		// Calculate trend direction with threshold
		const threshold = 5 // MB per minute threshold for trend detection
		let direction: 'increasing' | 'stable' | 'decreasing'
		if (rate > threshold) {
			direction = 'increasing'
		} else if (rate < -threshold) {
			direction = 'decreasing'
		} else {
			direction = 'stable'
		}
		
		// Calculate confidence based on data consistency
		const confidence = Math.min(recentHistory.length / 20, 1)
		
		return {
			direction,
			rate: Math.round(rate * 100) / 100,
			confidence
		}
	}

	/**
	 * Assess memory health status
	 */
	private assessMemoryHealth(
		current: MemoryUsage, 
		trend: MemoryStatistics['trend']
	): MemoryStatistics['health'] {
		const issues: string[] = []
		let status: 'healthy' | 'warning' | 'critical' = 'healthy'
		let gcRecommendation: string | undefined
		
		// Check heap usage
		if (current.heapUsed > this.thresholds.heapCritical) {
			status = 'critical'
			issues.push('Heap usage critical')
			gcRecommendation = 'Immediate garbage collection recommended'
		} else if (current.heapUsed > this.thresholds.heapWarning) {
			status = status === 'critical' ? 'critical' : 'warning'
			issues.push('Heap usage high')
		}
		
		// Check RSS usage
		if (current.rss > this.thresholds.rssCritical) {
			status = 'critical'
			issues.push('RSS memory critical (approaching Railway limit)')
		} else if (current.rss > this.thresholds.rssWarning) {
			status = status === 'critical' ? 'critical' : 'warning'
			issues.push('RSS memory high')
		}
		
		// Check heap fragmentation
		const fragmentationRatio = (current.heapTotal - current.heapUsed) / current.heapTotal
		if (fragmentationRatio > 0.7) {
			issues.push('High heap fragmentation')
			gcRecommendation = gcRecommendation || 'Garbage collection may help reduce fragmentation'
		}
		
		// Check trend
		if (trend.direction === 'increasing' && trend.rate > 20 && trend.confidence > 0.7) {
			status = status === 'critical' ? 'critical' : 'warning'
			issues.push(`Memory increasing rapidly: ${trend.rate} MB/min`)
			gcRecommendation = gcRecommendation || 'Monitor for potential memory leak'
		}
		
		// Check external memory
		if (current.external > 100 * 1024 * 1024) { // 100MB
			issues.push('High external memory usage')
		}
		
		return {
			status,
			issues,
			gcRecommendation
		}
	}

	/**
	 * Get garbage collection statistics
	 */
	private getGCStatistics(): MemoryStatistics['gc'] {
		const uptime = (Date.now() - this.gcTrackingStart) / 1000 / 60 // minutes
		const frequency = uptime > 0 ? this.gcEvents / uptime : 0
		
		const current = this.getCurrentMemoryUsage()
		const recommendForce = current.heapUsed > this.thresholds.heapWarning && 
							   (!this.lastForcedGC || Date.now() - this.lastForcedGC > 300000) // 5 minutes
		
		return {
			lastForced: this.lastForcedGC,
			recommendForce,
			frequency: Math.round(frequency * 100) / 100
		}
	}

	/**
	 * Determine if GC should be forced
	 */
	private shouldForceGC(stats: MemoryStatistics): boolean {
		// Don't force GC too frequently
		if (this.lastForcedGC && Date.now() - this.lastForcedGC < 60000) { // 1 minute
			return false
		}
		
		// Force GC conditions
		const highMemory = stats.current.heapUsed > this.thresholds.heapWarning
		const criticalMemory = stats.current.heapUsed > this.thresholds.heapCritical
		const rapidIncrease = stats.trend.direction === 'increasing' && stats.trend.rate > 50
		
		return criticalMemory || (highMemory && rapidIncrease)
	}

	/**
	 * Force garbage collection
	 */
	forceGarbageCollection(): void {
		try {
			const beforeHeap = process.memoryUsage().heapUsed
			
			if (global.gc) {
				global.gc()
				this.lastForcedGC = Date.now()
				
				const afterHeap = process.memoryUsage().heapUsed
				const freedMB = Math.round((beforeHeap - afterHeap) / 1024 / 1024)
				
				this.logger.log('Garbage collection forced', {
					freedMB,
					beforeMB: Math.round(beforeHeap / 1024 / 1024),
					afterMB: Math.round(afterHeap / 1024 / 1024)
				})
			} else {
				this.logger.warn('Garbage collection not available (--expose-gc flag required)')
			}
		} catch (error) {
			this.logger.error('Failed to force garbage collection', { error })
		}
	}

	/**
	 * Setup GC event tracking if available
	 */
	private setupGCTracking(): void {
		try {
			// Track GC events if performance observer is available
			if (typeof PerformanceObserver !== 'undefined') {
				const obs = new PerformanceObserver((list) => {
					const entries = list.getEntries()
					this.gcEvents += entries.length
				})
				obs.observe({ entryTypes: ['gc'] })
				
				this.logger.log('GC event tracking enabled')
			}
		} catch (error) {
			this.logger.debug('GC event tracking not available', { error })
		}
	}

	/**
	 * Get memory history for trend analysis
	 */
	getMemoryHistory(durationMinutes = 30): MemoryUsage[] {
		const cutoff = Date.now() - (durationMinutes * 60 * 1000)
		return this.memoryHistory.filter(snapshot => snapshot.timestamp >= cutoff)
	}

	/**
	 * Get memory usage summary for quick checks
	 */
	getMemorySummary(): {
		heapUsedMB: number
		rssMB: number
		utilizationPercent: number
		status: 'healthy' | 'warning' | 'critical'
		trend: string
	} {
		const stats = this.getMemoryStatistics()
		const utilizationPercent = Math.round((stats.current.heapUsed / stats.current.heapTotal) * 100)
		
		return {
			heapUsedMB: Math.round(stats.current.heapUsed / 1024 / 1024),
			rssMB: Math.round(stats.current.rss / 1024 / 1024),
			utilizationPercent,
			status: stats.health.status,
			trend: `${stats.trend.direction} at ${stats.trend.rate} MB/min`
		}
	}

	/**
	 * Register memory pressure integration hooks
	 * Call this to integrate with @fastify/under-pressure monitoring
	 */
	registerMemoryPressureIntegration(fastify: FastifyInstance): void {
		// Add custom health check that includes our memory analysis
		fastify.addHook('onReady', async () => {
			this.startMonitoring()
		})
		
		// Add graceful shutdown
		fastify.addHook('onClose', async () => {
			this.stopMonitoring()
		})
		
		this.logger.log('Memory pressure integration hooks registered')
	}

	/**
	 * Clear memory history (useful for testing)
	 */
	clearHistory(): void {
		this.memoryHistory.length = 0
		this.gcEvents = 0
		this.gcTrackingStart = Date.now()
		this.lastForcedGC = null
		this.logger.log('Memory history cleared')
	}
}