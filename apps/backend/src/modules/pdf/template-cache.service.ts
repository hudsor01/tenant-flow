/**
 * Template Cache Service
 *
 * Caches PDF template metadata and contents for performance.
 * Implements TTL-based cache invalidation and memory management.
 */

import { Injectable } from '@nestjs/common'
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
export class TemplateCacheService {
	private readonly metadataCache = new Map<string, CacheEntry<TemplateMetadata>>()
	private readonly contentCache = new Map<string, CacheEntry<Uint8Array>>()
	private readonly config: CacheConfig = {
		metadataTtl: 5 * 60 * 1000, // 5 minutes
		contentTtl: 10 * 60 * 1000, // 10 minutes
		maxEntries: 100,
		cleanupInterval: 60 * 1000 // 1 minute
	}

	private cleanupTimer?: NodeJS.Timeout

	constructor(private readonly logger: AppLogger) {
		// Start periodic cleanup
		this.startCleanup()
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
			this.logger.debug('Template metadata cache hit', {
				stateCode,
				templateType,
				cachedAt: new Date(cached.cachedAt).toISOString()
			})
			return cached.data
		}

		// Load from filesystem
		const metadata = await this.loadTemplateMetadata(stateCode, templateType)

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
			fieldsCount: metadata.fields?.length || 0
		})

		return metadata
	}

	/**
	 * Get template content (PDF bytes) with caching
	 */
	async getTemplateContent(
		stateCode: SupportedStateCode,
		templateType: TemplateType = DEFAULT_TEMPLATE_TYPE
	): Promise<Uint8Array | null> {
		const cacheKey = this.getContentCacheKey(stateCode, templateType)
		const cached = this.contentCache.get(cacheKey)

		// Return cached if valid
		if (cached && !this.isExpired(cached)) {
			this.logger.debug('Template content cache hit', {
				stateCode,
				templateType,
				cachedAt: new Date(cached.cachedAt).toISOString(),
				size: cached.data.length
			})
			return cached.data
		}

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

			// Cache the result
			this.contentCache.set(cacheKey, {
				data: uint8Array,
				cachedAt: Date.now(),
				ttl: this.config.contentTtl
			})

			this.logger.debug('Template content loaded and cached', {
				stateCode,
				templateType,
				size: uint8Array.length
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
	 * Get cache statistics
	 */
	getCacheStats(): {
		metadataEntries: number
		contentEntries: number
		memoryUsage: {
			metadata: number
			content: number
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

		return {
			metadataEntries,
			contentEntries,
			memoryUsage: {
				metadata: metadataMemory,
				content: contentMemory
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
		const templatePath = this.getTemplatePath(stateCode, templateType)

		try {
			const stats = await fs.stat(templatePath)

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
			// File doesn't exist
			return {
				exists: false,
				path: templatePath,
				stateCode,
				templateType
			}
		}
	}

	/**
	 * Get template file path
	 */
	private getTemplatePath(
		stateCode: SupportedStateCode,
		templateType: TemplateType
	): string {
		const stateName = SUPPORTED_STATES[stateCode] || DEFAULT_STATE_NAME
		const templateTypeValue = TEMPLATE_TYPES[templateType]
		const fileName = `${stateName}_${templateTypeValue}_Lease_Agreement.pdf`
		// Use __dirname to get path relative to compiled module location
		// From dist/modules/pdf/ go up 3 levels to backend root, then into assets/
		return path.join(__dirname, '..', '..', '..', 'assets', fileName)
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
