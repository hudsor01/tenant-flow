import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException
} from '@nestjs/common'
import type Stripe from 'stripe'
import type { Json } from '@repo/shared/types/supabase'
import type {
	IdentityVerificationRecord,
	IdentityVerificationSessionPayload,
	IdentityVerificationStatus
} from '@repo/shared/types/identity'
import type { Database } from '@repo/shared/types/supabase'
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
		user_id: string
	): Promise<IdentityVerificationSessionPayload> {
		const user = await this.usersService.getUserById(user_id)

		if (!user) {
			throw new NotFoundException('User not found')
		}

		if (user.identity_verification_status === 'verified') {
			throw new BadRequestException('Identity already verified')
		}

		if (user.identity_verification_session_id) {
			const reused = await this.tryReuseSession(
				user_id,
				user.identity_verification_session_id
			)
			if (reused) {
				return reused
			}
		}

		const session = await this.stripe.identity.verificationSessions.create({
			type: 'document',
			metadata: {
				user_id: user_id
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

		await this.persistSession(user_id, session)

		return this.buildPayload(session)
	}

	/**
	 * Returns the latest identity verification record for a user.
	 */
	async getIdentityStatus(user_id: string): Promise<IdentityVerificationRecord> {
		const user = await this.usersService.getUserById(user_id)

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
		const user_id = await this.resolveuser_idFromSession(session)

		if (!user_id) {
			this.logger.warn(
				'Identity webhook received without user_id metadata, skipping',
				{
					sessionId: session.id
				}
			)
			return
		}

		await this.persistSession(user_id, session)
	}

	private async tryReuseSession(
		user_id: string,
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

			await this.persistSession(user_id, session)
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
			sessionId: user.identity_verification_session_id ?? null,
			status: user.identity_verification_status ?? null,
			verifiedAt: user.identity_verified_at ?? null,
			lastError: user.identity_verification_error ?? null,
			data: user.identity_verification_data ?? null
		}
	}

	private async persistSession(
		user_id: string,
		session: Stripe.Identity.VerificationSession
	) {
		await this.usersService.updateUser(user_id, {
			identity_verification_session_id: session.id,
			identity_verification_status: this.coerceStatus(session.status),
			identity_verification_data: this.sanitizeSession(session),
			identity_verification_error:
				session.last_error?.reason ?? null,
			identity_verified_at:
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

	private async resolveuser_idFromSession(
		session: Stripe.Identity.VerificationSession
	): Promise<string | null> {
		const metadataUser =
			typeof session.metadata?.user_id === 'string'
				? session.metadata.user_id
				: typeof session.metadata?.user_id === 'string'
				? session.metadata.user_id
				: undefined

		if (metadataUser) {
			return metadataUser
		}

		const { data } = await this.supabase
			.getAdminClient()
			.from('users')
			.select('id')
			.eq('identityverificationsessionid', session.id)
			.single()

		return data?.id ?? null
	}
}
