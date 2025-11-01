import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Request
} from '@nestjs/common'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { PaymentMethodsService } from './payment-methods.service'

interface AuthenticatedRequest extends Request {
	user?: {
		id: string
		email: string
	}
}

@Controller('payment-methods')
export class PaymentMethodsController {
	constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

	/**
	 * Create a SetupIntent for saving a payment method
	 * POST /payment-methods/setup-intent
	 */
	@Post('setup-intent')
	async createSetupIntent(
		@JwtToken() token: string,
		@Request() req: AuthenticatedRequest,
		@Body() body: { type?: 'card' | 'us_bank_account' }
	) {
		const userId = req.user?.id
		const email = req.user?.email
		const type = body.type ?? 'card'

		if (!userId) {
			throw new BadRequestException('User not authenticated')
		}

		if (!['card', 'us_bank_account'].includes(type)) {
			throw new BadRequestException(
				'Invalid payment method type. Must be "card" or "us_bank_account"'
			)
		}

		return this.paymentMethodsService.createSetupIntent(token, userId, email, type)
	}

	/**
	 * Save a payment method after SetupIntent confirmation
	 * POST /payment-methods/save
	 */
	@Post('save')
	async savePaymentMethod(
		@JwtToken() token: string,
		@Request() req: AuthenticatedRequest,
		@Body() body: { paymentMethodId: string }
	) {
		const userId = req.user?.id

		if (!userId) {
			throw new BadRequestException('User not authenticated')
		}

		if (!body.paymentMethodId) {
			throw new BadRequestException('Payment method ID is required')
		}

		return this.paymentMethodsService.savePaymentMethod(
			token,
			userId,
			body.paymentMethodId
		)
	}

	/**
	 * List all payment methods for the authenticated user
	 * GET /payment-methods
	 */
	@Get()
	async listPaymentMethods(
		@JwtToken() token: string,
		@Request() req: AuthenticatedRequest
	) {
		const userId = req.user?.id

		if (!userId) {
			throw new BadRequestException('User not authenticated')
		}

		const paymentMethods =
			await this.paymentMethodsService.listPaymentMethods(token, userId)

		return { paymentMethods }
	}

	/**
	 * Set a payment method as default
	 * PATCH /payment-methods/:id/default
	 */
	@Patch(':id/default')
	async setDefaultPaymentMethod(
		@JwtToken() token: string,
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) paymentMethodId: string
	) {
		const userId = req.user?.id

		if (!userId) {
			throw new BadRequestException('User not authenticated')
		}

		return this.paymentMethodsService.setDefaultPaymentMethod(
			token,
			userId,
			paymentMethodId
		)
	}

	/**
	 * Delete a payment method
	 * DELETE /payment-methods/:id
	 */
	@Delete(':id')
	async deletePaymentMethod(
		@JwtToken() token: string,
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) paymentMethodId: string
	) {
		const userId = req.user?.id

		if (!userId) {
			throw new BadRequestException('User not authenticated')
		}

		return this.paymentMethodsService.deletePaymentMethod(
			token,
			userId,
			paymentMethodId
		)
	}
}
