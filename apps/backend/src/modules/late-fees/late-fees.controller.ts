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
	Logger,
	Param,
	ParseUUIDPipe,
	Post,
	Req
} from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LateFeesService } from './late-fees.service'

@Controller('late-fees')
export class LateFeesController {
	private readonly logger = new Logger(LateFeesController.name)

	constructor(
		private readonly lateFeesService: LateFeesService,
		private readonly supabaseService: SupabaseService
	) {}

	/**
	 * Helper method to verify lease ownership via unit ownership
	 */
	private async verifyLeaseOwnership(
		leaseId: string,
		userId: string
	): Promise<boolean> {
		const client = this.supabaseService!.getAdminClient()

		// Get lease with unitId
		const { data: lease } = await client
			.from('lease')
			.select('unitId')
			.eq('id', leaseId)
			.single()

		if (!lease?.unitId) return false

		// Get unit with propertyId
		const { data: unit } = await client
			.from('unit')
			.select('propertyId')
			.eq('id', lease.unitId)
			.single()

		if (!unit?.propertyId) return false

		// Verify property ownership
		const { data: property } = await client
			.from('property')
			.select('id')
			.eq('id', unit.propertyId)
			.eq('ownerId', userId)
			.single()

		return !!property
	}

	/**
	 * Get late fee configuration for a lease
	 * SECURITY: Requires authentication via JwtAuthGuard (global)
	 * SECURITY: Verifies lease ownership before returning config
	 */
	async getConfig(
		@Req() req: AuthenticatedRequest,
		@Param('leaseId', ParseUUIDPipe) leaseId: string
	) {
		// SECURITY FIX #1: Explicit auth check (defense in depth)
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const userId = req.user.id

		// SECURITY FIX #2: Extract JWT token from request for RLS
		const token = this.supabaseService!.getTokenFromRequest(req)
		if (!token) {
			throw new BadRequestException('JWT token not found')
		}

		this.logger.log('Getting late fee config', { leaseId, userId })

		// SECURITY FIX #1: Verify lease ownership via unit → property ownership chain
		const hasAccess = await this.verifyLeaseOwnership(leaseId, userId)
		if (!hasAccess) {
			throw new BadRequestException('Lease not found or access denied')
		}

		const config = await this.lateFeesService.getLateFeeConfig(leaseId, token)

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
		@Param('leaseId', ParseUUIDPipe) leaseId: string,
		@Body('gracePeriodDays') gracePeriodDays?: number,
		@Body('flatFeeAmount') flatFeeAmount?: number
	) {
		// SECURITY FIX #1: Explicit auth check (defense in depth)
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const userId = req.user.id

		// SECURITY FIX #2: Extract JWT token from request for RLS
		const token = this.supabaseService!.getTokenFromRequest(req)
		if (!token) {
			throw new BadRequestException('JWT token not found')
		}

		// SECURITY FIX #1: Verify lease ownership via unit → property ownership chain
		const hasAccess = await this.verifyLeaseOwnership(leaseId, userId)
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
			leaseId,
			userId,
			gracePeriodDays,
			flatFeeAmount
		})

		// Build payload excluding undefined properties so optional fields are omitted
		const updatePayload: Record<string, unknown> = { leaseId }
		if (gracePeriodDays !== undefined) {
			updatePayload.gracePeriodDays = gracePeriodDays
		}
		if (flatFeeAmount !== undefined) {
			updatePayload.flatFeeAmount = flatFeeAmount
		}

		await this.lateFeesService.updateLateFeeConfig(
			leaseId,
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
	@Post('calculate')
	async calculateLateFee(
		@Req() req: AuthenticatedRequest,
		@Body('rentAmount') rentAmount: number,
		@Body('daysLate') daysLate: number,
		@Body('leaseId') leaseId?: string
	) {
// SECURITY FIX #1: Explicit auth check (defense in depth)
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const userId = req.user.id

		// Validate inputs
		if (!rentAmount || rentAmount <= 0) {
			throw new BadRequestException('Rent amount must be positive')
		}

		if (daysLate === undefined || daysLate < 0) {
			throw new BadRequestException('Days late must be non-negative')
		}

		this.logger.log('Calculating late fee', {
			userId,
			rentAmount,
			daysLate,
			leaseId
		})

		// SECURITY FIX #3: Verify lease ownership if leaseId provided
		if (leaseId) {
			const hasAccess = await this.verifyLeaseOwnership(leaseId, userId)
			if (!hasAccess) {
				throw new BadRequestException('Lease not found or access denied')
			}
		}

		// Get config if leaseId provided
		// SECURITY FIX #2: Extract JWT token from request for RLS
		const token = this.supabaseService!.getTokenFromRequest(req)
		if (!token) {
			throw new BadRequestException('JWT token not found')
		}
		const config = leaseId
			? await this.lateFeesService.getLateFeeConfig(leaseId, token)
			: undefined

		const calculation = this.lateFeesService.calculateLateFee(
			rentAmount,
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
		@Param('leaseId', ParseUUIDPipe) leaseId: string
	) {
		// SECURITY FIX #1: Explicit auth check (defense in depth)
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const userId = req.user.id

		// SECURITY FIX #2: Extract JWT token from request for RLS
		const token = this.supabaseService!.getTokenFromRequest(req)
		if (!token) {
			throw new BadRequestException('JWT token not found')
		}

		// SECURITY FIX #3: Verify lease ownership via unit → property ownership chain
		const hasAccess = await this.verifyLeaseOwnership(leaseId, userId)
		if (!hasAccess) {
			throw new BadRequestException('Lease not found or access denied')
		}

		this.logger.log('Getting overdue payments', { leaseId, userId })

		const config = await this.lateFeesService.getLateFeeConfig(leaseId, token)
		const payments = await this.lateFeesService.getOverduePayments(
			leaseId,
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
		@Param('leaseId', ParseUUIDPipe) leaseId: string
	) {
		// SECURITY FIX #1: Explicit auth check (defense in depth)
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const userId = req.user.id

		// SECURITY FIX #2: Extract JWT token from request for RLS
		const token = this.supabaseService!.getTokenFromRequest(req)
		if (!token) {
			throw new BadRequestException('JWT token not found')
		}

		// SECURITY FIX #3: Verify lease ownership via unit → property ownership chain
		const hasAccess = await this.verifyLeaseOwnership(leaseId, userId)
		if (!hasAccess) {
			throw new BadRequestException('Lease not found or access denied')
		}

		this.logger.log('Processing late fees', { leaseId, userId })

		const result = await this.lateFeesService.processLateFees(leaseId, token, userId)

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
		@Body('lateFeeAmount') lateFeeAmount: number,
		@Body('reason') reason: string
	) {
		// SECURITY FIX #1: Explicit auth check (defense in depth)
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const userId = req.user.id

		// SECURITY FIX #2: Extract JWT token from request for RLS
		const token = this.supabaseService!.getTokenFromRequest(req)
		if (!token) {
			throw new BadRequestException('JWT token not found')
		}

		// Validate inputs
		if (!lateFeeAmount || lateFeeAmount <= 0) {
			throw new BadRequestException('Late fee amount must be positive')
		}

		if (!reason || reason.trim().length === 0) {
			throw new BadRequestException('Reason is required')
		}

		this.logger.log('Applying late fee to payment', {
			paymentId,
			userId,
			lateFeeAmount,
			reason
		})

		// RLS SECURITY: Use user-scoped client to get payment details
		const client = this.supabaseService!.getUserClient(token)
		const { data: payment, error } =
			await client
				.from('rent_payment')
				.select('id, leaseId, stripePaymentIntentId')
				.eq('id', paymentId)
				.single()

		if (error || !payment) {
			throw new BadRequestException('Payment not found')
		}

		// RLS SECURITY: Use user-scoped client to get user Stripe customer ID
		const { data: userData, error: userError } =
			await client
				.from('users')
				.select('stripeCustomerId')
				.eq('id', userId)
				.single()

		if (userError || !userData?.stripeCustomerId) {
			throw new BadRequestException('User Stripe customer not found')
		}

		const invoiceItem = await this.lateFeesService.applyLateFeeToInvoice(
			userData.stripeCustomerId,
			payment.leaseId,
			paymentId,
			lateFeeAmount,
			reason,
			token
		)

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
