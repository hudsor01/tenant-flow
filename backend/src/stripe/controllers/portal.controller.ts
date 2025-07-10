import { Controller, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common'
import { PortalService } from '../services/portal.service'
import { CreatePortalDto } from '../dto/create-portal.dto'

@Controller('stripe/portal')
export class PortalController {
	private readonly logger = new Logger(PortalController.name)

	constructor(private portalService: PortalService) {}

	@Post()
	async createPortalSession(@Body() createPortalDto: CreatePortalDto) {
		try {
			if (!createPortalDto.userId) {
				throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST)
			}

			const result = await this.portalService.createPortalSession(createPortalDto.userId)
			return result
		} catch (error: unknown) {
			this.logger.error('Portal session creation failed:', error)

			// Return appropriate error messages
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			if (errorMessage.includes('User not found')) {
				throw new HttpException('User not found', HttpStatus.NOT_FOUND)
			} else if (errorMessage.includes('does not have a Stripe customer ID')) {
				throw new HttpException('User has no billing account. Please subscribe to a plan first.', HttpStatus.BAD_REQUEST)
			} else if (errorMessage.includes('Invalid request to Stripe')) {
				throw new HttpException('Invalid request to Stripe', HttpStatus.BAD_REQUEST)
			} else {
				// Temporarily return detailed error for debugging
				throw new HttpException({
					message: 'Failed to create portal session',
					error: errorMessage,
					stack: error instanceof Error ? error.stack : undefined,
					details: error
				}, HttpStatus.INTERNAL_SERVER_ERROR)
			}
		}
	}
}