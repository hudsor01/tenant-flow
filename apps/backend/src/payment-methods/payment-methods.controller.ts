import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Logger,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Request
} from '@nestjs/common'
import { PaymentMethodsService } from './payment-methods.service'

interface AuthenticatedRequest extends Request {
	user?: {
		id: string
		email: string
	}
}

@Controller('payment-methods')
export class PaymentMethodsController {
	private readonly logger = new Logger(PaymentMethodsController.name)

	constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

	/**
	 * Create a SetupIntent for saving a payment method
	 * POST /payment-methods/setup-intent
	 */
	@Post('setup-intent')
	async createSetupIntent(
		@Request() req: AuthenticatedRequest,
		@Body() body: { type: 'card' | 'us_bank_account' }
	) {
		const userId = req.user?.id
		const email = req.user?.email

		if (!userId || !email) {
			throw new BadRequestException('User not authenticated')
		}

		if (!body.type || !['card', 'us_bank_account'].includes(body.type)) {
			throw new BadRequestException(
				'Invalid payment method type. Must be "card" or "us_bank_account"'
			)
		}

		const result = await this.paymentMethodsService.createSetupIntent(
			userId,
			email,
			body.type
		)

		return result
	}

	/**
	 * Save a payment method after SetupIntent confirmation
	 * POST /payment-methods/save
	 */
	@Post('save')
	async savePaymentMethod(
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

		const result = await this.paymentMethodsService.savePaymentMethod(
			userId,
			body.paymentMethodId
		)

		return result
	}

	/**
	 * List all payment methods for the authenticated user
	 * GET /payment-methods
	 */
	@Get()
	async listPaymentMethods(@Request() req: AuthenticatedRequest) {
		const userId = req.user?.id

		if (!userId) {
			throw new BadRequestException('User not authenticated')
		}

		const paymentMethods =
			await this.paymentMethodsService.listPaymentMethods(userId)

		return { paymentMethods }
	}

	/**
	 * Set a payment method as default
	 * PATCH /payment-methods/:id/default
	 */
	@Patch(':id/default')
	async setDefaultPaymentMethod(
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) paymentMethodId: string
	) {
		const userId = req.user?.id

		if (!userId) {
			throw new BadRequestException('User not authenticated')
		}

		const result = await this.paymentMethodsService.setDefaultPaymentMethod(
			userId,
			paymentMethodId
		)

		return result
	}

	/**
	 * Delete a payment method
	 * DELETE /payment-methods/:id
	 */
	@Delete(':id')
	async deletePaymentMethod(
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) paymentMethodId: string
	) {
		const userId = req.user?.id

		if (!userId) {
			throw new BadRequestException('User not authenticated')
		}

		const result = await this.paymentMethodsService.deletePaymentMethod(
			userId,
			paymentMethodId
		)

		return result
	}
}
