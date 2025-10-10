/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
 * ONLY built-in NestJS pipes, native exceptions, direct service calls.
 * FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Logger,
	Optional,
	Param,
	ParseUUIDPipe,
	Post,
	Put,
	Req
} from '@nestjs/common'
import type { Request } from 'express'
import { SupabaseService } from '../database/supabase.service'
import { LateFeesService } from './late-fees.service'

@Controller('late-fees')
export class LateFeesController {
	private readonly logger = new Logger(LateFeesController.name)

	constructor(
		@Optional() private readonly lateFeesService?: LateFeesService,
		@Optional() private readonly supabaseService?: SupabaseService
	) {}

	/**
	 * Get late fee configuration for a lease
	 */
	@Get('lease/:leaseId/config')
	async getConfig(
		@Param('leaseId', ParseUUIDPipe) leaseId: string,
		@Req() request: Request
	) {
		if (!this.lateFeesService) {
			throw new BadRequestException('Late fees service not available')
		}

		const user = this.supabaseService
			? await this.supabaseService.getUser(request)
			: null

		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		this.logger.log('Getting late fee config', { leaseId, userId: user.id })

		const config = await this.lateFeesService.getLateFeeConfig(leaseId)

		return {
			success: true,
			data: config
		}
	}

	/**
	 * Update late fee configuration for a lease
	 */
	@Put('lease/:leaseId/config')
	async updateConfig(
		@Param('leaseId', ParseUUIDPipe) leaseId: string,
		@Req() request: Request,
		@Body('gracePeriodDays') gracePeriodDays?: number,
		@Body('flatFeeAmount') flatFeeAmount?: number
	) {
		if (!this.lateFeesService) {
			throw new BadRequestException('Late fees service not available')
		}

		const user = this.supabaseService
			? await this.supabaseService.getUser(request)
			: null

		if (!user) {
			throw new BadRequestException('User not authenticated')
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
			userId: user.id,
			gracePeriodDays,
			flatFeeAmount
		})

		await this.lateFeesService.updateLateFeeConfig(leaseId, user.id, {
			leaseId,
			gracePeriodDays,
			flatFeeAmount
		})

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
		@Body('rentAmount') rentAmount: number,
		@Body('daysLate') daysLate: number,
		@Req() request: Request,
		@Body('leaseId') leaseId?: string
	) {
		if (!this.lateFeesService) {
			throw new BadRequestException('Late fees service not available')
		}

		const user = this.supabaseService
			? await this.supabaseService.getUser(request)
			: null

		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		// Validate inputs
		if (!rentAmount || rentAmount <= 0) {
			throw new BadRequestException('Rent amount must be positive')
		}

		if (daysLate === undefined || daysLate < 0) {
			throw new BadRequestException('Days late must be non-negative')
		}

		this.logger.log('Calculating late fee', {
			userId: user.id,
			rentAmount,
			daysLate,
			leaseId
		})

		// Get config if leaseId provided
		const config = leaseId
			? await this.lateFeesService.getLateFeeConfig(leaseId)
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
	@Get('lease/:leaseId/overdue')
	async getOverduePayments(
		@Param('leaseId', ParseUUIDPipe) leaseId: string,
		@Req() request: Request
	) {
		if (!this.lateFeesService) {
			throw new BadRequestException('Late fees service not available')
		}

		const user = this.supabaseService
			? await this.supabaseService.getUser(request)
			: null

		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		this.logger.log('Getting overdue payments', { leaseId, userId: user.id })

		const config = await this.lateFeesService.getLateFeeConfig(leaseId)
		const payments = await this.lateFeesService.getOverduePayments(
			leaseId,
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
	@Post('lease/:leaseId/process')
	async processLateFees(
		@Param('leaseId', ParseUUIDPipe) leaseId: string,
		@Req() request: Request
	) {
		if (!this.lateFeesService) {
			throw new BadRequestException('Late fees service not available')
		}

		const user = this.supabaseService
			? await this.supabaseService.getUser(request)
			: null

		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		this.logger.log('Processing late fees', { leaseId, userId: user.id })

		const result = await this.lateFeesService.processLateFees(leaseId, user.id)

		return {
			success: true,
			data: result,
			message: `Processed ${result.processed} late fee(s) totaling $${result.totalLateFees.toFixed(2)}`
		}
	}

	/**
	 * Apply late fee to specific payment
	 */
	@Post('payment/:paymentId/apply')
	async applyLateFee(
		@Param('paymentId', ParseUUIDPipe) paymentId: string,
		@Body('lateFeeAmount') lateFeeAmount: number,
		@Body('reason') reason: string,
		@Req() request: Request
	) {
		if (!this.lateFeesService) {
			throw new BadRequestException('Late fees service not available')
		}

		const user = this.supabaseService
			? await this.supabaseService.getUser(request)
			: null

		if (!user) {
			throw new BadRequestException('User not authenticated')
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
			userId: user.id,
			lateFeeAmount,
			reason
		})

		// Get payment details from database
		const { data: payment, error } =
			await this.supabaseService!.getAdminClient()
				.from('rent_payment')
				.select('id, leaseId, stripePaymentIntentId')
				.eq('id', paymentId)
				.single()

		if (error || !payment) {
			throw new BadRequestException('Payment not found')
		}

		// Get Stripe customer ID from user
		const { data: userData, error: userError } =
			await this.supabaseService!.getAdminClient()
				.from('users')
				.select('stripeCustomerId')
				.eq('id', user.id)
				.single()

		if (userError || !userData?.stripeCustomerId) {
			throw new BadRequestException('User Stripe customer not found')
		}

		const invoiceItem = await this.lateFeesService.applyLateFeeToInvoice(
			userData.stripeCustomerId,
			payment.leaseId,
			paymentId,
			lateFeeAmount,
			reason
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
