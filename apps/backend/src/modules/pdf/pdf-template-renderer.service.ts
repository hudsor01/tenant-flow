import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import Handlebars from 'handlebars'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { AppLogger } from '../../logger/app-logger.service'

type RenderCacheEntry = {
	html: string
	expiresAt: number
}

@Injectable()
export class PdfTemplateRendererService implements OnModuleInit, OnModuleDestroy {
	private readonly templateCache = new Map<string, Handlebars.TemplateDelegate>()
	private readonly templateCacheMaxEntries = Number.parseInt(
		process.env.PDF_TEMPLATE_CACHE_MAX ?? '50',
		10
	)
	private readonly renderCache = new Map<string, RenderCacheEntry>()
	private readonly renderCacheMaxEntries = Number.parseInt(
		process.env.PDF_TEMPLATE_RENDER_CACHE_MAX ?? '250',
		10
	)
	private readonly renderCacheTtlMs = Number.parseInt(
		process.env.PDF_TEMPLATE_RENDER_CACHE_TTL_MS ?? '300000',
		10
	)
	private readonly prewarmTemplates = (process.env.PDF_TEMPLATE_PREWARM ?? 'lease-agreement')
		.split(',')
		.map(value => value.trim())
		.filter(Boolean)

	constructor(private readonly logger: AppLogger) {}

	async onModuleInit(): Promise<void> {
		if (this.prewarmTemplates.length === 0) {
			return
		}

		this.logger.log('Prewarming PDF HTML templates', {
			templates: this.prewarmTemplates
		})

		// Load all templates concurrently
		const results = await Promise.allSettled(
			this.prewarmTemplates.map(templateName => this.getTemplate(templateName))
		)

		// Log any failures
		for (let i = 0; i < results.length; i++) {
			const result = results[i]
			if (result && result.status === 'rejected') {
				const reason = result.reason as unknown
				this.logger.warn('Failed to prewarm PDF HTML template', {
					templateName: this.prewarmTemplates[i],
					error: reason instanceof Error ? reason.message : String(reason)
				})
			}
		}
	}

	onModuleDestroy(): void {
		this.templateCache.clear()
		this.renderCache.clear()
	}

	async renderTemplate(
		templateName: string,
		data: Record<string, unknown>,
		options?: {
			cacheKey?: string
			ttlMs?: number
		}
	): Promise<string> {
		const cacheKey = options?.cacheKey ?? this.buildRenderCacheKey(templateName, data)
		const cached = this.getCachedRender(cacheKey)
		if (cached) {
			return cached
		}

		const template = await this.getTemplate(templateName)
		const html = template(data)
		this.setCachedRender(cacheKey, html, options?.ttlMs ?? this.renderCacheTtlMs)
		return html
	}

	private getCachedRender(cacheKey: string): string | null {
		const cached = this.renderCache.get(cacheKey)
		if (!cached) {
			return null
		}
		if (Date.now() > cached.expiresAt) {
			this.renderCache.delete(cacheKey)
			return null
		}
		return cached.html
	}

	private setCachedRender(cacheKey: string, html: string, ttlMs: number): void {
		this.renderCache.set(cacheKey, {
			html,
			expiresAt: Date.now() + ttlMs
		})
		this.evictExpiredRenders()
		this.enforceRenderCacheSize()
	}

	private evictExpiredRenders(): void {
		const now = Date.now()
		for (const [key, entry] of this.renderCache.entries()) {
			if (entry.expiresAt <= now) {
				this.renderCache.delete(key)
			}
		}
	}

	private enforceRenderCacheSize(): void {
		while (this.renderCache.size > this.renderCacheMaxEntries) {
			const oldestKey = this.renderCache.keys().next().value
			if (!oldestKey) {
				return
			}
			this.renderCache.delete(oldestKey)
		}
	}

	private enforceTemplateCacheSize(): void {
		while (this.templateCache.size > this.templateCacheMaxEntries) {
			const oldestKey = this.templateCache.keys().next().value
			if (!oldestKey) {
				return
			}
			this.templateCache.delete(oldestKey)
		}
	}

	private async getTemplate(templateName: string): Promise<Handlebars.TemplateDelegate> {
		const cached = this.templateCache.get(templateName)
		if (cached) {
			return cached
		}

		const templatePath = await this.resolveTemplatePath(templateName)
		const source = await fs.readFile(templatePath, 'utf-8')
		const compiled = Handlebars.compile(source, { noEscape: true })
		this.templateCache.set(templateName, compiled)
		this.enforceTemplateCacheSize()

		this.logger.log('PDF HTML template cached', {
			templateName,
			path: templatePath
		})

		return compiled
	}

	private async resolveTemplatePath(templateName: string): Promise<string> {
		const fileName = `${templateName}.hbs`
		const candidates = [
			path.resolve(__dirname, 'templates', fileName),
			path.resolve(process.cwd(), 'apps', 'backend', 'src', 'modules', 'pdf', 'templates', fileName),
			path.resolve(process.cwd(), 'src', 'modules', 'pdf', 'templates', fileName)
		]

		for (const candidate of candidates) {
			try {
				await fs.stat(candidate)
				return candidate
			} catch {
				continue
			}
		}

		throw new Error(`PDF HTML template not found: ${templateName}`)
	}

	private buildRenderCacheKey(templateName: string, data: Record<string, unknown>): string {
		const payload = JSON.stringify(data)
		const hash = crypto.createHash('sha1').update(payload).digest('hex')
		return `${templateName}:${hash}`
	}
}
