/**
 * Tenant Payment Controller
 *
 * Handles all payment-related endpoints:
 * - GET /tenants/:id/payments - Payment history for a tenant
 * - GET /tenants/me/payments - Payment history for current tenant
 * - GET /tenants/payments/summary - Owner payment summary
 * - POST /tenants/payments/reminders - Send payment reminders
 *
 * Extracted from TenantsController to maintain <300 line limit per CLAUDE.md
 */

import {
	Body,
	Controller,
	DefaultValuePipe,
	Get,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Query,
	Request,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import type {
	OwnerPaymentSummaryResponse,
	TenantPaymentHistoryResponse
} from '@repo/shared/types/api-contracts'
import { TenantQueryService } from './tenant-query.service'
import { TenantPaymentService } from './tenant-payment.service'

@ApiTags('Tenant Payments')
@ApiBearerAuth('supabase-auth')
@Controller('tenants')
export class TenantPaymentController {
	constructor(
		private readonly queryService: TenantQueryService,
		private readonly paymentService: TenantPaymentService
	) {}

	/**
	 * GET /tenants/me/payments
	 * Get payment history for the currently authenticated tenant
	 * Used by tenant portal
	 */
	@ApiOperation({ summary: 'Get my payments', description: 'Get payment history for the currently authenticated tenant' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (1-100)' })
	@ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('me/payments')
	async getMyPayments(
		@Request() req: AuthenticatedRequest,
		@Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number
	): Promise<TenantPaymentHistoryResponse> {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const user_id = req.user.id
		const normalizedLimit = Math.min(Math.max(limit ?? 20, 1), 100)

		// Get the tenant for this user first
		const tenant = await this.queryService.getTenantByAuthUserId(user_id, token)
		const payments = await this.queryService.getTenantPaymentHistory(
			tenant.id,
			normalizedLimit
		)
		return { payments } as unknown as TenantPaymentHistoryResponse
	}

	/**
	 * GET /tenants/payments/summary
	 * Get payment summary for property owner
	 * Returns aggregate stats across all owned properties
	 */
	@ApiOperation({ summary: 'Get payment summary', description: 'Get aggregate payment summary for property owner' })
	@ApiResponse({ status: 200, description: 'Payment summary retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('payments/summary')
	async getPaymentSummary(
		@Request() req: AuthenticatedRequest
	): Promise<OwnerPaymentSummaryResponse> {
		// Defensive: Return empty response if no auth (e.g., SSR hydration)
		if (!req.user?.id) {
			return { lateFeeTotal: 0, unpaidTotal: 0, unpaidCount: 0, tenantCount: 0 }
		}
		return this.paymentService.getOwnerPaymentSummary(req.user.id)
	}

	/**
	 * GET /tenants/:id/payments
	 * Get payment history for a specific tenant
	 * Used by property owners viewing tenant details
	 */
	@ApiOperation({ summary: 'Get tenant payments', description: 'Get payment history for a specific tenant' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Tenant ID' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (1-100)' })
	@ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get(':id/payments')
	async getPayments(
		@Param('id', ParseUUIDPipe) id: string,
		@Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number
	): Promise<TenantPaymentHistoryResponse> {
		const normalizedLimit = Math.min(Math.max(limit ?? 20, 1), 100)
		const payments = await this.queryService.getTenantPaymentHistory(
			id,
			normalizedLimit
		)
		return { payments } as unknown as TenantPaymentHistoryResponse
	}

	/**
	 * POST /tenants/payments/reminders
	 * Send payment reminder to a tenant
	 */
	@ApiOperation({ summary: 'Send payment reminder', description: 'Send payment reminder to a tenant' })
	@ApiBody({ schema: { type: 'object', properties: { tenant_id: { type: 'string', format: 'uuid' }, note: { type: 'string' } }, required: ['tenant_id'] } })
	@ApiResponse({ status: 200, description: 'Reminder sent successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@Post('payments/reminders')
	async sendPaymentReminder(
		@Request() req: AuthenticatedRequest,
		@Body() body: { tenant_id: string; note?: string }
	) {
		const user_id = req.user.id
		return this.paymentService.sendPaymentReminder(
			user_id,
			body.tenant_id,
			body.note
		)
	}
}
