import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { EmailTemplateName } from '../types/email-templates.types'

export interface EmailMetric {
	id: string
	template: EmailTemplateName
	recipient: string
	status: 'sent' | 'failed' | 'bounced' | 'delivered' | 'opened' | 'clicked'
	timestamp: Date
	processingTime?: number
	messageId?: string
	error?: string
	metadata?: {
		userId?: string
		organizationId?: string
		campaignId?: string
		jobId?: string
	}
}

export interface TemplateStats {
	template: EmailTemplateName
	sent: number
	failed: number
	bounced: number
	delivered: number
	opened: number
	clicked: number
	deliveryRate: number
	openRate: number
	clickRate: number
	avgProcessingTime: number
}

export interface SystemStats {
	totalSent: number
	totalFailed: number
	successRate: number
	avgProcessingTime: number
	queueDepth: number
	lastHour: number
	last24Hours: number
	last7Days: number
	templatesStats: TemplateStats[]
}

@Injectable()
export class EmailMetricsService {
	private readonly logger = new Logger(EmailMetricsService.name)
	private metrics: EmailMetric[] = []
	private readonly maxMetrics = 10000 // Keep last 10k metrics in memory

	constructor() {
		// Initialize metrics service
	}

	/**
	 * Record email metric
	 */
	recordMetric(metric: Omit<EmailMetric, 'id' | 'timestamp'>): void {
		const emailMetric: EmailMetric = {
			id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			timestamp: new Date(),
			...metric
		}

		this.metrics.unshift(emailMetric)

		// Keep only recent metrics to prevent memory issues
		if (this.metrics.length > this.maxMetrics) {
			this.metrics = this.metrics.slice(0, this.maxMetrics)
		}

		// Log critical events
		if (metric.status === 'failed') {
			this.logger.warn('Email failed', {
				template: metric.template,
				recipient: metric.recipient,
				error: metric.error
			})
		}
	}

	/**
	 * Get system-wide statistics
	 */
	getSystemStats(): SystemStats {
		const now = Date.now()
		const oneHour = 60 * 60 * 1000
		const oneDay = 24 * oneHour
		const oneWeek = 7 * oneDay

		const recentMetrics = this.metrics.filter(
			m => now - m.timestamp.getTime() < oneWeek
		)

		const totalSent = recentMetrics.filter(m =>
			['sent', 'delivered', 'opened', 'clicked'].includes(m.status)
		).length

		const totalFailed = recentMetrics.filter(m =>
			['failed', 'bounced'].includes(m.status)
		).length

		const successRate =
			totalSent > 0 ? (totalSent / (totalSent + totalFailed)) * 100 : 0

		const avgProcessingTime =
			recentMetrics
				.filter(m => m.processingTime)
				.reduce((sum, m) => sum + (m.processingTime || 0), 0) /
			Math.max(1, recentMetrics.filter(m => m.processingTime).length)

		const lastHour = recentMetrics.filter(
			m => now - m.timestamp.getTime() < oneHour
		).length

		const last24Hours = recentMetrics.filter(
			m => now - m.timestamp.getTime() < oneDay
		).length

		const templatesStats = this.getTemplateStats(recentMetrics)

		return {
			totalSent,
			totalFailed,
			successRate,
			avgProcessingTime,
			queueDepth: 0, // Would come from queue service
			lastHour,
			last24Hours,
			last7Days: recentMetrics.length,
			templatesStats
		}
	}

	/**
	 * Get statistics by template
	 */
	getTemplateStats(metrics?: EmailMetric[]): TemplateStats[] {
		const metricsToAnalyze = metrics || this.metrics
		const templateGroups = new Map<EmailTemplateName, EmailMetric[]>()

		// Group metrics by template
		metricsToAnalyze.forEach(metric => {
			if (!templateGroups.has(metric.template)) {
				templateGroups.set(metric.template, [])
			}
			const templateMetrics = templateGroups.get(metric.template)
			if (templateMetrics) {
				templateMetrics.push(metric)
			}
		})

		// Calculate stats for each template
		return Array.from(templateGroups.entries()).map(
			([template, templateMetrics]) => {
				const sent = templateMetrics.filter(m =>
					['sent', 'delivered', 'opened', 'clicked'].includes(
						m.status
					)
				).length

				const failed = templateMetrics.filter(m =>
					['failed', 'bounced'].includes(m.status)
				).length

				const bounced = templateMetrics.filter(
					m => m.status === 'bounced'
				).length
				const delivered = templateMetrics.filter(m =>
					['delivered', 'opened', 'clicked'].includes(m.status)
				).length
				const opened = templateMetrics.filter(m =>
					['opened', 'clicked'].includes(m.status)
				).length
				const clicked = templateMetrics.filter(
					m => m.status === 'clicked'
				).length

				const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0
				const openRate = delivered > 0 ? (opened / delivered) * 100 : 0
				const clickRate = opened > 0 ? (clicked / opened) * 100 : 0

				const avgProcessingTime =
					templateMetrics
						.filter(m => m.processingTime)
						.reduce((sum, m) => sum + (m.processingTime || 0), 0) /
					Math.max(
						1,
						templateMetrics.filter(m => m.processingTime).length
					)

				return {
					template,
					sent,
					failed,
					bounced,
					delivered,
					opened,
					clicked,
					deliveryRate,
					openRate,
					clickRate,
					avgProcessingTime
				}
			}
		)
	}

	/**
	 * Get metrics for specific timeframe
	 */
	getMetrics(options: {
		template?: EmailTemplateName
		status?: EmailMetric['status']
		startDate?: Date
		endDate?: Date
		limit?: number
	}): EmailMetric[] {
		let filtered = this.metrics

		if (options.template) {
			filtered = filtered.filter(m => m.template === options.template)
		}

		if (options.status) {
			filtered = filtered.filter(m => m.status === options.status)
		}

		if (options.startDate) {
			const startDate = options.startDate
			if (startDate) {
				filtered = filtered.filter(m => m.timestamp >= startDate)
			}
		}

		if (options.endDate) {
			const endDate = options.endDate
			if (endDate) {
				filtered = filtered.filter(m => m.timestamp <= endDate)
			}
		}

		if (options.limit) {
			filtered = filtered.slice(0, options.limit)
		}

		return filtered
	}

	/**
	 * Generate hourly report
	 */
	@Cron(CronExpression.EVERY_HOUR)
	generateHourlyReport(): void {
		const stats = this.getSystemStats()

		this.logger.log('📊 Hourly Email Report', {
			totalSent: stats.totalSent,
			successRate: `${stats.successRate.toFixed(1)}%`,
			lastHour: stats.lastHour,
			avgProcessingTime: `${stats.avgProcessingTime.toFixed(0)}ms`,
			topTemplates: stats.templatesStats
				.sort((a, b) => b.sent - a.sent)
				.slice(0, 3)
				.map(t => `${t.template}: ${t.sent} sent`)
		})

		// Alert on concerning metrics
		if (stats.successRate < 95) {
			this.logger.error('🚨 Low email success rate', {
				successRate: stats.successRate,
				totalFailed: stats.totalFailed
			})
		}

		if (stats.avgProcessingTime > 5000) {
			this.logger.warn('⚠️ High processing times', {
				avgProcessingTime: stats.avgProcessingTime
			})
		}
	}

	/**
	 * Generate daily report
	 */
	@Cron(CronExpression.EVERY_DAY_AT_9AM)
	generateDailyReport(): void {
		const stats = this.getSystemStats()

		this.logger.log('📈 Daily Email Report', {
			last24Hours: stats.last24Hours,
			successRate: `${stats.successRate.toFixed(1)}%`,
			templateBreakdown: stats.templatesStats.reduce(
				(acc, t) => {
					acc[t.template] = {
						sent: t.sent,
						openRate: `${t.openRate.toFixed(1)}%`,
						clickRate: `${t.clickRate.toFixed(1)}%`
					}
					return acc
				},
				{} as Record<string, unknown>
			)
		})
	}

	/**
	 * Get alerts that need attention
	 */
	getAlerts(): {
		level: 'critical' | 'warning' | 'info'
		message: string
		metric: string
		value: number
		threshold: number
	}[] {
		const alerts = []
		const stats = this.getSystemStats()

		// Critical alerts
		if (stats.successRate < 90) {
			alerts.push({
				level: 'critical' as const,
				message: 'Email success rate critically low',
				metric: 'successRate',
				value: stats.successRate,
				threshold: 90
			})
		}

		// Warning alerts
		if (stats.successRate < 95) {
			alerts.push({
				level: 'warning' as const,
				message: 'Email success rate below target',
				metric: 'successRate',
				value: stats.successRate,
				threshold: 95
			})
		}

		if (stats.avgProcessingTime > 3000) {
			alerts.push({
				level: 'warning' as const,
				message: 'High email processing times',
				metric: 'avgProcessingTime',
				value: stats.avgProcessingTime,
				threshold: 3000
			})
		}

		// Template-specific alerts
		stats.templatesStats.forEach(template => {
			if (template.sent > 10 && template.deliveryRate < 90) {
				alerts.push({
					level: 'warning' as const,
					message: `Template ${template.template} has low delivery rate`,
					metric: 'deliveryRate',
					value: template.deliveryRate,
					threshold: 90
				})
			}
		})

		return alerts
	}

	/**
	 * Clear old metrics (cleanup)
	 */
	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	cleanupOldMetrics(): void {
		const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
		const beforeCount = this.metrics.length

		this.metrics = this.metrics.filter(
			m => m.timestamp.getTime() > oneWeekAgo
		)

		const afterCount = this.metrics.length

		if (beforeCount !== afterCount) {
			this.logger.debug(
				`Cleaned up ${beforeCount - afterCount} old metrics`,
				{
					before: beforeCount,
					after: afterCount
				}
			)
		}
	}
}
