/**
 * DocuSeal Webhook Service
 *
 * Handles business logic for DocuSeal signature events:
 * - form.completed: Individual submitter has signed
 * - submission.completed: All parties have signed
 *
 * Updates lease status and emits events for further processing.
 *
 * Note: This service works with the existing leases schema.
 * DocuSeal submission tracking is done via the documents table.
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
	 *
	 * Uses metadata.lease_id from the DocuSeal submission to find the lease.
	 * Emits events for signature tracking without requiring new DB columns.
	 */
	async handleFormCompleted(data: FormCompletedPayload): Promise<void> {
		this.logger.log('Processing form.completed event', {
			submitterId: data.id,
			submissionId: data.submission_id,
			role: data.role,
			email: data.email
		})

		// Get lease_id from metadata (set when creating the submission)
		const leaseId = data.metadata?.lease_id
		if (!leaseId) {
			this.logger.warn('No lease_id in metadata, skipping form.completed', {
				submissionId: data.submission_id
			})
			return
		}

		const client = this.supabase.getAdminClient()

		// Verify lease exists
		const { data: lease, error } = await client
			.from('leases')
			.select('id, lease_status')
			.eq('id', leaseId)
			.single()

		if (error) {
			this.logger.error('Database error querying lease', {
				leaseId,
				error: error.message
			})
			throw new InternalServerErrorException(`Database error: ${error.message}`)
		}

		if (!lease) {
			this.logger.warn('Lease not found', { leaseId })
			return
		}

		// Determine which party signed based on role
		const isOwner = data.role.toLowerCase().includes('owner')
		const isTenant = data.role.toLowerCase().includes('tenant')
		const signedAt = data.completed_at || new Date().toISOString()

		if (isOwner) {
			this.eventEmitter.emit('lease.owner_signed', {
				lease_id: lease.id,
				signed_at: signedAt,
				email: data.email,
				via: 'docuseal'
			})
			this.logger.log('Owner signature recorded via DocuSeal', { leaseId: lease.id })
		} else if (isTenant) {
			this.eventEmitter.emit('lease.tenant_signed', {
				lease_id: lease.id,
				signed_at: signedAt,
				email: data.email,
				via: 'docuseal'
			})
			this.logger.log('Tenant signature recorded via DocuSeal', { leaseId: lease.id })
		}
	}

	/**
	 * Handle submission.completed event - all parties have signed
	 *
	 * This indicates the lease is fully executed and can be activated.
	 */
	async handleSubmissionCompleted(data: SubmissionCompletedPayload): Promise<void> {
		this.logger.log('Processing submission.completed event', {
			submissionId: data.id,
			status: data.status,
			documentCount: data.documents?.length || 0
		})

		// Get lease_id from metadata
		const leaseId = data.metadata?.lease_id
		if (!leaseId) {
			this.logger.warn('No lease_id in metadata, skipping submission.completed', {
				submissionId: data.id
			})
			return
		}

		const client = this.supabase.getAdminClient()

		// Verify lease exists
		const { data: lease, error } = await client
			.from('leases')
			.select('id, lease_status')
			.eq('id', leaseId)
			.single()

		if (error) {
			this.logger.error('Database error querying lease', {
				leaseId,
				error: error.message
			})
			throw new InternalServerErrorException(`Database error: ${error.message}`)
		}

		if (!lease) {
			this.logger.warn('Lease not found', { leaseId })
			return
		}

		// Get signed document URL if available
		const signedDocUrl = data.documents?.[0]?.url
		if (signedDocUrl) {
			this.logger.log('Signed document available', {
				leaseId: lease.id,
				documentUrl: signedDocUrl
			})

			// Store signed document reference
			await client.from('documents').insert({
				entity_type: 'lease',
				entity_id: lease.id,
				document_type: 'signed_lease',
				file_path: `docuseal/submission-${data.id}`,
				storage_url: signedDocUrl
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
