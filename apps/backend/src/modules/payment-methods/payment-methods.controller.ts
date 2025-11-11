import {
	BadRequestException,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
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

		const paymentMethods = await this.paymentMethodsService.listPaymentMethods(
			token,
			userId
		)

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
