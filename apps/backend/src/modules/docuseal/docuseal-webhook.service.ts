/**
 * DocuSeal Webhook Service
 *
 * Handles business logic for DocuSeal signature events:
 * - form.completed: Individual submitter has signed
 * - submission.completed: All parties have signed
 *
 * Updates lease signature timestamps and triggers activation events.
 */

import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'

export interface FormCompletedPayload {
	id: number
	submission_id: number
	email: string
	name?: string
	role: string
	completed_at: string
	metadata?: {
		lease_id?: string
		[key: string]: string | undefined
	}
}

export interface SubmissionCompletedPayload {
	id: number
	status: string
	completed_at: string
	submitters: Array<{
		email: string
		role: string
		completed_at?: string
	}>
	documents: Array<{
		name: string
		url: string
	}>
	metadata?: {
		lease_id?: string
		[key: string]: string | undefined
	}
}

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

		// Find lease by DocuSeal submission ID
		const { data: lease, error } = await client
			.from('leases')
			.select('id, lease_status, owner_signed_at, tenant_signed_at')
			.eq('docuseal_submission_id', String(data.submission_id))
			.single()

		if (error || !lease) {
			this.logger.warn('Lease not found for DocuSeal submission', {
				submissionId: data.submission_id,
				error: error?.message
			})
			return
		}

		// Determine which party signed based on role
		const isOwner = data.role.toLowerCase().includes('owner')
		const isTenant = data.role.toLowerCase().includes('tenant')

		const signedAt = data.completed_at || new Date().toISOString()

		if (isOwner && !lease.owner_signed_at) {
			await client
				.from('leases')
				.update({
					owner_signed_at: signedAt,
					owner_signature_ip: 'docuseal' // Mark as DocuSeal signature
				})
				.eq('id', lease.id)

			this.eventEmitter.emit('lease.owner_signed', {
				lease_id: lease.id,
				signed_at: signedAt,
				via: 'docuseal'
			})

			this.logger.log('Owner signature recorded via DocuSeal', { leaseId: lease.id })
		} else if (isTenant && !lease.tenant_signed_at) {
			await client
				.from('leases')
				.update({
					tenant_signed_at: signedAt,
					tenant_signature_ip: 'docuseal' // Mark as DocuSeal signature
				})
				.eq('id', lease.id)

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

		// Find lease by DocuSeal submission ID
		const { data: lease, error } = await client
			.from('leases')
			.select('id, lease_status')
			.eq('docuseal_submission_id', String(data.id))
			.single()

		if (error || !lease) {
			this.logger.warn('Lease not found for DocuSeal submission', {
				submissionId: data.id,
				error: error?.message
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
