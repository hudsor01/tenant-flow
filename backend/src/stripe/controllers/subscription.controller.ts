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
		} catch (error: any) {
			this.logger.error('Subscription creation failed:', error)

			// Return appropriate HTTP status codes
			if (error.message?.includes('Plan ID') || error.message?.includes('billing period')) {
				throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
			} else if (error.message?.includes('User not found')) {
				throw new HttpException('User not found', HttpStatus.NOT_FOUND)
			} else {
				throw new HttpException('Failed to create subscription', HttpStatus.INTERNAL_SERVER_ERROR)
			}
		}
	}
}