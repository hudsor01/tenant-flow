/**
 * SUPABASE AUTH WEBHOOK CONTROLLER (Phase 3.1)
 * 
 * Handles Supabase Auth webhooks for user confirmation events
 * When tenant clicks invitation link and confirms email, this endpoint is called
 * to automatically activate the tenant record.
 * 
 * ULTRA-NATIVE ARCHITECTURE:
 * - Uses built-in NestJS decorators and pipes
 * - No custom abstractions
 * - Direct service calls
 */

import {
	BadRequestException,
	Controller,
	Headers,
	Logger,
	Post,
	RawBodyRequest,
	Req,
	SetMetadata
} from '@nestjs/common'
import { Request } from 'express'
import { TenantsService } from '../tenants/tenants.service'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import { createHmac, timingSafeEqual } from 'node:crypto'

interface SupabaseAuthWebhookPayload {
	type: 'user.created' | 'user.updated' | 'user.deleted'
	table: string
	record: {
		id: string
		email: string
		email_confirmed_at?: string
		confirmed_at?: string
		raw_user_meta_data?: {
			tenantId?: string
			leaseId?: string
			propertyId?: string
			unitId?: string
			firstName?: string
			lastName?: string
			[key: string]: unknown
		}
	}
	schema: string
	old_record: null | Record<string, unknown>
}

@Controller('webhooks/auth')
export class AuthWebhookController {
	private readonly logger = new Logger(AuthWebhookController.name)
	private readonly supabase

	constructor(private readonly tenantsService: TenantsService) {
		// Initialize Supabase client for webhook log writes
		this.supabase = createClient<Database>(
			process.env.SUPABASE_URL!,
			process.env.SUPABASE_SECRET_KEY!,
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false
				}
			}
		)
	}

	/**
	 * Verify Standard Webhooks signature using native Node.js crypto
	 * Implements https://www.standardwebhooks.com/ specification
	 * 
	 * @param rawBody - Raw request body as string
	 * @param signature - webhook-signature header (format: v1,base64signature)
	 * @param timestamp - webhook-timestamp header (UNIX timestamp)
	 * @param secret - Webhook secret (base64 encoded, without v1,whsec_ prefix)
	 */
	private verifyWebhookSignature(
		rawBody: string,
		signature: string,
		timestamp: string,
		secret: string
	): boolean {
		try {
			// Standard Webhooks signed payload format: "timestamp.body"
			const signedPayload = `${timestamp}.${rawBody}`
			
			// Compute HMAC-SHA256 signature
			const expectedSignature = createHmac('sha256', secret)
				.update(signedPayload, 'utf8')
				.digest('base64')
			
			// Extract v1 signature from header (format: "v1,signature1,v1,signature2,...")
			// Standard Webhooks spec allows multiple signatures for secret rotation
			const signatures = signature.split(',')
			const v1Signatures: string[] = []
			
			for (let i = 0; i < signatures.length; i += 2) {
				if (signatures[i] === 'v1' && signatures[i + 1]) {
					v1Signatures.push(signatures[i + 1]!) // Non-null assertion - checked in if condition
				}
			}
			
			if (v1Signatures.length === 0) {
				return false
			}
			
			// Check if any of the provided signatures match (timing-safe comparison)
			return v1Signatures.some(providedSig => {
				try {
					return timingSafeEqual(
						Buffer.from(expectedSignature, 'base64'),
						Buffer.from(providedSig, 'base64')
					)
				} catch {
					return false
				}
			})
		} catch (error) {
			this.logger.error('Signature verification failed', {
				error: error instanceof Error ? error.message : String(error)
			})
			return false
		}
	}

	/**
	 * ✅ Supabase Auth Webhook Handler
	 * Called when user confirms email (clicks invitation link)
	 * Automatically activates tenant record
	 * 
	 * PUBLIC ENDPOINT - No auth required (secured via webhook secret)
	 * SECURITY: Verifies webhook signature using Standard Webhooks spec
	 */
	@Post('user-confirmed')
	@SetMetadata('isPublic', true)
	async handleUserConfirmed(
		@Req() req: RawBodyRequest<Request>,
		@Headers('webhook-id') webhookId?: string,
		@Headers('webhook-timestamp') webhookTimestamp?: string,
		@Headers('webhook-signature') webhookSignature?: string
	) {
		const startTime = Date.now()
		let payload: SupabaseAuthWebhookPayload | undefined

		try {
			// SECURITY: Verify webhook signature
			const webhookSecret = process.env.SUPABASE_AUTH_WEBHOOK_SECRET
			
			if (!webhookSecret) {
				throw new BadRequestException('Webhook secret not configured')
			}

			if (!webhookId || !webhookTimestamp || !webhookSignature) {
				throw new BadRequestException('Missing webhook signature headers')
			}

			// Extract secret from Standard Webhooks format (v1,whsec_<base64>)
			const secret = webhookSecret.replace(/^v1,whsec_/, '')
			const rawBody = req.rawBody?.toString('utf8') || ''
			
			// At this point, webhookSignature and webhookTimestamp are guaranteed to be strings
			// (we checked for undefined above)
			const isValid = this.verifyWebhookSignature(
				rawBody,
				webhookSignature!, // Non-null assertion - checked above
				webhookTimestamp!, // Non-null assertion - checked above
				secret
			)
			
			if (!isValid) {
				this.logger.error('Webhook signature verification failed', {
					webhookId,
					timestamp: webhookTimestamp
				})
				throw new BadRequestException('Invalid webhook signature')
			}
			
			// Parse payload after verification
			try {
				payload = JSON.parse(rawBody) as SupabaseAuthWebhookPayload
			} catch (error) {
				this.logger.error('Invalid webhook payload JSON', {
					error: error instanceof Error ? error.message : String(error)
				})
				throw new BadRequestException('Invalid webhook payload')
			}

			// Payload is guaranteed to be defined after successful parse
			const confirmedPayload = payload!

			// Log webhook receipt
			this.logger.log('Received Supabase Auth webhook', {
				type: confirmedPayload.type,
				userId: confirmedPayload.record?.id,
				email: confirmedPayload.record?.email,
				hasConfirmedAt: !!confirmedPayload.record?.confirmed_at
			})

			// Validate payload structure
			if (!confirmedPayload.record?.id || !confirmedPayload.record?.email) {
				throw new BadRequestException('Invalid webhook payload: missing user ID or email')
			}

			// Check if user is confirmed
			const confirmedAt = confirmedPayload.record.confirmed_at || confirmedPayload.record.email_confirmed_at
			if (!confirmedAt) {
				this.logger.warn('User not yet confirmed, skipping activation', {
					userId: confirmedPayload.record.id,
					email: confirmedPayload.record.email
				})
				
				// Log to webhook table
				await this.logWebhookEvent(confirmedPayload, false, 'User not yet confirmed')
				
				return { 
					success: false, 
					message: 'User not yet confirmed',
					skipped: true
				}
			}

			// Extract tenant metadata
			const tenantId = confirmedPayload.record.raw_user_meta_data?.tenantId
			
			if (!tenantId) {
				this.logger.warn('No tenantId in user metadata, not a tenant invitation', {
					userId: confirmedPayload.record.id,
					email: confirmedPayload.record.email
				})
				
				// Log to webhook table
				await this.logWebhookEvent(confirmedPayload, false, 'No tenantId in metadata')
				
				return { 
					success: false, 
					message: 'Not a tenant invitation',
					skipped: true
				}
			}

			// Activate tenant
			this.logger.log('Activating tenant from auth webhook', {
				tenantId,
				authUserId: confirmedPayload.record.id,
				email: confirmedPayload.record.email
			})

			await this.tenantsService.activateTenantFromAuthUser(
				confirmedPayload.record.id
			)

			// Log success to webhook table
			await this.logWebhookEvent(confirmedPayload, true)

			const duration = Date.now() - startTime
			this.logger.log('Tenant activated successfully via webhook', {
				tenantId,
				authUserId: confirmedPayload.record.id,
				duration: `${duration}ms`
			})

			return {
				success: true,
				message: 'Tenant activated successfully',
				tenantId,
				authUserId: confirmedPayload.record.id,
				duration
			}

		} catch (error) {
			const duration = Date.now() - startTime
			const errorMessage = error instanceof Error ? error.message : String(error)
			
			this.logger.error('Failed to process auth webhook', {
				error: errorMessage,
				userId: payload?.record?.id,
				email: payload?.record?.email,
				duration: `${duration}ms`
			})

			// Log error to webhook table if payload is available
			if (payload) {
				await this.logWebhookEvent(payload, false, errorMessage)
			}

			// Don't throw - return 200 so Supabase doesn't retry
			return {
				success: false,
				error: errorMessage,
				userId: payload?.record?.id
			}
		}
	}

	/**
	 * Log webhook event to database for debugging and audit trail
	 */
	private async logWebhookEvent(
		payload: SupabaseAuthWebhookPayload,
		processed: boolean,
		error?: string
	): Promise<void> {
		try {
			await this.supabase.from('auth_webhook_log').insert({
				event_type: payload.type,
				user_id: payload.record?.id || null,
				payload: JSON.parse(JSON.stringify(payload)),
				processed,
				processed_at: processed ? new Date().toISOString() : null,
				error: error || null
			})
		} catch (logError) {
			// Log failure but don't throw - webhook processing is more important
			this.logger.error('Failed to log webhook event', {
				error: logError instanceof Error ? logError.message : String(logError)
			})
		}
	}
}
