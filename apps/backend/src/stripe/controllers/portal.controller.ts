import { Controller, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common'
import { PortalService } from '../services/portal.service'
import { CreatePortalDto } from '../dto/create-portal.dto'
import type { AppError } from '@tenantflow/types'

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

			const result = await this.portalService.createPortalSession(
				createPortalDto.userId,
				createPortalDto.returnUrl || 'https://tenantflow.app/dashboard'
			)
			return result
		} catch (error) {
			this.logger.error('Portal session creation failed:', error)

			// Handle different error types
			let errorMessage = 'Unknown error'
			if (error instanceof Error) {
				errorMessage = error.message
			} else if (typeof error === 'string') {
				errorMessage = error
			} else if (error && typeof error === 'object' && 'message' in error) {
				errorMessage = (error as AppError).message
			}
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