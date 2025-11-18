import {
	BadRequestException,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Request,
	UseGuards
} from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { PaymentMethodsService } from './payment-methods.service'

interface AuthenticatedRequest extends Request {
	user?: {
		id: string
		email: string
	}
}

@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
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
	): Promise<{ paymentMethods: Database['public']['Tables']['payment_methods']['Row'][] }> {
		const user_id = req.user!.id

		const paymentMethods = await this.paymentMethodsService.listPaymentMethods(
			token,
			user_id
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
		@Param('id') paymentMethodId: string
	) {
		const user_id = req.user!.id

		if (!paymentMethodId || (!paymentMethodId.startsWith('pm_') && !paymentMethodId.startsWith('sm_'))) {
			throw new BadRequestException('Invalid payment method ID format')
		}

		return this.paymentMethodsService.setDefaultPaymentMethod(
			token,
			user_id,
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
		@Param('id') paymentMethodId: string
	) {
		const user_id = req.user!.id

		if (!paymentMethodId || (!paymentMethodId.startsWith('pm_') && !paymentMethodId.startsWith('sm_'))) {
			throw new BadRequestException('Invalid payment method ID format')
		}

		return this.paymentMethodsService.deletePaymentMethod(
			token,
			user_id,
			paymentMethodId
		)
	}
}
