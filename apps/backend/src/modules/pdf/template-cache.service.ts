/**
 * Template Cache Service
 *
 * Caches PDF template metadata and contents for performance.
 * Implements TTL-based cache invalidation and memory management.
 *
 * Optimizations:
 * - Lazy loading: Templates loaded on-demand, not all at startup
 * - Cache prewarming: Texas template preloaded on startup (most common)
 * - Monitoring: Tracks cache hit rates and load times
 */

import { Injectable, OnModuleInit } from '@nestjs/common'
import * as fs from 'fs/promises'
import * as path from 'path'
import { PDFDocument } from 'pdf-lib'
import {
	DEFAULT_STATE_NAME,
	DEFAULT_TEMPLATE_TYPE,
	SUPPORTED_STATES,
	TEMPLATE_TYPES,
	TemplateType,
	SupportedStateCode
} from './state-constants'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
	/**
	 * Cached data
	 */
	data: T

	/**
	 * Timestamp when cached (milliseconds since epoch)
	 */
	cachedAt: number

	/**
	 * Time-to-live in milliseconds
	 */
	ttl: number
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
	/**
	 * Whether template file exists
	 */
	exists: boolean

	/**
	 * File size in bytes
	 */
	size?: number

	/**
	 * PDF form field names (if template exists)
	 */
	fields?: string[]

	/**
	 * Full file path
	 */
	path: string

	/**
	 * State code
	 */
	stateCode: SupportedStateCode

	/**
	 * Template type
	 */
	templateType: TemplateType
}

/**
 * Cache configuration
 */
interface CacheConfig {
	/**
	 * Default TTL for metadata cache (5 minutes)
	 */
	metadataTtl: number

	/**
	 * Default TTL for template content cache (10 minutes)
	 */
	contentTtl: number

	/**
	 * Maximum cache entries
	 */
	maxEntries: number

	/**
	 * Cleanup interval (1 minute)
	 */
	cleanupInterval: number
}

@Injectable()
export class TemplateCacheService implements OnModuleInit {
	private readonly metadataCache = new Map<string, CacheEntry<TemplateMetadata>>()
	private readonly contentCache = new Map<string, CacheEntry<Uint8Array>>()
	private readonly config: CacheConfig = {
		metadataTtl: 5 * 60 * 1000, // 5 minutes
		contentTtl: 10 * 60 * 1000, // 10 minutes
		maxEntries: 100,
		cleanupInterval: 60 * 1000 // 1 minute
	}

	private cleanupTimer?: NodeJS.Timeout

	// Monitoring metrics (for getCacheStats() - available for debugging/monitoring)
	private _metrics = {
		metadataHits: 0,
		metadataMisses: 0,
		contentHits: 0,
		contentMisses: 0,
		loadTimes: [] as number[], // Last 100 load times in ms
		maxLoadTimeHistory: 100
	}

	constructor(private readonly logger: AppLogger) {
		// Start periodic cleanup
		this.startCleanup()
	}

	/**
	 * Cache prewarming on module initialization
	 * Preloads Texas template (most common) on startup
	 */
	async onModuleInit(): Promise<void> {
		this.logger.log('Prewarming template cache with Texas template...')
		const startTime = Date.now()

		try {
			// Prewarm Texas (TX) template - most commonly used
			await this.getTemplateContent('TX' as SupportedStateCode, DEFAULT_TEMPLATE_TYPE)

			const loadTime = Date.now() - startTime
			this.logger.log('Template cache prewarmed successfully', {
				state: 'TX',
				loadTimeMs: loadTime
			})
		} catch (error) {
			this.logger.warn('Failed to prewarm template cache', {
				error: error instanceof Error ? error.message : String(error)
			})
		}

		// Register process signal handlers for graceful cleanup
		process.on('SIGTERM', () => {
			this.logger.log('SIGTERM received, cleaning up template cache...')
			this.onModuleDestroy()
		})

		process.on('SIGINT', () => {
			this.logger.log('SIGINT received, cleaning up template cache...')
			this.onModuleDestroy()
		})
	}

	/**
	 * Get template metadata with caching
	 */
	async getTemplateMetadata(
		stateCode: SupportedStateCode,
		templateType: TemplateType = DEFAULT_TEMPLATE_TYPE
	): Promise<TemplateMetadata> {
		const cacheKey = this.getMetadataCacheKey(stateCode, templateType)
		const cached = this.metadataCache.get(cacheKey)

		// Return cached if valid
		if (cached && !this.isExpired(cached)) {
			this._metrics.metadataHits++
			this.logger.debug('Template metadata cache hit', {
				stateCode,
				templateType,
				cachedAt: new Date(cached.cachedAt).toISOString()
			})
			return cached.data
		}

		// Cache miss - load from filesystem
		this._metrics.metadataMisses++
		const startTime = Date.now()
		const metadata = await this.loadTemplateMetadata(stateCode, templateType)
		const loadTime = Date.now() - startTime

		// Track load time
		this.trackLoadTime(loadTime)

		// Cache result
		this.metadataCache.set(cacheKey, {
			data: metadata,
			cachedAt: Date.now(),
			ttl: this.config.metadataTtl
		})

		this.logger.debug('Template metadata loaded and cached', {
			stateCode,
			templateType,
			exists: metadata.exists,
			size: metadata.size,
			fieldsCount: metadata.fields?.length || 0,
			loadTimeMs: loadTime
		})

		return metadata
	}

	/**
	 * Get template content (PDF bytes) with caching
	 * Implements lazy loading - templates only loaded when needed
	 */
	async getTemplateContent(
		stateCode: SupportedStateCode,
		templateType: TemplateType = DEFAULT_TEMPLATE_TYPE
	): Promise<Uint8Array | null> {
		const cacheKey = this.getContentCacheKey(stateCode, templateType)
		const cached = this.contentCache.get(cacheKey)

		// Return cached if valid
		if (cached && !this.isExpired(cached)) {
			this._metrics.contentHits++
			this.logger.debug('Template content cache hit', {
				stateCode,
				templateType,
				cachedAt: new Date(cached.cachedAt).toISOString(),
				size: cached.data.length
			})
			return cached.data
		}

		// Cache miss - load from filesystem
		this._metrics.contentMisses++
		const startTime = Date.now()

		// Check if template exists first
		const metadata = await this.getTemplateMetadata(stateCode, templateType)
		if (!metadata.exists) {
			this.logger.warn('Template file not found', {
				stateCode,
				templateType,
				path: metadata.path
			})
			return null
		}

		// Load content from filesystem
		try {
			const content = await fs.readFile(metadata.path)
			const uint8Array = new Uint8Array(content)
			const loadTime = Date.now() - startTime

			// Track load time
			this.trackLoadTime(loadTime)

			// Cache the result
			this.contentCache.set(cacheKey, {
				data: uint8Array,
				cachedAt: Date.now(),
				ttl: this.config.contentTtl
			})

			this.logger.debug('Template content loaded and cached', {
				stateCode,
				templateType,
				size: uint8Array.length,
				loadTimeMs: loadTime
			})

			return uint8Array
		} catch (error) {
			this.logger.error('Failed to load template content', {
				stateCode,
				templateType,
				path: metadata.path,
				error: error instanceof Error ? error.message : String(error)
			})
			return null
		}
	}

	/**
	 * Invalidate cache for specific template
	 */
	invalidateTemplate(
		stateCode: SupportedStateCode,
		templateType: TemplateType = DEFAULT_TEMPLATE_TYPE
	): void {
		const metadataKey = this.getMetadataCacheKey(stateCode, templateType)
		const contentKey = this.getContentCacheKey(stateCode, templateType)

		this.metadataCache.delete(metadataKey)
		this.contentCache.delete(contentKey)

		this.logger.debug('Template cache invalidated', {
			stateCode,
			templateType
		})
	}

	/**
	 * Clear all caches
	 */
	clearCache(): void {
		const metadataCount = this.metadataCache.size
		const contentCount = this.contentCache.size

		this.metadataCache.clear()
		this.contentCache.clear()

		this.logger.log('Template cache cleared', {
			metadataEntries: metadataCount,
			contentEntries: contentCount
		})
	}

	/**
	 * Get cache statistics with monitoring metrics
	 */
	getCacheStats(): {
		metadataEntries: number
		contentEntries: number
		memoryUsage: {
			metadata: number
			content: number
			total: number
		}
		hitRates: {
			metadata: {
				hits: number
				misses: number
				hitRate: string
			}
			content: {
				hits: number
				misses: number
				hitRate: string
			}
			overall: {
				hits: number
				misses: number
				hitRate: string
			}
		}
		loadTimes: {
			count: number
			averageMs: number
			minMs: number
			maxMs: number
			p50Ms: number
			p95Ms: number
			p99Ms: number
		}
	} {
		const metadataEntries = this.metadataCache.size
		const contentEntries = this.contentCache.size

		// Estimate memory usage (rough calculation)
		let metadataMemory = 0
		for (const entry of this.metadataCache.values()) {
			metadataMemory += JSON.stringify(entry.data).length * 2 // Rough estimate
		}

		let contentMemory = 0
		for (const entry of this.contentCache.values()) {
			contentMemory += entry.data.length
		}

		// Calculate hit rates
		const calculateHitRate = (hits: number, misses: number): string => {
			const total = hits + misses
			if (total === 0) return '0.00%'
			return `${((hits / total) * 100).toFixed(2)}%`
		}

		const overallHits = this._metrics.metadataHits + this._metrics.contentHits
		const overallMisses = this._metrics.metadataMisses + this._metrics.contentMisses

		// Calculate load time percentiles
		const sortedLoadTimes = [...this._metrics.loadTimes].sort((a, b) => a - b)
		const getPercentile = (p: number): number => {
			if (sortedLoadTimes.length === 0) return 0
			const index = Math.ceil((p / 100) * sortedLoadTimes.length) - 1
			return sortedLoadTimes[Math.max(0, index)]!
		}

		const avgLoadTime = sortedLoadTimes.length > 0
			? sortedLoadTimes.reduce((sum, t) => sum + t, 0) / sortedLoadTimes.length
			: 0

		return {
			metadataEntries,
			contentEntries,
			memoryUsage: {
				metadata: metadataMemory,
				content: contentMemory,
				total: metadataMemory + contentMemory
			},
			hitRates: {
				metadata: {
					hits: this._metrics.metadataHits,
					misses: this._metrics.metadataMisses,
					hitRate: calculateHitRate(this._metrics.metadataHits, this._metrics.metadataMisses)
				},
				content: {
					hits: this._metrics.contentHits,
					misses: this._metrics.contentMisses,
					hitRate: calculateHitRate(this._metrics.contentHits, this._metrics.contentMisses)
				},
				overall: {
					hits: overallHits,
					misses: overallMisses,
					hitRate: calculateHitRate(overallHits, overallMisses)
				}
			},
			loadTimes: {
				count: sortedLoadTimes.length,
				averageMs: Number(avgLoadTime.toFixed(2)),
				minMs: sortedLoadTimes.length > 0 ? sortedLoadTimes[0]! : 0,
				maxMs: sortedLoadTimes.length > 0 ? sortedLoadTimes[sortedLoadTimes.length - 1]! : 0,
				p50Ms: getPercentile(50),
				p95Ms: getPercentile(95),
				p99Ms: getPercentile(99)
			}
		}
	}

	/**
	 * Load template metadata from filesystem
	 */
	private async loadTemplateMetadata(
		stateCode: SupportedStateCode,
		templateType: TemplateType
	): Promise<TemplateMetadata> {
		const stateName = SUPPORTED_STATES[stateCode] || DEFAULT_STATE_NAME
		const templateTypeValue = TEMPLATE_TYPES[templateType]
		const fileName = `${stateName}_${templateTypeValue}_Lease_Agreement.pdf`

		// Expected base directories for security validation
		const expectedBases = [
			path.resolve(__dirname, '..', '..', '..', 'assets'),
			path.resolve(process.cwd(), 'apps', 'backend', 'assets'),
			path.resolve(process.cwd(), 'assets'),
		]

		// Try multiple possible paths to handle different execution contexts
		const possiblePaths = [
			// From compiled dist/modules/pdf/ or src/modules/pdf/
			path.resolve(__dirname, '..', '..', '..', 'assets', fileName),
			// From repo root (CI context)
			path.resolve(process.cwd(), 'apps', 'backend', 'assets', fileName),
			// From backend root (local execution)
			path.resolve(process.cwd(), 'assets', fileName),
		]

		// Try each path until we find one that exists
		for (const templatePath of possiblePaths) {
			try {
				// Path traversal protection: ensure normalized path starts with expected base
				const normalizedPath = path.normalize(templatePath)
				const isPathSafe = expectedBases.some(base =>
					normalizedPath.startsWith(path.normalize(base))
				)

				if (!isPathSafe) {
					this.logger.warn('Path traversal attempt detected', {
						attemptedPath: templatePath,
						normalizedPath,
						expectedBases
					})
					continue
				}

				const stats = await fs.stat(templatePath)

				// Log which path was successfully used
				this.logger.log('Template found', {
					stateCode,
					templateType,
					path: templatePath,
					size: stats.size
				})

				// Load PDF to extract field names
				let fields: string[] = []
				try {
					const templateBytes = await fs.readFile(templatePath)
					const pdfDoc = await PDFDocument.load(templateBytes)
					const form = pdfDoc.getForm()
					fields = form.getFields().map(f => f.getName())
				} catch (pdfError) {
					this.logger.warn('Failed to extract PDF fields', {
						stateCode,
						templateType,
						path: templatePath,
						error: pdfError instanceof Error ? pdfError.message : String(pdfError)
					})
				}

				return {
					exists: true,
					size: stats.size,
					fields,
					path: templatePath,
					stateCode,
					templateType
				}
			} catch {
				// Try next path
				continue
			}
		}
		
		// None of the paths worked
		return {
			exists: false,
			path: possiblePaths[0]!, // Return first attempted path for error messages
			stateCode,
			templateType
		}
	}

	/**
	 * Generate metadata cache key
	 */
	private getMetadataCacheKey(
		stateCode: SupportedStateCode,
		templateType: TemplateType
	): string {
		return `metadata:${stateCode}:${templateType}`
	}

	/**
	 * Generate content cache key
	 */
	private getContentCacheKey(
		stateCode: SupportedStateCode,
		templateType: TemplateType
	): string {
		return `content:${stateCode}:${templateType}`
	}

	/**
	 * Check if cache entry is expired
	 */
	private isExpired(entry: CacheEntry<unknown>): boolean {
		return Date.now() - entry.cachedAt > entry.ttl
	}

	/**
	 * Track template load time for monitoring
	 * Keeps last 100 load times for percentile calculations
	 */
	private trackLoadTime(loadTimeMs: number): void {
		this._metrics.loadTimes.push(loadTimeMs)

		// Keep only last 100 load times to prevent unbounded growth
		if (this._metrics.loadTimes.length > this._metrics.maxLoadTimeHistory) {
			this._metrics.loadTimes.shift()
		}
	}

	/**
	 * Start periodic cleanup
	 */
	private startCleanup(): void {
		try {
			this.cleanupTimer = setInterval(() => {
				try {
					this.cleanup()
				} catch (error) {
					this.logger.error('Cache cleanup failed', {
						error: error instanceof Error ? error.message : String(error)
					})
				}
			}, this.config.cleanupInterval)
			
			// Allow process to exit even if timer is running
			if (this.cleanupTimer.unref) {
				this.cleanupTimer.unref()
			}
		} catch (error) {
			this.logger.error('Failed to start cache cleanup timer', {
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	/**
	 * Cleanup expired entries
	 */
	private cleanup(): void {
		const now = Date.now()
		let cleanedMetadata = 0
		let cleanedContent = 0

		// Clean metadata cache
		for (const [key, entry] of this.metadataCache.entries()) {
			if (now - entry.cachedAt > entry.ttl) {
				this.metadataCache.delete(key)
				cleanedMetadata++
			}
		}

		// Clean content cache
		for (const [key, entry] of this.contentCache.entries()) {
			if (now - entry.cachedAt > entry.ttl) {
				this.contentCache.delete(key)
				cleanedContent++
			}
		}

		if (cleanedMetadata > 0 || cleanedContent > 0) {
			this.logger.debug('Template cache cleanup completed', {
				cleanedMetadata,
				cleanedContent,
				totalMetadata: this.metadataCache.size,
				totalContent: this.contentCache.size
			})
		}
	}

	/**
	 * Cleanup on service destruction
	 */
	onModuleDestroy(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer)
		}
		this.clearCache()
	}
}
