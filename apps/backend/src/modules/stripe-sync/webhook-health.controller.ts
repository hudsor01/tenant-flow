/**
 * Webhook Health Controller
 *
 * Simple health check endpoint for webhook system
 * Full webhook monitoring available in Stripe Dashboard:
 * https://dashboard.stripe.com/webhooks
 *
 * Following Stripe's official recommendation:
 * - Use Stripe Dashboard for detailed metrics
 * - Use this endpoint for basic uptime monitoring
 */

import {
	Controller,
	Get,
	HttpStatus,
	HttpCode,
	SetMetadata
} from '@nestjs/common'
import { AppConfigService } from '../../config/app-config.service'

// Public decorator for monitoring endpoints (bypasses JWT auth)
const Public = () => SetMetadata('isPublic', true)

@Controller('webhooks/health')
export class WebhookHealthController {
	constructor(private readonly appConfigService: AppConfigService) {}

	/**
	 * GET /webhooks/health
	 *
	 * Returns webhook system health status
	 * Used by monitoring systems (e.g., Uptime Kuma, Datadog)
	 *
	 * For detailed webhook metrics, use Stripe Dashboard:
	 * https://dashboard.stripe.com/webhooks
	 */
	@Public()
	@Get()
	@HttpCode(HttpStatus.OK)
	getHealth() {
		const webhookSecret = this.appConfigService.getStripeWebhookSecret()
		const stripeKey = this.appConfigService.getStripeSecretKey()

		const isConfigured = !!webhookSecret && !!stripeKey

		return {
			status: isConfigured ? 'healthy' : 'misconfigured',
			timestamp: new Date().toISOString(),
			checks: {
				webhook_secret_configured: !!webhookSecret,
				stripe_key_configured: !!stripeKey
			},
			dashboard_url: 'https://dashboard.stripe.com/webhooks'
		}
	}
}
