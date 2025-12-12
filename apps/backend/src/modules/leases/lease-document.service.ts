import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { DocuSealService } from '../docuseal/docuseal.service'
import {
	LEASE_SIGNATURE_ERROR_CODES,
	LEASE_SIGNATURE_ERROR_MESSAGES
} from '@repo/shared/constants/lease-signature-errors'

@Injectable()
export class LeaseDocumentService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly docuSealService: DocuSealService,
		private readonly eventEmitter: EventEmitter2,
		private readonly logger: AppLogger
	) {}

	async getSigningUrl(leaseId: string, userId: string): Promise<string | null> {
		const client = this.supabase.getAdminClient()

		const { data: lease, error } = await client
			.from('leases')
			.select(
				'id, docuseal_submission_id, property_owner_id, primary_tenant_id, property_owner:property_owners!leases_property_owner_id_fkey (user_id)'
			)
			.eq('id', leaseId)
			.single()

		if (error || !lease || !lease.docuseal_submission_id) {
			return null
		}

		if (!lease.property_owner_id) {
			return null
		}

		let userEmail: string | null = null
		const isOwner = lease.property_owner?.user_id === userId

		if (isOwner) {
			const { data: ownerUser } = await client
				.from('users')
				.select('email')
				.eq('id', userId)
				.single()
			userEmail = ownerUser?.email || null
		} else {
			const { data: tenant } = await client
				.from('tenants')
				.select('user_id')
				.eq('id', lease.primary_tenant_id)
				.single()

			if (tenant?.user_id === userId) {
				const { data: tenantUser } = await client
					.from('users')
					.select('email')
					.eq('id', userId)
					.single()
				userEmail = tenantUser?.email || null
			}
		}

		if (!userEmail) {
			return null
		}

		try {
			return await this.docuSealService.getSubmitterSigningUrl(
				parseInt(lease.docuseal_submission_id, 10),
				userEmail
			)
		} catch (error) {
			this.logger.error('Failed to get DocuSeal signing URL', {
				error: error instanceof Error ? error.message : String(error),
				leaseId
			})
			return null
		}
	}

	async cancelSignatureRequest(ownerId: string, leaseId: string): Promise<void> {
		const client = this.supabase.getAdminClient()

		const { data: lease, error } = await client
			.from('leases')
			.select(
				'id, lease_status, property_owner_id, docuseal_submission_id, property_owner:property_owners!leases_property_owner_id_fkey (user_id)'
			)
			.eq('id', leaseId)
			.single()

		if (error || !lease) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_FOUND
				]
			)
		}

		if (!lease.property_owner_id) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NO_OWNER
				]
			)
		}

		const isOwner = lease.property_owner?.user_id === ownerId
		if (!isOwner) {
			throw new ForbiddenException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.NOT_LEASE_OWNER
				]
			)
		}

		if (lease.lease_status !== 'pending_signature') {
			throw new BadRequestException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_PENDING_SIGNATURE
				]
			)
		}

		if (lease.docuseal_submission_id && this.docuSealService.isEnabled()) {
			try {
				await this.docuSealService.archiveSubmission(
					parseInt(lease.docuseal_submission_id, 10)
				)
				this.logger.log('Archived DocuSeal submission', {
					submissionId: lease.docuseal_submission_id,
					leaseId
				})
			} catch (error) {
				this.logger.error('Failed to archive DocuSeal submission', {
					error: error instanceof Error ? error.message : String(error),
					leaseId
				})
			}
		}

		const { error: updateError } = await client
			.from('leases')
			.update({
				lease_status: 'draft',
				sent_for_signature_at: null,
				docuseal_submission_id: null,
				owner_signed_at: null,
				owner_signature_ip: null,
				owner_signature_method: null,
				tenant_signed_at: null,
				tenant_signature_ip: null,
				tenant_signature_method: null
			})
			.eq('id', leaseId)

		if (updateError) {
			throw new BadRequestException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.CANCEL_SIGNATURE_FAILED
				]
			)
		}

		this.eventEmitter.emit('lease.signature_cancelled', {
			lease_id: leaseId
		})

		this.logger.log('Signature request cancelled', { leaseId })
	}

	async resendSignatureRequest(
		ownerId: string,
		leaseId: string,
		options?: { message?: string }
	): Promise<void> {
		const client = this.supabase.getAdminClient()

		const { data: lease, error } = await client
			.from('leases')
			.select(
				'id, lease_status, property_owner_id, docuseal_submission_id, property_owner:property_owners!leases_property_owner_id_fkey (user_id)'
			)
			.eq('id', leaseId)
			.single()

		if (error || !lease) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_FOUND
				]
			)
		}

		if (!lease.property_owner_id) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NO_OWNER
				]
			)
		}

		const isOwner = lease.property_owner?.user_id === ownerId
		if (!isOwner) {
			throw new ForbiddenException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.NOT_LEASE_OWNER
				]
			)
		}

		if (lease.lease_status !== 'pending_signature') {
			throw new BadRequestException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_PENDING_SIGNATURE
				]
			)
		}

		if (!lease.docuseal_submission_id || !this.docuSealService.isEnabled()) {
			throw new BadRequestException(
				'No DocuSeal submission found for this lease. Cannot resend.'
			)
		}

		const submission = await this.docuSealService.getSubmission(
			parseInt(lease.docuseal_submission_id, 10)
		)

		const pendingSubmitters = submission.submitters.filter(
			s => s.status === 'pending' || s.status === 'opened'
		)

		if (pendingSubmitters.length === 0) {
			throw new BadRequestException(
				'All parties have already signed. Nothing to resend.'
			)
		}

		const resendOptions: { message?: string } = {}
		if (options?.message) {
			resendOptions.message = options.message
		}

		await Promise.allSettled(
			pendingSubmitters
				.filter(submitter => submitter.id)
				.map(submitter =>
					this.docuSealService.resendToSubmitter(submitter.id!, resendOptions)
				)
		)

		this.logger.log('Resent signature request', {
			leaseId,
			submitterCount: pendingSubmitters.length
		})
	}

	async getSignedDocumentUrl(
		leaseId: string,
		userId: string
	): Promise<string | null> {
		const client = this.supabase.getAdminClient()

		const { data: lease, error } = await client
			.from('leases')
			.select(
				'id, lease_status, docuseal_submission_id, property_owner_id, primary_tenant_id, property_owner:property_owners!leases_property_owner_id_fkey (user_id)'
			)
			.eq('id', leaseId)
			.single()

		if (error || !lease) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_FOUND
				]
			)
		}

		if (!lease.property_owner_id) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NO_OWNER
				]
			)
		}
		const isOwner = lease.property_owner?.user_id === userId

		let isTenant = false
		if (!isOwner) {
			const { data: tenant } = await client
				.from('tenants')
				.select('id')
				.eq('user_id', userId)
				.eq('id', lease.primary_tenant_id)
				.single()
			isTenant = !!tenant
		}

		if (!isOwner && !isTenant) {
			throw new ForbiddenException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.NO_ACCESS_TO_LEASE
				]
			)
		}

		if (lease.lease_status !== 'active') {
			return null
		}

		if (!lease.docuseal_submission_id || !this.docuSealService.isEnabled()) {
			return null
		}

		try {
			const submission = await this.docuSealService.getSubmission(
				parseInt(lease.docuseal_submission_id, 10)
			)
			return submission.documents?.[0]?.url || null
		} catch (error) {
			this.logger.error('Failed to get signed document from DocuSeal', {
				error: error instanceof Error ? error.message : String(error),
				leaseId
			})
			return null
		}
	}
}
