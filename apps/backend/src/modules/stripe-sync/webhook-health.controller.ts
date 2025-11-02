/**
 * Webhook Health Controller
 *
 * Provides health check and monitoring endpoints for webhook system
 * Used for observability, alerting, and debugging
 *
 * Note: Access control removed - webhook health is for internal monitoring
 * Can be secured via network/firewall rules in production
 */

import {
	Controller,
	Get,
	Patch,
	Param,
	HttpStatus,
	HttpCode,
	SetMetadata
} from '@nestjs/common'
import { WebhookMonitoringService } from './webhook-monitoring.service'

// Public decorator for monitoring endpoints (bypasses JWT auth)
const Public = () => SetMetadata('isPublic', true)

@Controller('webhooks/health')
export class WebhookHealthController {
	constructor(
		private readonly webhookMonitoringService: WebhookMonitoringService
	) {}

	/**
	 * GET /webhooks/health
	 *
	 * Returns overall webhook system health status
	 * Used by monitoring systems (e.g., Uptime Kuma, Datadog)
	 */
	@Public()
	@Get()
	@HttpCode(HttpStatus.OK)
	async getHealth() {
		const issues = await this.webhookMonitoringService.detectHealthIssues()
		const hasCriticalIssues = issues.some(issue => issue.severity === 'critical')
		const hasWarnings = issues.some(issue => issue.severity === 'warning')

		return {
			status: hasCriticalIssues ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy',
			timestamp: new Date().toISOString(),
			issues: issues.length > 0 ? issues : undefined,
			summary: {
				total_issues: issues.length,
				critical: issues.filter(i => i.severity === 'critical').length,
				warnings: issues.filter(i => i.severity === 'warning').length,
				info: issues.filter(i => i.severity === 'info').length
			}
		}
	}

	/**
	 * GET /webhooks/health/summary
	 *
	 * Returns detailed 24-hour health summary with hourly breakdown
	 * Used for dashboards and trend analysis
	 */
	@Public()
	@Get('summary')
	async getHealthSummary() {
		const [healthSummary, eventTypeSummary] = await Promise.all([
			this.webhookMonitoringService.getHealthSummary(),
			this.webhookMonitoringService.getEventTypeSummary()
		])

		return {
			timestamp: new Date().toISOString(),
			hourly_metrics: healthSummary,
			event_types: eventTypeSummary
		}
	}

	/**
	 * GET /webhooks/health/failures
	 *
	 * Returns unresolved webhook failures for investigation
	 * Requires authentication to prevent exposing error details
	 */
	@Get('failures')
	async getFailures() {
		const failures = await this.webhookMonitoringService.getUnresolvedFailures()

		return {
			timestamp: new Date().toISOString(),
			count: failures.length,
			failures: failures.map(f => ({
				id: f.id,
				stripe_event_id: f.stripe_event_id,
				event_type: f.event_type,
				failure_reason: f.failure_reason,
				error_message: f.error_message,
				retry_count: f.retry_count,
				created_at: f.created_at,
				last_retry_at: f.last_retry_at
			}))
		}
	}

	/**
	 * PATCH /webhooks/health/failures/:id/resolve
	 *
	 * Mark a webhook failure as resolved
	 */
	@Patch('failures/:id/resolve')
	@HttpCode(HttpStatus.OK)
	async resolveFailure(@Param('id') id: string) {
		await this.webhookMonitoringService.resolveFailure(id)

		return {
			success: true,
			message: 'Failure marked as resolved'
		}
	}

	/**
	 * GET /webhooks/health/configuration
	 *
	 * Returns webhook configuration status and recommendations
	 * Helps diagnose setup issues
	 * Requires authentication to prevent exposing internal configuration
	 */
	@Get('configuration')
	async getConfiguration() {
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
		const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.TEST_STRIPE_SECRET_KEY

		// Check environment configuration
		const checks = {
			webhook_secret_configured: !!webhookSecret,
			webhook_secret_format: webhookSecret?.startsWith('whsec_') || false,
			stripe_key_configured: !!stripeKey,
			stripe_key_type: stripeKey?.startsWith('sk_live_')
				? 'live'
				: stripeKey?.startsWith('sk_test_')
				? 'test'
				: stripeKey?.startsWith('rk_')
				? 'restricted'
				: 'unknown',
			database_connection: true, // Assume true if we got here
			timestamp: new Date().toISOString()
		}

		const allChecksPassed = Object.values(checks).every(v =>
			typeof v === 'boolean' ? v : true
		)

		const recommendations = []

		if (!checks.webhook_secret_configured) {
			recommendations.push({
				severity: 'critical',
				message: 'STRIPE_WEBHOOK_SECRET is not configured',
				action: 'Set STRIPE_WEBHOOK_SECRET in Doppler from Stripe Dashboard webhook settings'
			})
		}

		if (!checks.webhook_secret_format) {
			recommendations.push({
				severity: 'warning',
				message: 'Webhook secret format may be invalid (should start with whsec_)',
				action: 'Verify STRIPE_WEBHOOK_SECRET from Stripe Dashboard'
			})
		}

		if (checks.stripe_key_type === 'test') {
			recommendations.push({
				severity: 'info',
				message: 'Using Stripe test mode key',
				action: 'Switch to live mode key when ready for production'
			})
		}

		return {
			status: allChecksPassed ? 'configured' : 'misconfigured',
			checks,
			recommendations,
			endpoint_url: process.env.API_BASE_URL
				? `${process.env.API_BASE_URL}/webhooks/stripe-sync`
				: 'https://api.tenantflow.app/webhooks/stripe-sync'
		}
	}
}
