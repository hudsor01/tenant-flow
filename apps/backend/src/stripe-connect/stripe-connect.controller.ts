import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	NotFoundException,
	Post,
	Request,
	UseGuards
} from '@nestjs/common'
import type { Request as ExpressRequest } from 'express'
import { JwtAuthGuard } from '../shared/auth/jwt-auth.guard'
import { SupabaseService } from '../database/supabase.service'
import { StripeConnectService } from './stripe-connect.service'
import type { IdentityVerificationRecord } from '@repo/shared/types/identity'
interface AuthenticatedRequest extends ExpressRequest {
	user?: {
		id: string
		email: string
	}
}

interface CreateConnectAccountDto {
	displayName: string
	businessName?: string
	country?: string
	entityType?: 'individual' | 'company'
}

@Controller('stripe-connect')
@UseGuards(JwtAuthGuard)
export class StripeConnectController {
	constructor(
		private readonly stripeConnectService: StripeConnectService,
		private readonly supabase: SupabaseService
	) {}

	/**
	 * POST /stripe-connect/create
	 * Create a new Stripe Connect account for the authenticated user
	 */
	@Post('create')
	@HttpCode(HttpStatus.CREATED)
	async createConnectedAccount(
		@Request() req: AuthenticatedRequest,
		@Body() body: CreateConnectAccountDto
	) {
		const userId = req.user?.id
		const email = req.user?.email

		if (!userId || !email) {
			throw new BadRequestException('User ID and email required')
		}

		if (!body.displayName) {
			throw new BadRequestException('Display name is required')
		}

		// Check if user already has a connected account
		const existing =
			await this.stripeConnectService.getUserConnectedAccount(userId)
		if (existing) {
			throw new BadRequestException('User already has a connected account')
		}

		const createParams: {
			userId: string
			email: string
			displayName: string
			businessName?: string
			country?: string
			entityType?: 'individual' | 'company'
		} = {
			userId,
			email,
			displayName: body.displayName
		}

		// Only assign optional properties if provided
		if (body.businessName !== undefined) {
			createParams.businessName = body.businessName
		}
		if (body.country !== undefined) {
			createParams.country = body.country
		}
		if (body.entityType !== undefined) {
			createParams.entityType = body.entityType
		}

		const result =
			await this.stripeConnectService.createConnectedAccount(createParams)

		return {
			success: true,
			data: result
		}
	}

	/**
	 * GET /stripe-connect/account
	 * Get the authenticated user's connected account details
	 */
	@Get('account')
	async getConnectedAccount(@Request() req: AuthenticatedRequest) {
		const userId = req.user?.id
		if (!userId) {
			throw new BadRequestException('User ID required')
		}

		const account =
			await this.stripeConnectService.getUserConnectedAccount(userId)

		if (!account) {
			throw new NotFoundException('No connected account found')
		}

		const identityVerification = await this.fetchIdentityVerificationStatus(
			userId
		)

		return {
			success: true,
			data: {
				...account,
				identityVerification
			}
		}
	}

	private async fetchIdentityVerificationStatus(
		userId: string
	): Promise<IdentityVerificationRecord> {
		const { data } = await this.supabase
			.getAdminClient()
			.from('users')
			.select(
				'identityVerificationSessionId, identityVerificationStatus, identityVerifiedAt, identityVerificationError, identityVerificationData'
			)
			.eq('id', userId)
			.single()

		return {
			sessionId: data?.identityVerificationSessionId ?? null,
			status: data?.identityVerificationStatus ?? null,
			verifiedAt: data?.identityVerifiedAt ?? null,
			lastError: data?.identityVerificationError ?? null,
			data: data?.identityVerificationData ?? null
		}
	}

	/**
	 * POST /stripe-connect/refresh-onboarding
	 * Get a fresh onboarding link for an existing account
	 */
	@Post('refresh-onboarding')
	@HttpCode(HttpStatus.OK)
	async refreshOnboarding(@Request() req: AuthenticatedRequest) {
		const userId = req.user?.id
		if (!userId) {
			throw new BadRequestException('User ID required')
		}

		const account =
			await this.stripeConnectService.getUserConnectedAccount(userId)

		if (!account) {
			throw new NotFoundException('No connected account found')
		}

		const onboardingUrl = await this.stripeConnectService.createAccountLink(
			account.stripeAccountId
		)

		return {
			success: true,
			data: {
				onboardingUrl
			}
		}
	}
}
