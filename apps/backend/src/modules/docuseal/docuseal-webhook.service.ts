/**
 * DocuSeal Webhook Service
 *
 * Handles business logic for DocuSeal signature events:
 * - form.completed: Individual submitter has signed
 * - submission.completed: All parties have signed
 *
 * Updates lease signature timestamps and triggers activation events.
 */

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import type {
	FormCompletedPayload,
	SubmissionCompletedPayload
} from '@repo/shared/validation/docuseal-webhooks'

@Injectable()
export class DocuSealWebhookService {
	private readonly logger = new Logger(DocuSealWebhookService.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2
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
		let lease: { id: string; lease_status: string; owner_signed_at: string | null; tenant_signed_at: string | null } | null = null

		// Try docuseal_submission_id first
		const { data: leaseBySubmission, error: submissionError } = await client
			.from('leases')
			.select('id, lease_status, owner_signed_at, tenant_signed_at')
			.eq('docuseal_submission_id', String(data.submission_id))
			.maybeSingle()

		if (submissionError) {
			this.logger.error('Database error querying lease by submission_id', {
				submissionId: data.submission_id,
				error: submissionError.message
			})
			throw new InternalServerErrorException(`Database error: ${submissionError.message}`)
		}

		lease = leaseBySubmission

		// Fallback to metadata.lease_id if not found
		if (!lease && data.metadata?.lease_id) {
			const { data: leaseById, error: leaseIdError } = await client
				.from('leases')
				.select('id, lease_status, owner_signed_at, tenant_signed_at')
				.eq('id', data.metadata.lease_id)
				.maybeSingle()

			if (leaseIdError) {
				this.logger.error('Database error querying lease by metadata.lease_id', {
					leaseId: data.metadata.lease_id,
					error: leaseIdError.message
				})
				throw new InternalServerErrorException(`Database error: ${leaseIdError.message}`)
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
				throw new InternalServerErrorException(`Update failed: ${updateError.message}`)
			}

			this.eventEmitter.emit('lease.owner_signed', {
				lease_id: lease.id,
				signed_at: signedAt,
				via: 'docuseal'
			})

			this.logger.log('Owner signature recorded via DocuSeal', { leaseId: lease.id })
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
				throw new InternalServerErrorException(`Update failed: ${updateError.message}`)
			}

			this.eventEmitter.emit('lease.tenant_signed', {
				lease_id: lease.id,
				signed_at: signedAt,
				via: 'docuseal'
			})

			this.logger.log('Tenant signature recorded via DocuSeal', { leaseId: lease.id })
		}
	}

	/**
	 * Handle submission.completed event - all parties have signed
	 */
	async handleSubmissionCompleted(data: SubmissionCompletedPayload): Promise<void> {
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
			throw new InternalServerErrorException(`Database error: ${submissionError.message}`)
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
				this.logger.error('Database error querying lease by metadata.lease_id', {
					leaseId: data.metadata.lease_id,
					error: leaseIdError.message
				})
				throw new InternalServerErrorException(`Database error: ${leaseIdError.message}`)
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

		this.logger.log('DocuSeal submission completed event emitted', { leaseId: lease.id })
	}
}
