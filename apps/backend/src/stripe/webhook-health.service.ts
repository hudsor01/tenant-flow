import { Injectable, Logger } from '@nestjs/common'
import { StructuredLoggerService } from '../common/logging/structured-logger.service'
import { StripeService } from './stripe.service'
import { SupabaseService } from '../common/supabase/supabase.service'

export interface HealthCheckResult {
	service: string
	status: 'healthy' | 'degraded' | 'unhealthy'
	responseTime: number
	lastChecked: Date
	error?: string
	metadata?: Record<string, unknown>
}

export interface ConnectivityStatus {
	database: HealthCheckResult
	stripe: HealthCheckResult
	webhookEndpoint: HealthCheckResult
	overall: 'healthy' | 'degraded' | 'unhealthy'
	lastFullCheck: Date
}

export interface WebhookEndpointHealth {
	url: string
	isActive: boolean
	enabledEvents: string[]
	lastDelivery?: Date
	version: string
	status: 'enabled' | 'disabled' | 'error'
	failureCount: number
}

@Injectable()
export class WebhookHealthService {
	private readonly logger = new Logger(WebhookHealthService.name)
	private readonly structuredLogger: StructuredLoggerService
	private lastHealthCheck: ConnectivityStatus | null = null
	private healthCheckInterval: NodeJS.Timeout | null = null

	// Health check configuration
	private readonly checkIntervalMs = 2 * 60 * 1000 // Check every 2 minutes
	private readonly timeoutMs = 5000 // 5 second timeout for checks
	private readonly maxRetries = 3 // Maximum retry attempts for health checks
	private readonly baseRetryDelayMs = 1000 // Base delay for exponential backoff
	private readonly maxRetryDelayMs = 10000 // Maximum delay between retries

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly stripeService: StripeService
	) {
		this.structuredLogger = new StructuredLoggerService('WebhookHealth')

		// Start periodic health checks
		this.startPeriodicHealthChecks()
	}

	/**
	 * Perform comprehensive health check of all webhook dependencies
	 */
	async performHealthCheck(): Promise<ConnectivityStatus> {
		this.logger.log('Starting webhook health check')
		const startTime = Date.now()

		try {
			// Run all health checks in parallel with retry logic
			const [databaseHealth, stripeHealth, webhookEndpointHealth] =
				await Promise.allSettled([
					this.checkDatabaseHealthWithRetry(),
					this.checkStripeHealthWithRetry(),
					this.checkWebhookEndpointHealthWithRetry()
				])

			const database =
				databaseHealth.status === 'fulfilled'
					? databaseHealth.value
					: this.createErrorResult('database', databaseHealth.reason)
			const stripe =
				stripeHealth.status === 'fulfilled'
					? stripeHealth.value
					: this.createErrorResult('stripe', stripeHealth.reason)
			const webhookEndpoint =
				webhookEndpointHealth.status === 'fulfilled'
					? webhookEndpointHealth.value
					: this.createErrorResult(
							'webhook_endpoint',
							webhookEndpointHealth.reason
						)

			// Determine overall health
			const services = [database, stripe, webhookEndpoint]
			const unhealthyServices = services.filter(
				s => s.status === 'unhealthy'
			)
			const degradedServices = services.filter(
				s => s.status === 'degraded'
			)

			let overall: 'healthy' | 'degraded' | 'unhealthy'
			if (unhealthyServices.length > 0) {
				overall = 'unhealthy'
			} else if (degradedServices.length > 0) {
				overall = 'degraded'
			} else {
				overall = 'healthy'
			}

			const status: ConnectivityStatus = {
				database,
				stripe,
				webhookEndpoint,
				overall,
				lastFullCheck: new Date()
			}

			this.lastHealthCheck = status

			const totalTime = Date.now() - startTime
			this.logger.log(
				`Health check completed in ${totalTime}ms - Overall status: ${overall}`
			)

			// Log any issues
			if (overall !== 'healthy') {
				this.logHealthIssues(status)
			}

			return status
		} catch (error) {
			this.logger.error('Health check failed completely', error)
			throw error
		}
	}

	/**
	 * Get the last health check result
	 */
	getLastHealthCheck(): ConnectivityStatus | null {
		return this.lastHealthCheck
	}

	/**
	 * Check if webhook system is ready to process events
	 */
	async isSystemReady(): Promise<{
		ready: boolean
		blockers: string[]
		warnings: string[]
	}> {
		const health = await this.performHealthCheck()
		const blockers: string[] = []
		const warnings: string[] = []

		// Critical blockers (system cannot process webhooks)
		if (health.database.status === 'unhealthy') {
			blockers.push('Database connectivity lost')
		}

		if (health.stripe.status === 'unhealthy') {
			blockers.push('Stripe API connectivity lost')
		}

		// Warnings (system can process but may have issues)
		if (health.database.status === 'degraded') {
			warnings.push('Database performance degraded')
		}

		if (health.stripe.status === 'degraded') {
			warnings.push('Stripe API performance degraded')
		}

		if (health.webhookEndpoint.status === 'unhealthy') {
			warnings.push('Webhook endpoint configuration issues detected')
		}

		return {
			ready: blockers.length === 0,
			blockers,
			warnings
		}
	}

	/**
	 * Get detailed webhook endpoint configuration
	 */
	async getWebhookEndpointDetails(): Promise<WebhookEndpointHealth[]> {
		try {
			const endpoints =
				await this.stripeService.client.webhookEndpoints.list({
					limit: 100
				})

			return endpoints.data.map(endpoint => ({
				url: endpoint.url,
				isActive: endpoint.status === 'enabled',
				enabledEvents: [...endpoint.enabled_events],
				version: endpoint.api_version || 'latest',
				status: endpoint.status as 'enabled' | 'disabled' | 'error',
				failureCount: 0 // Stripe doesn't provide this directly
			}))
		} catch (error) {
			this.logger.error('Failed to fetch webhook endpoint details', error)
			return []
		}
	}

	/**
	 * Test webhook endpoint reachability with retry logic
	 */
	async testWebhookReachability(url: string): Promise<{
		reachable: boolean
		responseTime: number
		error?: string
		attempts: number
	}> {
		return this.withRetry(async () => {
			const startTime = Date.now()

			try {
				// Note: This is a basic connectivity test
				// In production, you might want to make an OPTIONS request
				// or have a dedicated health endpoint

				const response = await fetch(url, {
					method: 'HEAD',
					signal: AbortSignal.timeout(this.timeoutMs),
					headers: {
						'User-Agent': 'TenantFlow-Webhook-Health-Check/1.0'
					}
				})

				const result = {
					reachable: response.ok,
					responseTime: Date.now() - startTime,
					error: response.ok ? undefined : `HTTP ${response.status}`,
					attempts: 1
				}

				if (!response.ok) {
					throw new Error(
						`HTTP ${response.status}: ${response.statusText}`
					)
				}

				return result
			} catch (error) {
				throw new Error(
					error instanceof Error ? error.message : 'Unknown error'
				)
			}
		}, 'Webhook reachability test').catch(error => {
			return {
				reachable: false,
				responseTime: this.timeoutMs,
				error: error instanceof Error ? error.message : 'Unknown error',
				attempts: this.maxRetries
			}
		})
	}

	/**
	 * Monitor webhook delivery success rates from Stripe with retry logic
	 */
	async getWebhookDeliveryMetrics(hours = 24): Promise<{
		totalAttempts: number
		successfulDeliveries: number
		failedDeliveries: number
		successRate: number
		averageResponseTime: number
		lastDeliveryTime?: Date
		fetchAttempts: number
	}> {
		return this.withRetry(async () => {
			// Fetch recent webhook events from Stripe
			const since = Math.floor(
				(Date.now() - hours * 60 * 60 * 1000) / 1000
			)

			const events = await this.stripeService.client.events.list({
				created: { gte: since },
				limit: 100
			})

			// Note: Stripe doesn't provide delivery success rates directly
			// This is a simplified version. In production, you might need to
			// track this through Stripe's webhook delivery logs or dashboard

			return {
				totalAttempts: events.data.length,
				successfulDeliveries: events.data.length, // Assume all were delivered if we processed them
				failedDeliveries: 0,
				successRate: events.data.length > 0 ? 100 : 0,
				averageResponseTime: 0, // Would need webhook delivery logs for this
				lastDeliveryTime: events.data[0]
					? new Date(events.data[0].created * 1000)
					: undefined,
				fetchAttempts: 1
			}
		}, 'Webhook delivery metrics').catch(error => {
			this.logger.error(
				'Failed to fetch webhook delivery metrics after retries',
				error
			)
			return {
				totalAttempts: 0,
				successfulDeliveries: 0,
				failedDeliveries: 0,
				successRate: 0,
				averageResponseTime: 0,
				fetchAttempts: this.maxRetries
			}
		})
	}

	/**
	 * Cleanup resources
	 */
	onModuleDestroy(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval)
		}
	}

	/**
	 * Retry wrapper with exponential backoff for health check operations
	 */
	private async withRetry<T>(
		operation: () => Promise<T>,
		operationName: string,
		maxAttempts: number = this.maxRetries
	): Promise<T> {
		let lastError: unknown

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				return await operation()
			} catch (error) {
				lastError = error

				if (attempt === maxAttempts) {
					this.logger.warn(
						`${operationName} failed after ${maxAttempts} attempts`,
						{
							error:
								error instanceof Error
									? error.message
									: String(error),
							totalAttempts: maxAttempts
						}
					)
					throw error
				}

				// Calculate exponential backoff delay
				const exponentialDelay =
					this.baseRetryDelayMs * Math.pow(2, attempt - 1)
				const jitter = Math.random() * 200 // Add up to 200ms jitter
				const totalDelay = Math.min(
					exponentialDelay + jitter,
					this.maxRetryDelayMs
				)

				this.structuredLogger.warn(
					`${operationName} attempt ${attempt} failed, retrying in ${totalDelay}ms`,
					{
						error:
							error instanceof Error
								? error.message
								: String(error),
						attempt,
						maxAttempts,
						delay: totalDelay,
						operation: 'webhook.health_check.retry'
					}
				)

				// Wait before retry
				await new Promise(resolve => setTimeout(resolve, totalDelay))
			}
		}

		throw lastError
	}

	/**
	 * Enhanced database health check with retry logic
	 */
	private async checkDatabaseHealthWithRetry(): Promise<HealthCheckResult> {
		return this.withRetry(
			() => this.checkDatabaseHealth(),
			'Database health check'
		)
	}

	/**
	 * Enhanced Stripe health check with retry logic
	 */
	private async checkStripeHealthWithRetry(): Promise<HealthCheckResult> {
		return this.withRetry(
			() => this.checkStripeHealth(),
			'Stripe health check'
		)
	}

	/**
	 * Enhanced webhook endpoint health check with retry logic
	 */
	private async checkWebhookEndpointHealthWithRetry(): Promise<HealthCheckResult> {
		return this.withRetry(
			() => this.checkWebhookEndpointHealth(),
			'Webhook endpoint health check'
		)
	}

	private async checkDatabaseHealth(): Promise<HealthCheckResult> {
		const startTime = Date.now()

		try {
			// Test basic database connectivity with a simple query
			await this.supabaseService.getAdminClient().from('User').select('id').limit(1)

			const responseTime = Date.now() - startTime

			// Check if response time is within acceptable range
			const status = responseTime > 1000 ? 'degraded' : 'healthy'

			return {
				service: 'database',
				status,
				responseTime,
				lastChecked: new Date(),
				metadata: {
					query: 'User.select(id).limit(1)',
					responseTimeMs: responseTime
				}
			}
		} catch (error) {
			return {
				service: 'database',
				status: 'unhealthy',
				responseTime: Date.now() - startTime,
				lastChecked: new Date(),
				error:
					error instanceof Error
						? error.message
						: 'Unknown database error',
				metadata: {
					query: 'SELECT 1',
					errorType:
						error instanceof Error
							? error.constructor.name
							: 'Unknown'
				}
			}
		}
	}

	private async checkStripeHealth(): Promise<HealthCheckResult> {
		const startTime = Date.now()

		try {
			// Test Stripe API connectivity by retrieving account info
			await this.stripeService.client.accounts.retrieve()

			const responseTime = Date.now() - startTime

			// Check if response time is within acceptable range
			const status = responseTime > 2000 ? 'degraded' : 'healthy'

			return {
				service: 'stripe',
				status,
				responseTime,
				lastChecked: new Date(),
				metadata: {
					api: 'accounts.retrieve',
					responseTimeMs: responseTime
				}
			}
		} catch (error) {
			return {
				service: 'stripe',
				status: 'unhealthy',
				responseTime: Date.now() - startTime,
				lastChecked: new Date(),
				error:
					error instanceof Error
						? error.message
						: 'Unknown Stripe error',
				metadata: {
					api: 'accounts.retrieve',
					errorType:
						error instanceof Error
							? error.constructor.name
							: 'Unknown'
				}
			}
		}
	}

	private async checkWebhookEndpointHealth(): Promise<HealthCheckResult> {
		const startTime = Date.now()

		try {
			// Check webhook endpoint configuration
			const endpoints =
				await this.stripeService.client.webhookEndpoints.list({
					limit: 10
				})

			const responseTime = Date.now() - startTime
			const activeEndpoints = endpoints.data.filter(
				ep => ep.status === 'enabled'
			)

			let status: 'healthy' | 'degraded' | 'unhealthy'
			if (activeEndpoints.length === 0) {
				status = 'unhealthy'
			} else if (endpoints.data.some(ep => ep.status !== 'enabled')) {
				status = 'degraded'
			} else {
				status = 'healthy'
			}

			return {
				service: 'webhook_endpoint',
				status,
				responseTime,
				lastChecked: new Date(),
				metadata: {
					totalEndpoints: endpoints.data.length,
					activeEndpoints: activeEndpoints.length,
					enabledEvents: activeEndpoints.reduce(
						(acc: number, ep) => acc + ep.enabled_events.length,
						0
					)
				}
			}
		} catch (error) {
			return {
				service: 'webhook_endpoint',
				status: 'unhealthy',
				responseTime: Date.now() - startTime,
				lastChecked: new Date(),
				error:
					error instanceof Error
						? error.message
						: 'Unknown webhook endpoint error',
				metadata: {
					api: 'webhookEndpoints.list',
					errorType:
						error instanceof Error
							? error.constructor.name
							: 'Unknown'
				}
			}
		}
	}

	private createErrorResult(
		service: string,
		error: unknown
	): HealthCheckResult {
		return {
			service,
			status: 'unhealthy',
			responseTime: 0,
			lastChecked: new Date(),
			error: error instanceof Error ? error.message : String(error)
		}
	}

	private startPeriodicHealthChecks(): void {
		// Initial health check
		this.performHealthCheck().catch(error => {
			this.logger.error('Initial health check failed', error)
		})

		// Periodic health checks
		this.healthCheckInterval = setInterval(() => {
			this.performHealthCheck().catch(error => {
				this.logger.error('Periodic health check failed', error)
			})
		}, this.checkIntervalMs)
	}

	private logHealthIssues(status: ConnectivityStatus): void {
		const issues: string[] = []

		if (status.database.status !== 'healthy') {
			issues.push(
				`Database: ${status.database.status} (${status.database.responseTime}ms)`
			)
			if (status.database.error) {
				issues.push(`  └─ Error: ${status.database.error}`)
			}
		}

		if (status.stripe.status !== 'healthy') {
			issues.push(
				`Stripe: ${status.stripe.status} (${status.stripe.responseTime}ms)`
			)
			if (status.stripe.error) {
				issues.push(`  └─ Error: ${status.stripe.error}`)
			}
		}

		if (status.webhookEndpoint.status !== 'healthy') {
			issues.push(
				`Webhook Endpoint: ${status.webhookEndpoint.status} (${status.webhookEndpoint.responseTime}ms)`
			)
			if (status.webhookEndpoint.error) {
				issues.push(`  └─ Error: ${status.webhookEndpoint.error}`)
			}
		}

		this.structuredLogger.warn('Webhook system health issues detected', {
			overall: status.overall,
			issues,
			database: status.database,
			stripe: status.stripe,
			webhookEndpoint: status.webhookEndpoint,
			operation: 'webhook.health_check'
		})
	}
}
