import {
	BadRequestException,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Request,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiParam,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { Database } from '@repo/shared/types/supabase'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { PaymentMethodsService } from './payment-methods.service'

@ApiTags('Payment Methods')
@ApiBearerAuth('supabase-auth')
@Controller('payment-methods')
export class PaymentMethodsController {
	constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

	/**
	 * List all payment methods for the authenticated user
	 * GET /payment-methods
	 */
	@ApiOperation({ summary: 'List payment methods', description: 'List all payment methods for the authenticated user' })
	@ApiResponse({ status: 200, description: 'Payment methods retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get()
	async listPaymentMethods(
		@Request() req: AuthenticatedRequest
	): Promise<{
		paymentMethods: Database['public']['Tables']['payment_methods']['Row'][]
	}> {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const user_id = req.user.id

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
	@ApiOperation({ summary: 'Set default payment method', description: 'Set a payment method as the default for the authenticated user' })
	@ApiParam({ name: 'id', type: String, description: 'Payment method ID (pm_* or sm_* format)' })
	@ApiResponse({ status: 200, description: 'Default payment method updated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid payment method ID format' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Patch(':id/default')
	async setDefaultPaymentMethod(
		@Request() req: AuthenticatedRequest,
		@Param('id') paymentMethodId: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const user_id = req.user.id

		if (
			!paymentMethodId ||
			(!paymentMethodId.startsWith('pm_') && !paymentMethodId.startsWith('sm_'))
		) {
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
	@ApiOperation({ summary: 'Delete payment method', description: 'Delete a payment method for the authenticated user' })
	@ApiParam({ name: 'id', type: String, description: 'Payment method ID (pm_* or sm_* format)' })
	@ApiResponse({ status: 200, description: 'Payment method deleted successfully' })
	@ApiResponse({ status: 400, description: 'Invalid payment method ID format' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Delete(':id')
	async deletePaymentMethod(
		@Request() req: AuthenticatedRequest,
		@Param('id') paymentMethodId: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const user_id = req.user.id

		if (
			!paymentMethodId ||
			(!paymentMethodId.startsWith('pm_') && !paymentMethodId.startsWith('sm_'))
		) {
			throw new BadRequestException('Invalid payment method ID format')
		}

		return this.paymentMethodsService.deletePaymentMethod(
			token,
			user_id,
			paymentMethodId
		)
	}
}
