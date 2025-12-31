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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

// Public decorator for monitoring endpoints (bypasses JWT auth)
const Public = () => SetMetadata('isPublic', true)

@ApiTags('Webhooks')
@Controller('webhooks/health')
export class WebhookHealthController {

	/**
	 * GET /webhooks/health
	 *
	 * Returns webhook system health status
	 * Used by monitoring systems (e.g., Uptime Kuma, Datadog)
	 *
	 * For detailed webhook metrics, use Stripe Dashboard:
	 * https://dashboard.stripe.com/webhooks
	 */
	@ApiOperation({
		summary: 'Webhook system health',
		description:
			'Returns webhook system health status. For detailed metrics, use Stripe Dashboard.'
	})
	@ApiResponse({
		status: 200,
		description: 'Webhook system is healthy',
		schema: {
			type: 'object',
			properties: {
				status: { type: 'string', example: 'ok' },
				timestamp: { type: 'string', format: 'date-time' }
			}
		}
	})
	@Public()
	@Get()
	@HttpCode(HttpStatus.OK)
	getHealth() {
		// Only return basic health status - no configuration details exposed
		// For detailed webhook metrics, use Stripe Dashboard
		return {
			status: 'ok',
			timestamp: new Date().toISOString()
		}
	}
}
