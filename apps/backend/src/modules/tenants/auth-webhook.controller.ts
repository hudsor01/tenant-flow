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
	Body,
	Controller,
	Logger,
	Post,
	SetMetadata
} from '@nestjs/common'
import { TenantsService } from '../tenants/tenants.service'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'

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
			process.env.SERVICE_ROLE_KEY!,
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false
				}
			}
		)
	}

	/**
	 * ✅ Supabase Auth Webhook Handler
	 * Called when user confirms email (clicks invitation link)
	 * Automatically activates tenant record
	 * 
	 * PUBLIC ENDPOINT - No auth required (secured via webhook secret)
	 */
	@Post('user-confirmed')
	@SetMetadata('isPublic', true)
	async handleUserConfirmed(@Body() payload: SupabaseAuthWebhookPayload) {
		const startTime = Date.now()

		try {
			// Log webhook receipt
			this.logger.log('Received Supabase Auth webhook', {
				type: payload.type,
				userId: payload.record?.id,
				email: payload.record?.email,
				hasConfirmedAt: !!payload.record?.confirmed_at
			})

			// Validate payload structure
			if (!payload.record?.id || !payload.record?.email) {
				throw new BadRequestException('Invalid webhook payload: missing user ID or email')
			}

			// Check if user is confirmed
			const confirmedAt = payload.record.confirmed_at || payload.record.email_confirmed_at
			if (!confirmedAt) {
				this.logger.warn('User not yet confirmed, skipping activation', {
					userId: payload.record.id,
					email: payload.record.email
				})
				
				// Log to webhook table
				await this.logWebhookEvent(payload, false, 'User not yet confirmed')
				
				return { 
					success: false, 
					message: 'User not yet confirmed',
					skipped: true
				}
			}

			// Extract tenant metadata
			const tenantId = payload.record.raw_user_meta_data?.tenantId
			
			if (!tenantId) {
				this.logger.warn('No tenantId in user metadata, not a tenant invitation', {
					userId: payload.record.id,
					email: payload.record.email
				})
				
				// Log to webhook table
				await this.logWebhookEvent(payload, false, 'No tenantId in metadata')
				
				return { 
					success: false, 
					message: 'Not a tenant invitation',
					skipped: true
				}
			}

			// Activate tenant
			this.logger.log('Activating tenant from auth webhook', {
				tenantId,
				authUserId: payload.record.id,
				email: payload.record.email
			})

			await this.tenantsService.activateTenantFromAuthUser(
				payload.record.id
			)

			// Log success to webhook table
			await this.logWebhookEvent(payload, true)

			const duration = Date.now() - startTime
			this.logger.log('Tenant activated successfully via webhook', {
				tenantId,
				authUserId: payload.record.id,
				duration: `${duration}ms`
			})

			return {
				success: true,
				message: 'Tenant activated successfully',
				tenantId,
				authUserId: payload.record.id,
				duration
			}

		} catch (error) {
			const duration = Date.now() - startTime
			const errorMessage = error instanceof Error ? error.message : String(error)
			
			this.logger.error('Failed to process auth webhook', {
				error: errorMessage,
				userId: payload.record?.id,
				email: payload.record?.email,
				duration: `${duration}ms`
			})

			// Log error to webhook table
			await this.logWebhookEvent(payload, false, errorMessage)

			// Don't throw - return 200 so Supabase doesn't retry
			return {
				success: false,
				error: errorMessage,
				userId: payload.record?.id
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
