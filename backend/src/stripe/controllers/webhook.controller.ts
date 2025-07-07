import { Controller, Post, Request, UseGuards, Logger, HttpException, HttpStatus } from '@nestjs/common'
import { WebhookService } from '../services/webhook.service'
import { StripeWebhookGuard } from '../guards/stripe-webhook.guard'

@Controller('stripe/webhook')
export class WebhookController {
	private readonly logger = new Logger(WebhookController.name)

	constructor(private webhookService: WebhookService) {}

	@Post()
	@UseGuards(StripeWebhookGuard)
	async handleWebhook(@Request() req: any) {
		try {
			// The event has been verified by the guard and attached to the request
			const event = req.stripeEvent

			if (!event) {
				throw new HttpException('Invalid webhook event', HttpStatus.BAD_REQUEST)
			}

			await this.webhookService.handleWebhook(event)

			return { received: true }
		} catch (error) {
			this.logger.error('Webhook processing failed:', error)
			throw new HttpException(
				{
					error: 'Webhook processing failed',
					eventType: req.stripeEvent?.type,
					eventId: req.stripeEvent?.id,
				},
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}
}