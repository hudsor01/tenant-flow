/**
 * Template Cache Service
 *
 * Simple cache for PDF template files with TTL-based expiration.
 * Implements lazy loading - templates loaded on-demand.
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
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
 * Template metadata
 */
export interface TemplateMetadata {
	exists: boolean
	size?: number
	fields?: string[]
	path: string
	stateCode: SupportedStateCode
	stateName?: string
	templateType: TemplateType
}

interface CachedTemplate {
	metadata: TemplateMetadata
	content: Uint8Array | null
	cachedAt: number
}

/** Cache TTL: 10 minutes */
const CACHE_TTL_MS = 10 * 60 * 1000

/** Cleanup interval: 5 minutes */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

@Injectable()
export class TemplateCacheService implements OnModuleInit, OnModuleDestroy {
	private readonly cache = new Map<string, CachedTemplate>()
	private cleanupTimer?: NodeJS.Timeout

	constructor(private readonly logger: AppLogger) {}

	async onModuleInit(): Promise<void> {
		// Prewarm Texas template (most common)
		try {
			await this.getTemplateContent(
				'TX' as SupportedStateCode,
				DEFAULT_TEMPLATE_TYPE
			)
			this.logger.log('Template cache prewarmed with Texas template')
		} catch (error) {
			this.logger.warn('Failed to prewarm template cache', {
				error: error instanceof Error ? error.message : String(error)
			})
		}

		// Start cleanup timer
		this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS)
		this.cleanupTimer.unref?.()
	}

	onModuleDestroy(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer)
		}
		this.cache.clear()
	}

	/**
	 * Get template metadata
	 */
	async getTemplateMetadata(
		stateCode: SupportedStateCode,
		templateType: TemplateType = DEFAULT_TEMPLATE_TYPE
	): Promise<TemplateMetadata> {
		const cached = await this.getCachedTemplate(stateCode, templateType)
		return cached.metadata
	}

	/**
	 * Get template content (PDF bytes)
	 */
	async getTemplateContent(
		stateCode: SupportedStateCode,
		templateType: TemplateType = DEFAULT_TEMPLATE_TYPE
	): Promise<Uint8Array | null> {
		const cached = await this.getCachedTemplate(stateCode, templateType)
		return cached.content
	}

	/**
	 * Invalidate cache for specific template
	 */
	invalidateTemplate(
		stateCode: SupportedStateCode,
		templateType: TemplateType = DEFAULT_TEMPLATE_TYPE
	): void {
		const key = this.getCacheKey(stateCode, templateType)
		this.cache.delete(key)
		this.logger.debug('Template cache invalidated', { stateCode, templateType })
	}

	/**
	 * Clear all caches
	 */
	clearCache(): void {
		const count = this.cache.size
		this.cache.clear()
		this.logger.log('Template cache cleared', { entries: count })
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { entries: number; states: string[] } {
		const states = [...this.cache.keys()].map(k => k.split(':')[0]!)
		return {
			entries: this.cache.size,
			states: [...new Set(states)]
		}
	}

	private async getCachedTemplate(
		stateCode: SupportedStateCode,
		templateType: TemplateType
	): Promise<CachedTemplate> {
		const key = this.getCacheKey(stateCode, templateType)
		const cached = this.cache.get(key)

		// Return cached if valid
		if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
			return cached
		}

		// Load from filesystem
		const template = await this.loadTemplate(stateCode, templateType)
		this.cache.set(key, template)
		return template
	}

	private async loadTemplate(
		stateCode: SupportedStateCode,
		templateType: TemplateType
	): Promise<CachedTemplate> {
		const stateName = SUPPORTED_STATES[stateCode] || DEFAULT_STATE_NAME
		const templateTypeValue = TEMPLATE_TYPES[templateType]
		const templateTypeForFileName =
			templateTypeValue.charAt(0).toUpperCase() + templateTypeValue.slice(1)
		const fileName = `${stateName}_${templateTypeForFileName}_Lease_Agreement.pdf`

		// Try multiple paths to handle different execution contexts
		const possiblePaths = [
			path.resolve(__dirname, 'templates', fileName),
			path.resolve(
				process.cwd(),
				'apps',
				'backend',
				'src',
				'modules',
				'pdf',
				'templates',
				fileName
			),
			path.resolve(
				process.cwd(),
				'src',
				'modules',
				'pdf',
				'templates',
				fileName
			),
			path.resolve(process.cwd(), 'apps', 'backend', 'assets', fileName),
			path.resolve(process.cwd(), 'assets', fileName)
		]

		for (const templatePath of possiblePaths) {
			try {
				const stats = await fs.stat(templatePath)
				const content = await fs.readFile(templatePath)
				const uint8Array = new Uint8Array(content)

				// Extract PDF field names
				let fields: string[] = []
				try {
					const pdfDoc = await PDFDocument.load(uint8Array)
					fields = pdfDoc
						.getForm()
						.getFields()
						.map(f => f.getName())
				} catch {
					// PDF field extraction failed, continue without fields
				}

				this.logger.debug('Template loaded', {
					stateCode,
					templateType,
					path: templatePath,
					size: stats.size
				})

				return {
					metadata: {
						exists: true,
						size: stats.size,
						fields,
						path: templatePath,
						stateCode,
						stateName,
						templateType
					},
					content: uint8Array,
					cachedAt: Date.now()
				}
			} catch {
				continue
			}
		}

		// Template not found
		this.logger.warn('Template file not found', {
			stateCode,
			templateType,
			paths: possiblePaths
		})

		return {
			metadata: {
				exists: false,
				path: possiblePaths[0]!,
				stateCode,
				templateType
			},
			content: null,
			cachedAt: Date.now()
		}
	}

	private getCacheKey(
		stateCode: SupportedStateCode,
		templateType: TemplateType
	): string {
		return `${stateCode}:${templateType}`
	}

	private cleanup(): void {
		const now = Date.now()
		let cleaned = 0

		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.cachedAt > CACHE_TTL_MS) {
				this.cache.delete(key)
				cleaned++
			}
		}

		if (cleaned > 0) {
			this.logger.debug('Template cache cleanup', {
				cleaned,
				remaining: this.cache.size
			})
		}
	}
}
