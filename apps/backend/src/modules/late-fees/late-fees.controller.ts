/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS

 * ONLY built-in NestJS pipes, native exceptions, direct service calls.
 * FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import {
	BadRequestException,
	Body,
	Controller,
	Param,
	ParseUUIDPipe,
	Post,
	Req
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { SupabaseService } from '../../database/supabase.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LateFeesService } from './late-fees.service'
import { AppLogger } from '../../logger/app-logger.service'

@ApiTags('Late Fees')
@ApiBearerAuth('supabase-auth')
@Controller('late-fees')
export class LateFeesController {
	constructor(
		private readonly lateFeesService: LateFeesService,
		private readonly supabaseService: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Helper method to verify lease ownership via unit ownership
	 */
	private async verifyLeaseOwnership(
		lease_id: string,
		user_id: string,
		token: string
	): Promise<boolean> {
		const client = this.supabaseService!.getUserClient(token)

		const { data, error } = await client
			.from('leases')
			.select(
				`
				id,
				unit:units!leases_unit_id_fkey(
					property:property_id(owner_user_id)
				)
				`
			)
			.eq('id', lease_id)
			.maybeSingle()

		if (error) {
			this.logger.warn('Failed to verify lease ownership', {
				user_id,
				lease_id,
				error: error.message
			})
			return false
		}

		const ownerUserId = data?.unit?.property?.owner_user_id
		return Boolean(ownerUserId && ownerUserId === user_id)
	}

	/**
	 * Get late fee configuration for a lease
	 * SECURITY: Requires authentication via JwtAuthGuard (global)
	 * SECURITY: Verifies lease ownership before returning config
	 */
	async getConfig(
		@Req() req: AuthenticatedRequest,
		@Param('lease_id', ParseUUIDPipe) lease_id: string
	) {
		// SECURITY FIX #1: Explicit auth check (defense in depth)
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const user_id = req.user.id

		// SECURITY FIX #2: Extract JWT token from request for RLS
		const token = this.supabaseService!.getTokenFromRequest(req)
		if (!token) {
			throw new BadRequestException('JWT token not found')
		}

		this.logger.log('Getting late fee config', { lease_id, user_id })

		// SECURITY FIX #1: Verify lease ownership via unit → property ownership chain
		const hasAccess = await this.verifyLeaseOwnership(lease_id, user_id, token)
		if (!hasAccess) {
			throw new BadRequestException('Lease not found or access denied')
		}

		const config = await this.lateFeesService.getLateFeeConfig(lease_id, token)

		return {
			success: true,
			data: config
		}
	}

	/**
	 * Update late fee configuration for a lease
	 */
	async updateConfig(
		@Req() req: AuthenticatedRequest,
		@Param('lease_id', ParseUUIDPipe) lease_id: string,
		@Body('gracePeriodDays') gracePeriodDays?: number,
		@Body('flatFeeAmount') flatFeeAmount?: number
	) {
		// SECURITY FIX #1: Explicit auth check (defense in depth)
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const user_id = req.user.id

		// SECURITY FIX #2: Extract JWT token from request for RLS
		const token = this.supabaseService!.getTokenFromRequest(req)
		if (!token) {
			throw new BadRequestException('JWT token not found')
		}

		// SECURITY FIX #1: Verify lease ownership via unit → property ownership chain
		const hasAccess = await this.verifyLeaseOwnership(lease_id, user_id, token)
		if (!hasAccess) {
			throw new BadRequestException('Lease not found or access denied')
		}

		// Validate inputs
		if (
			gracePeriodDays !== undefined &&
			(gracePeriodDays < 0 || gracePeriodDays > 30)
		) {
			throw new BadRequestException(
				'Grace period must be between 0 and 30 days'
			)
		}

		if (
			flatFeeAmount !== undefined &&
			(flatFeeAmount < 0 || flatFeeAmount > 500)
		) {
			throw new BadRequestException(
				'Flat fee amount must be between $0 and $500'
			)
		}

		this.logger.log('Updating late fee config', {
			lease_id,
			user_id,
			gracePeriodDays,
			flatFeeAmount
		})

		// Build payload excluding undefined properties so optional fields are omitted
		const updatePayload: Record<string, unknown> = { lease_id }
		if (gracePeriodDays !== undefined) {
			updatePayload.gracePeriodDays = gracePeriodDays
		}
		if (flatFeeAmount !== undefined) {
			updatePayload.flatFeeAmount = flatFeeAmount
		}

		await this.lateFeesService.updateLateFeeConfig(
			lease_id,
			token,
			updatePayload
		)

		return {
			success: true,
			message: 'Late fee configuration updated successfully'
		}
	}

	/**
	 * Calculate late fee for a specific payment
	 */
	@ApiOperation({ summary: 'Calculate late fee', description: 'Calculate late fee for a specific payment based on rent amount and days late' })
	@ApiBody({ schema: { type: 'object', required: ['rent_amount', 'daysLate'], properties: { rent_amount: { type: 'number', description: 'Rent amount in dollars' }, daysLate: { type: 'number', description: 'Number of days late' }, lease_id: { type: 'string', format: 'uuid', description: 'Lease UUID (optional)' } } } })
	@ApiResponse({ status: 201, description: 'Late fee calculated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input or access denied' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('calculate')
	async calculateLateFee(
		@Req() req: AuthenticatedRequest,
		@Body('rent_amount') rent_amount: number,
		@Body('daysLate') daysLate: number,
		@Body('lease_id') lease_id?: string
	) {
		// SECURITY FIX #1: Explicit auth check (defense in depth)
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const user_id = req.user.id

		// Validate inputs
		if (!rent_amount || rent_amount <= 0) {
			throw new BadRequestException('Rent amount must be positive')
		}

		if (daysLate === undefined || daysLate < 0) {
			throw new BadRequestException('Days late must be non-negative')
		}

		this.logger.log('Calculating late fee', {
			user_id,
			rent_amount,
			daysLate,
			lease_id
		})

		// SECURITY FIX #2: Extract JWT token from request for RLS
		const token = this.supabaseService!.getTokenFromRequest(req)

		// SECURITY FIX #3: Verify lease ownership if lease_id provided
		if (lease_id) {
			const hasAccess = await this.verifyLeaseOwnership(lease_id, user_id, token ?? '')
			if (!hasAccess) {
				throw new BadRequestException('Lease not found or access denied')
			}
		}

		// Get config if lease_id provided
		if (!token) {
			throw new BadRequestException('JWT token not found')
		}
		const config = lease_id
			? await this.lateFeesService.getLateFeeConfig(lease_id, token)
			: undefined

		const calculation = this.lateFeesService.calculateLateFee(
			rent_amount,
			daysLate,
			config
		)

		return {
			success: true,
			data: calculation
		}
	}

	/**
	 * Get overdue payments for a lease
	 */
	async getOverduePayments(
		@Req() req: AuthenticatedRequest,
		@Param('lease_id', ParseUUIDPipe) lease_id: string
	) {
		// SECURITY FIX #1: Explicit auth check (defense in depth)
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const user_id = req.user.id

		// SECURITY FIX #2: Extract JWT token from request for RLS
		const token = this.supabaseService!.getTokenFromRequest(req)
		if (!token) {
			throw new BadRequestException('JWT token not found')
		}

		// SECURITY FIX #3: Verify lease ownership via unit → property ownership chain
		const hasAccess = await this.verifyLeaseOwnership(lease_id, user_id, token)
		if (!hasAccess) {
			throw new BadRequestException('Lease not found or access denied')
		}

		this.logger.log('Getting overdue payments', { lease_id, user_id })

		const config = await this.lateFeesService.getLateFeeConfig(lease_id, token)
		const payments = await this.lateFeesService.getOverduePayments(
			lease_id,
			token,
			config.gracePeriodDays
		)

		return {
			success: true,
			data: {
				payments,
				gracePeriod: config.gracePeriodDays
			}
		}
	}

	/**
	 * Process late fees for all overdue payments on a lease
	 */
	async processLateFees(
		@Req() req: AuthenticatedRequest,
		@Param('lease_id', ParseUUIDPipe) lease_id: string
	) {
		// SECURITY FIX #1: Explicit auth check (defense in depth)
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const user_id = req.user.id

		// SECURITY FIX #2: Extract JWT token from request for RLS
		const token = this.supabaseService!.getTokenFromRequest(req)
		if (!token) {
			throw new BadRequestException('JWT token not found')
		}

		// SECURITY FIX #3: Verify lease ownership via unit → property ownership chain
		const hasAccess = await this.verifyLeaseOwnership(lease_id, user_id, token)
		if (!hasAccess) {
			throw new BadRequestException('Lease not found or access denied')
		}

		this.logger.log('Processing late fees', { lease_id, user_id })

		const result = await this.lateFeesService.processLateFees(
			lease_id,
			token,
			user_id
		)

		return {
			success: true,
			data: result,
			message: `Processed ${result.processed} late fee(s) totaling $${result.totalLateFees.toFixed(2)}`
		}
	}

	/**
	 * Apply late fee to specific payment
	 */
	async applyLateFee(
		@Req() req: AuthenticatedRequest,
		@Param('paymentId', ParseUUIDPipe) paymentId: string,
		@Body('late_fee_amount') late_fee_amount: number,
		@Body('reason') reason: string
	) {
		// SECURITY FIX #1: Explicit auth check (defense in depth)
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const user_id = req.user.id

		// SECURITY FIX #2: Extract JWT token from request for RLS
		const token = this.supabaseService!.getTokenFromRequest(req)
		if (!token) {
			throw new BadRequestException('JWT token not found')
		}

		// Validate inputs
		if (!late_fee_amount || late_fee_amount <= 0) {
			throw new BadRequestException('Late fee amount must be positive')
		}

		if (!reason || reason.trim().length === 0) {
			throw new BadRequestException('Reason is required')
		}

		this.logger.log('Applying late fee to payment', {
			paymentId,
			user_id,
			late_fee_amount,
			reason
		})

		// RLS SECURITY: Use user-scoped client to get payment details
		const client = this.supabaseService!.getUserClient(token)
		const { data: payment, error } = await client
			.from('rent_payments')
			.select('id, lease_id, stripe_payment_intent_id')
			.eq('id', paymentId)
			.single()

		if (error || !payment) {
			throw new BadRequestException('Payment not found')
		}

		// RLS SECURITY: Use user-scoped client to get user Stripe customer ID
		const { data: userData, error: userError } = await client
			.from('users')
			.select('stripe_customer_id')
			.eq('id', user_id)
			.single()

		if (userError || !userData?.stripe_customer_id) {
			throw new BadRequestException('User Stripe customer not found')
		}

		const invoiceItem = await this.lateFeesService.applyLateFeeToInvoice(
			userData.stripe_customer_id,
			payment.lease_id,
			paymentId,
			late_fee_amount,
			reason,
			token
		)

		if (!invoiceItem) {
			throw new BadRequestException('Late fee was already applied to this payment')
		}

		return {
			success: true,
			data: {
				invoiceItemId: invoiceItem.id,
				amount: invoiceItem.amount / 100,
				paymentId
			},
			message: 'Late fee applied successfully'
		}
	}
}
