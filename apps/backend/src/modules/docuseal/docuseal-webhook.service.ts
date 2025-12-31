/**
 * DocuSeal Webhook Service
 *
 * Handles business logic for DocuSeal signature events:
 * - form.completed: Individual submitter has signed
 * - submission.completed: All parties have signed
 *
 * Updates lease signature timestamps and triggers activation events.
 * Broadcasts SSE events to connected clients for real-time UI updates.
 */

import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { SseService } from '../notifications/sse/sse.service'
import type { LeaseSignatureUpdatedEvent } from '@repo/shared/events/sse-events'
import { SSE_EVENT_TYPES } from '@repo/shared/events/sse-events'
import type {
	FormCompletedPayload,
	SubmissionCompletedPayload
} from '@repo/shared/validation/docuseal-webhooks'

@Injectable()
export class DocuSealWebhookService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2,
		private readonly logger: AppLogger,
		private readonly sseService: SseService
	) {}

	/**
	 * Handle form.completed event - a single submitter has signed
	 */
	async handleFormCompleted(data: FormCompletedPayload): Promise<void> {
		this.logger.log('Processing form.completed event', {
			submitterId: data.id,
			submissionId: data.submission_id,
			role: data.role,
			email: data.email
		})

		const client = this.supabase.getAdminClient()

		// Find lease by DocuSeal submission ID first, then fallback to metadata.lease_id
		let lease: {
			id: string
			lease_status: string
			owner_signed_at: string | null
			tenant_signed_at: string | null
			owner_user_id: string
			primary_tenant_id: string | null
		} | null = null

		// Try docuseal_submission_id first
		const { data: leaseBySubmission, error: submissionError } = await client
			.from('leases')
			.select(
				'id, lease_status, owner_signed_at, tenant_signed_at, owner_user_id, primary_tenant_id'
			)
			.eq('docuseal_submission_id', String(data.submission_id))
			.maybeSingle()

		if (submissionError) {
			this.logger.error('Database error querying lease by submission_id', {
				submissionId: data.submission_id,
				error: submissionError.message
			})
			throw new InternalServerErrorException(
				`Database error: ${submissionError.message}`
			)
		}

		lease = leaseBySubmission

		// Fallback to metadata.lease_id if not found
		if (!lease && data.metadata?.lease_id) {
			const { data: leaseById, error: leaseIdError } = await client
				.from('leases')
				.select(
					'id, lease_status, owner_signed_at, tenant_signed_at, owner_user_id, primary_tenant_id'
				)
				.eq('id', data.metadata.lease_id)
				.maybeSingle()

			if (leaseIdError) {
				this.logger.error(
					'Database error querying lease by metadata.lease_id',
					{
						leaseId: data.metadata.lease_id,
						error: leaseIdError.message
					}
				)
				throw new InternalServerErrorException(
					`Database error: ${leaseIdError.message}`
				)
			}

			lease = leaseById
		}

		if (!lease) {
			this.logger.warn('Lease not found for DocuSeal submission', {
				submissionId: data.submission_id,
				metadataLeaseId: data.metadata?.lease_id
			})
			return
		}

		// Determine which party signed based on role
		const isOwner = data.role.toLowerCase().includes('owner')
		const isTenant = data.role.toLowerCase().includes('tenant')

		const signedAt = data.completed_at || new Date().toISOString()

		if (isOwner && !lease.owner_signed_at) {
			const { error: updateError } = await client
				.from('leases')
				.update({
					owner_signed_at: signedAt,
					owner_signature_ip: null,
					owner_signature_method: 'docuseal'
				})
				.eq('id', lease.id)

			if (updateError) {
				this.logger.error('Failed to update owner signature', {
					leaseId: lease.id,
					error: updateError.message
				})
				throw new InternalServerErrorException(
					`Update failed: ${updateError.message}`
				)
			}

			this.eventEmitter.emit('lease.owner_signed', {
				lease_id: lease.id,
				signed_at: signedAt,
				via: 'docuseal'
			})

			// Broadcast SSE event to owner for real-time UI update
			await this.broadcastSignatureUpdate(lease, 'owner', signedAt)

			this.logger.log('Owner signature recorded via DocuSeal', {
				leaseId: lease.id
			})
		} else if (isTenant && !lease.tenant_signed_at) {
			const { error: updateError } = await client
				.from('leases')
				.update({
					tenant_signed_at: signedAt,
					tenant_signature_ip: null,
					tenant_signature_method: 'docuseal'
				})
				.eq('id', lease.id)

			if (updateError) {
				this.logger.error('Failed to update tenant signature', {
					leaseId: lease.id,
					error: updateError.message
				})
				throw new InternalServerErrorException(
					`Update failed: ${updateError.message}`
				)
			}

			this.eventEmitter.emit('lease.tenant_signed', {
				lease_id: lease.id,
				signed_at: signedAt,
				via: 'docuseal'
			})

			// Broadcast SSE event to owner (and tenant if they're a platform user)
			await this.broadcastSignatureUpdate(lease, 'tenant', signedAt)

			this.logger.log('Tenant signature recorded via DocuSeal', {
				leaseId: lease.id
			})
		}
	}

	/**
	 * Broadcast SSE signature update event to relevant parties
	 */
	private async broadcastSignatureUpdate(
		lease: {
			id: string
			owner_signed_at: string | null
			tenant_signed_at: string | null
			owner_user_id: string
			primary_tenant_id: string | null
		},
		signedBy: 'owner' | 'tenant',
		signedAt: string
	): Promise<void> {
		// Determine current signature status
		const ownerSigned = signedBy === 'owner' || lease.owner_signed_at !== null
		const tenantSigned =
			signedBy === 'tenant' || lease.tenant_signed_at !== null

		let status: LeaseSignatureUpdatedEvent['payload']['status']
		if (ownerSigned && tenantSigned) {
			status = 'fully_signed'
		} else if (ownerSigned) {
			status = 'owner_signed'
		} else if (tenantSigned) {
			status = 'tenant_signed'
		} else {
			status = 'pending'
		}

		const sseEvent: LeaseSignatureUpdatedEvent = {
			type: SSE_EVENT_TYPES.LEASE_SIGNATURE_UPDATED,
			timestamp: new Date().toISOString(),
			payload: {
				leaseId: lease.id,
				signedBy,
				status,
				signedAt
			}
		}

		// Always broadcast to owner
		await this.sseService.broadcast(lease.owner_user_id, sseEvent)

		// Also broadcast to tenant if they're a platform user
		if (lease.primary_tenant_id) {
			await this.sseService.broadcast(lease.primary_tenant_id, sseEvent)
		}

		this.logger.debug('SSE signature update broadcast', {
			leaseId: lease.id,
			signedBy,
			status,
			ownerUserId: lease.owner_user_id,
			tenantUserId: lease.primary_tenant_id
		})
	}

	/**
	 * Handle submission.completed event - all parties have signed
	 */
	async handleSubmissionCompleted(
		data: SubmissionCompletedPayload
	): Promise<void> {
		this.logger.log('Processing submission.completed event', {
			submissionId: data.id,
			status: data.status,
			documentCount: data.documents?.length || 0
		})

		const client = this.supabase.getAdminClient()

		// Find lease by DocuSeal submission ID first, then fallback to metadata.lease_id
		let lease: { id: string; lease_status: string } | null = null

		// Try docuseal_submission_id first
		const { data: leaseBySubmission, error: submissionError } = await client
			.from('leases')
			.select('id, lease_status')
			.eq('docuseal_submission_id', String(data.id))
			.maybeSingle()

		if (submissionError) {
			this.logger.error('Database error querying lease by submission_id', {
				submissionId: data.id,
				error: submissionError.message
			})
			throw new InternalServerErrorException(
				`Database error: ${submissionError.message}`
			)
		}

		lease = leaseBySubmission

		// Fallback to metadata.lease_id if not found
		if (!lease && data.metadata?.lease_id) {
			const { data: leaseById, error: leaseIdError } = await client
				.from('leases')
				.select('id, lease_status')
				.eq('id', data.metadata.lease_id)
				.maybeSingle()

			if (leaseIdError) {
				this.logger.error(
					'Database error querying lease by metadata.lease_id',
					{
						leaseId: data.metadata.lease_id,
						error: leaseIdError.message
					}
				)
				throw new InternalServerErrorException(
					`Database error: ${leaseIdError.message}`
				)
			}

			lease = leaseById
		}

		if (!lease) {
			this.logger.warn('Lease not found for DocuSeal submission', {
				submissionId: data.id,
				metadataLeaseId: data.metadata?.lease_id
			})
			return
		}

		// Get signed document URL if available
		const signedDocUrl = data.documents?.[0]?.url
		if (signedDocUrl) {
			this.logger.log('Signed document available', {
				leaseId: lease.id,
				documentUrl: signedDocUrl
			})
		}

		// Emit event for lease activation handler
		// The activation with Stripe subscription happens in the event listener
		this.eventEmitter.emit('docuseal.submission_completed', {
			lease_id: lease.id,
			submission_id: data.id,
			document_url: signedDocUrl,
			completed_at: data.completed_at
		})

		this.logger.log('DocuSeal submission completed event emitted', {
			leaseId: lease.id
		})
	}
}
