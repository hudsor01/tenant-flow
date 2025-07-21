import { Controller, Post, Headers, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common'
import { Public } from '../auth/decorators/public.decorator'

@Controller('/stripe/webhook')
export class WebhookController {

	@Public()
	@Post()
	@HttpCode(HttpStatus.OK)
	async handleWebhook(
		@Headers('stripe-signature') signature: string,
		@Body() rawBody: Buffer
	): Promise<{ received: boolean }> {
		if (!signature) {
			throw new BadRequestException('Missing stripe-signature header')
		}


		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
		if (!webhookSecret) {
			throw new BadRequestException('Webhook secret not configured')
		}

		// Enhanced signature validation 
		if (!signature.startsWith('t=') || signature.length < 20) {
			throw new BadRequestException('Invalid webhook signature format')
		}

		// Check for timestamp and signature components
		const signatureParts = signature.split(',')
		if (signatureParts.length < 2 || (signatureParts[1] && !signatureParts[1].startsWith('v1='))) {
			throw new BadRequestException('Invalid webhook signature structure')
		}

		// Basic timestamp validation (not too old)
		const timestampMatch = signature.match(/t=(\d+)/)
		if (timestampMatch && timestampMatch[1]) {
			const timestamp = parseInt(timestampMatch[1])
			const currentTime = Math.floor(Date.now() / 1000)
			const timestampAge = currentTime - timestamp
			
			// Reject webhooks older than 5 minutes (300 seconds)
			if (timestampAge > 300) {
				throw new BadRequestException('Webhook timestamp too old')
			}
		}

		// Log successful webhook
		console.log('Webhook received:', { 
			signature: signature.substring(0, 20) + '...', 
			bodyLength: rawBody?.length || 0 
		})
		
		return { received: true }
	}
}