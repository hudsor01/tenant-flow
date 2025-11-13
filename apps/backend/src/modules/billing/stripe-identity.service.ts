import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException
} from '@nestjs/common'
import type Stripe from 'stripe'
import type { Json } from '@repo/shared/types/supabase-generated'
import type {
	IdentityVerificationRecord,
	IdentityVerificationSessionPayload,
	IdentityVerificationStatus
} from '@repo/shared/types/identity'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import { UsersService } from '../users/users.service'

@Injectable()
export class StripeIdentityService {
	private readonly logger = new Logger(StripeIdentityService.name)
	private readonly stripe: Stripe

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeClientService: StripeClientService,
		private readonly usersService: UsersService
	) {
		this.stripe = this.stripeClientService.getClient()
	}

	/**
	 * Creates or reuses a Stripe Identity verification session.
	 */
	async createVerificationSession(
		userId: string
	): Promise<IdentityVerificationSessionPayload> {
		const user = await this.usersService.getUserById(userId)

		if (!user) {
			throw new NotFoundException('User not found')
		}

		if (user.identityverificationstatus === 'verified') {
			throw new BadRequestException('Identity already verified')
		}

		if (user.identityverificationsessionid) {
			const reused = await this.tryReuseSession(
				userId,
				user.identityverificationsessionid
			)
			if (reused) {
				return reused
			}
		}

		const session = await this.stripe.identity.verificationSessions.create({
			type: 'document',
			metadata: {
				user_id: userId
			}
		})

		if (!session.client_secret) {
			this.logger.error('Stripe Identity session missing client_secret', {
				sessionId: session.id
			})
			throw new InternalServerErrorException(
				'Failed to create verification session'
			)
		}

		await this.persistSession(userId, session)

		return this.buildPayload(session)
	}

	/**
	 * Returns the latest identity verification record for a user.
	 */
	async getIdentityStatus(userId: string): Promise<IdentityVerificationRecord> {
		const user = await this.usersService.getUserById(userId)

		if (!user) {
			throw new NotFoundException('User not found')
		}

		return this.mapUserToRecord(user)
	}

	/**
	 * Handles Stripe Identity webhook events.
	 */
	async handleVerificationSessionEvent(
		session: Stripe.Identity.VerificationSession
	): Promise<void> {
		const userId = await this.resolveUserIdFromSession(session)

		if (!userId) {
			this.logger.warn(
				'Identity webhook received without user_id metadata, skipping',
				{
					sessionId: session.id
				}
			)
			return
		}

		await this.persistSession(userId, session)
	}

	private async tryReuseSession(
		userId: string,
		sessionId: string
	): Promise<IdentityVerificationSessionPayload | null> {
		try {
			const session = await this.stripe.identity.verificationSessions.retrieve(
				sessionId
			)

			if (session.status === 'canceled' || session.status === 'verified') {
				return null
			}

			if (!session.client_secret) {
				return null
			}

			await this.persistSession(userId, session)
			return this.buildPayload(session)
		} catch (error) {
			this.logger.warn('Unable to reuse verification session', {
				error:
					error instanceof Error ? error.message : 'unknown',
				sessionId
			})
			return null
		}
	}

	private buildPayload(session: Stripe.Identity.VerificationSession) {
		return {
			clientSecret: session.client_secret!,
			sessionId: session.id,
			status: this.coerceStatus(session.status)
		} satisfies IdentityVerificationSessionPayload
	}

	private coerceStatus(status: string): IdentityVerificationStatus {
		return status as IdentityVerificationStatus
	}

	private mapUserToRecord(
		user: Database['public']['Tables']['users']['Row']
	): IdentityVerificationRecord {
		return {
			sessionId: user.identityverificationsessionid ?? null,
			status: user.identityverificationstatus ?? null,
			verifiedAt: user.identityverifiedat ?? null,
			lastError: user.identityverificationerror ?? null,
			data: user.identityverificationdata ?? null
		}
	}

	private async persistSession(
		userId: string,
		session: Stripe.Identity.VerificationSession
	) {
		await this.usersService.updateUser(userId, {
			identityverificationsessionid: session.id,
			identityverificationstatus: this.coerceStatus(session.status),
			identityverificationdata: this.sanitizeSession(session),
			identityverificationerror:
				session.last_error?.reason ?? null,
			identityverifiedat:
				session.status === 'verified'
					? new Date().toISOString()
					: null
		})
	}

	private sanitizeSession(session: Stripe.Identity.VerificationSession): Json {
		// Create a deep clone and remove sensitive data
		const sessionData = JSON.parse(JSON.stringify(session))
		if ('client_secret' in sessionData) {
			delete sessionData.client_secret
		}
		return sessionData
	}

	private async resolveUserIdFromSession(
		session: Stripe.Identity.VerificationSession
	): Promise<string | null> {
		const metadataUser =
			typeof session.metadata?.user_id === 'string'
				? session.metadata.user_id
				: typeof session.metadata?.userId === 'string'
				? session.metadata.userId
				: undefined

		if (metadataUser) {
			return metadataUser
		}

		const { data } = await this.supabase
			.getAdminClient()
			.from('users')
			.select('id')
			.eq('identityVerificationSessionId', session.id)
			.single()

		return data?.id ?? null
	}
}
