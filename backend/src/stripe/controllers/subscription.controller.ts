import { Controller, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common'
import { SubscriptionService } from '../services/subscription.service'
import { CreateSubscriptionDto } from '../dto/create-subscription.dto'

@Controller('stripe/subscription')
export class SubscriptionController {
	private readonly logger = new Logger(SubscriptionController.name)

	constructor(private subscriptionService: SubscriptionService) {}

	@Post()
	async createSubscription(@Body() createSubscriptionDto: CreateSubscriptionDto) {
		try {
			// Validate required parameters
			if (!createSubscriptionDto.planId) {
				throw new HttpException('Plan ID is required', HttpStatus.BAD_REQUEST)
			}

			if (!createSubscriptionDto.userId) {
				throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST)
			}

			if (!['monthly', 'annual'].includes(createSubscriptionDto.billingPeriod)) {
				throw new HttpException('Invalid billing period', HttpStatus.BAD_REQUEST)
			}

			const result = await this.subscriptionService.createSubscription(createSubscriptionDto)
			return result
		} catch (error: unknown) {
			this.logger.error('Subscription creation failed:', error)

			// Return appropriate HTTP status codes
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			if (errorMessage.includes('Plan ID') || errorMessage.includes('billing period')) {
				throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST)
			} else if (errorMessage.includes('User not found')) {
				throw new HttpException('User not found', HttpStatus.NOT_FOUND)
			} else {
				// Temporarily return detailed error for debugging
				throw new HttpException({
					message: 'Failed to create subscription',
					error: errorMessage,
					stack: error instanceof Error ? error.stack : undefined,
					details: error
				}, HttpStatus.INTERNAL_SERVER_ERROR)
			}
		}
	}
}