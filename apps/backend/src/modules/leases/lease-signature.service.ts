/**
 * LeaseSignatureService
 *
 * Handles the lease signature workflow:
 * 1. Owner creates lease draft (status: 'draft')
 * 2. Owner sends lease for signature (status: 'pending_signature')
 * 3. Tenant signs the lease
 * 4. Owner signs the lease (can be before or after tenant)
 * 5. When BOTH signed: delegates activation to LeaseSubscriptionService
 *
 * Key principle: NO Stripe billing until BOTH parties have signed.
 *
 * RESPONSIBILITY: Signature workflow only - delegates subscription creation
 * to LeaseSubscriptionService (SRP compliance).
 *
 * PERF-001: FIXED - signLeaseAsTenant() uses Promise.all() for parallel fetching.
 *
 * SEC-001: REVIEWED - getAdminClient() usage is INTENTIONAL for cross-user operations.
 * Authorization is enforced via ensureLeaseOwner/ensureLeaseStatus checks before writes.
 * Tenant signing owner's lease requires RLS bypass with explicit authz validation.
 */

import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { DocuSealService } from '../docuseal/docuseal.service'
import { LeaseSubscriptionService } from './lease-subscription.service'
import {
	LEASE_SIGNATURE_ERROR_MESSAGES,
	LEASE_SIGNATURE_ERROR_CODES
} from '@repo/shared/constants/lease-signature-errors'
import { AppLogger } from '../../logger/app-logger.service'
import { SignatureValidationHelper } from './helpers/signature-validation.helper'
import { LeasePdfHelper } from './helpers/lease-pdf.helper'
import { SignatureNotificationHelper } from './helpers/signature-notification.helper'

export interface SignatureStatus {
	lease_id: string
	status: string
	owner_signed: boolean
	owner_signed_at: string | null
	tenant_signed: boolean
	tenant_signed_at: string | null
	sent_for_signature_at: string | null
	both_signed: boolean
	docuseal_submission_id?: string | null
}

export interface SendForSignatureOptions {
	message?: string | undefined
	missingFields?:
		| {
				immediate_family_members?: string
				landlord_notice_address?: string
		  }
		| undefined // User-provided missing PDF fields
	token?: string | undefined // JWT token for database queries
}

/**
 * Result from the sign_lease_and_check_activation RPC function
 */
export interface SignLeaseRpcResult {
	success: boolean
	both_signed: boolean
	error_message: string | null
}

@Injectable()
export class LeaseSignatureService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly docuSealService: DocuSealService,
		private readonly leaseSubscriptionService: LeaseSubscriptionService,
		private readonly logger: AppLogger,
		private readonly signatureValidationHelper: SignatureValidationHelper,
		private readonly leasePdfHelper: LeasePdfHelper,
		private readonly signatureNotificationHelper: SignatureNotificationHelper
	) {}

	/**
	 * Parse the result from sign_lease_and_check_activation RPC
	 * RPC returns SETOF (array of rows), extract the first row's values
	 */
	private parseSignLeaseRpcResult(rpcResult: unknown): SignLeaseRpcResult {
		if (!rpcResult || (Array.isArray(rpcResult) && rpcResult.length === 0)) {
			return {
				success: false,
				both_signed: false,
				error_message:
					LEASE_SIGNATURE_ERROR_MESSAGES[
						LEASE_SIGNATURE_ERROR_CODES.RPC_NO_RESULT
					]
			}
		}

		const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult

		return {
			success: Boolean((row as Record<string, unknown>).success),
			both_signed: Boolean((row as Record<string, unknown>).both_signed),
			error_message:
				((row as Record<string, unknown>).error_message as string) || null
		}
	}

	/**
	 * Owner sends a lease for signature (draft -> pending_signature)
	 * Production-ready workflow:
	 * 1. Query lease data from database
	 * 2. Auto-fill PDF fields from DB
	 * 3. Validate missing fields (user must provide)
	 * 4. Generate filled PDF with pdf-lib
	 * 5. Upload PDF to Supabase Storage
	 * 6. Create DocuSeal submission from uploaded PDF URL
	 * 7. Update lease status to pending_signature
	 */
	async sendForSignature(
		ownerId: string,
		leaseId: string,
		options?: SendForSignatureOptions
	): Promise<void> {
		this.logger.log('Sending lease for signature with PDF generation', {
			ownerId,
			leaseId
		})
		const client = this.supabase.getAdminClient()

		// Step 1: Validate ownership and lease status
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select('id, lease_status, owner_user_id, primary_tenant_id')
			.eq('id', leaseId)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_FOUND
				]
			)
		}

		this.signatureValidationHelper.ensureLeaseOwner(lease, ownerId)
		this.signatureValidationHelper.ensureLeaseStatus(
			lease,
			'draft',
			LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_DRAFT
		)

		const { pdfUrl, docusealSubmissionId } =
			await this.leasePdfHelper.preparePdfAndSubmission({
				client,
				leaseId,
				ownerId,
				lease,
				...(options && { options })
			})

		// Step 9: Update lease status
		const now = new Date().toISOString()
		const updateData: Record<string, unknown> = {
			lease_status: 'pending_signature',
			sent_for_signature_at: now,
			pdf_storage_path: pdfUrl // Store PDF URL for future reference
		}

		if (docusealSubmissionId) {
			updateData.docuseal_submission_id = docusealSubmissionId
		}

		const { error: updateError } = await client
			.from('leases')
			.update(updateData)
			.eq('id', leaseId)

		if (updateError) {
			this.logger.error('Failed to update lease status to pending_signature', {
				error: updateError.message,
				leaseId,
				ownerId
			})
			throw new BadRequestException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.SEND_FOR_SIGNATURE_FAILED
				]
			)
		}

		this.signatureNotificationHelper.emitLeaseSentForSignature({
			leaseId,
			tenantId: lease.primary_tenant_id,
			...(options?.message && { message: options.message }),
			docusealSubmissionId,
			pdfUrl
		})

		this.logger.log('Lease sent for signature successfully', {
			leaseId,
			docusealSubmissionId,
			pdfUrl
		})
	}

	/**
	 * Owner signs the lease via in-app signature
	 */
	async signLeaseAsOwner(
		ownerId: string,
		leaseId: string,
		signatureIp: string
	): Promise<void> {
		this.logger.log('Owner signing lease', { ownerId, leaseId })
		const client = this.supabase.getAdminClient()

		// Step 1: Get lease for authorization check (read-only, no lock needed)
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select('id, owner_user_id, rent_amount, primary_tenant_id')
			.eq('id', leaseId)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_FOUND
				]
			)
		}

		this.signatureValidationHelper.ensureLeaseOwner(lease, ownerId)

		// Step 3: Call atomic RPC to sign and check if both signed
		// This uses SELECT FOR UPDATE to prevent race conditions
		const now = new Date().toISOString()
		const { data: rpcResult, error: rpcError } = await client.rpc(
			'sign_lease_and_check_activation',
			{
				p_lease_id: leaseId,
				p_signer_type: 'owner',
				p_signature_ip: signatureIp,
				p_signed_at: now
			}
		)

		if (rpcError) {
			this.logger.error('RPC sign_lease_and_check_activation failed', {
				leaseId,
				error: rpcError
			})
			throw new BadRequestException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.RECORD_SIGNATURE_FAILED
				]
			)
		}

		const result = this.parseSignLeaseRpcResult(rpcResult)

		if (!result.success) {
			throw new BadRequestException(
				result.error_message ||
					LEASE_SIGNATURE_ERROR_MESSAGES[
						LEASE_SIGNATURE_ERROR_CODES.SIGN_LEASE_FAILED
					]
			)
		}

		// Step 4: Handle activation if both signed (delegates to subscription service)
		if (result.both_signed) {
			await this.leaseSubscriptionService.activateLease(client, lease, {
				owner_signed_at: now,
				owner_signature_ip: signatureIp
			})

			await this.signatureNotificationHelper.broadcastSignatureUpdate(
				leaseId,
				lease.owner_user_id,
				lease.primary_tenant_id,
				'owner',
				'fully_signed',
				now
			)
		} else {
			this.signatureNotificationHelper.emitOwnerSigned(leaseId, now)

			await this.signatureNotificationHelper.broadcastSignatureUpdate(
				leaseId,
				lease.owner_user_id,
				lease.primary_tenant_id,
				'owner',
				'owner_signed',
				now
			)
		}

		this.logger.log('Owner signed lease', {
			leaseId,
			bothSigned: result.both_signed
		})
	}

	/**
	 * Tenant signs the lease via in-app signature
	 *
	 * PERF-001: FIXED - Uses Promise.all() for parallel fetching of tenant and lease data.
	 */
	async signLeaseAsTenant(
		tenantUserId: string,
		leaseId: string,
		signatureIp: string
	): Promise<void> {
		this.logger.log('Tenant signing lease', { tenantUserId, leaseId })
		const client = this.supabase.getAdminClient()

		// PERF-001: Fetch tenant and lease data in parallel (both are independent queries)
		const [tenantResult, leaseResult] = await Promise.all([
			client
				.from('tenants')
				.select('id, user_id, stripe_customer_id')
				.eq('user_id', tenantUserId)
				.single(),
			client
				.from('leases')
				.select('id, owner_user_id, primary_tenant_id, rent_amount')
				.eq('id', leaseId)
				.single()
		])

		const { data: tenant, error: tenantError } = tenantResult
		const { data: lease, error: leaseError } = leaseResult

		if (tenantError || !tenant) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.TENANT_NOT_FOUND
				]
			)
		}

		if (leaseError || !lease) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_FOUND
				]
			)
		}

		this.signatureValidationHelper.ensureTenantAssigned(lease, tenant.id)

		// Step 4: Call atomic RPC to sign and check if both signed
		// This uses SELECT FOR UPDATE to prevent race conditions
		const now = new Date().toISOString()
		const { data: rpcResult, error: rpcError } = await client.rpc(
			'sign_lease_and_check_activation',
			{
				p_lease_id: leaseId,
				p_signer_type: 'tenant',
				p_signature_ip: signatureIp,
				p_signed_at: now
			}
		)

		if (rpcError) {
			this.logger.error('RPC sign_lease_and_check_activation failed', {
				leaseId,
				error: rpcError
			})
			throw new BadRequestException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.RECORD_SIGNATURE_FAILED
				]
			)
		}

		const result = this.parseSignLeaseRpcResult(rpcResult)

		if (!result.success) {
			throw new BadRequestException(
				result.error_message ||
					LEASE_SIGNATURE_ERROR_MESSAGES[
						LEASE_SIGNATURE_ERROR_CODES.SIGN_LEASE_FAILED
					]
			)
		}

		// Step 5: Handle activation if both signed (delegates to subscription service)
		if (result.both_signed) {
			await this.leaseSubscriptionService.activateLease(client, lease, {
				tenant_signed_at: now,
				tenant_signature_ip: signatureIp
			})

			await this.signatureNotificationHelper.broadcastSignatureUpdate(
				leaseId,
				lease.owner_user_id,
				tenant.user_id,
				'tenant',
				'fully_signed',
				now
			)
		} else {
			this.signatureNotificationHelper.emitTenantSigned(
				leaseId,
				tenant.id,
				now
			)

			await this.signatureNotificationHelper.broadcastSignatureUpdate(
				leaseId,
				lease.owner_user_id,
				tenant.user_id,
				'tenant',
				'tenant_signed',
				now
			)
		}

		this.logger.log('Tenant signed lease', {
			leaseId,
			bothSigned: result.both_signed
		})
	}

	/**
	 * Get signature status for a lease
	 */
	async getSignatureStatus(
		leaseId: string,
		userId: string
	): Promise<SignatureStatus> {
		const client = this.supabase.getAdminClient()

		const { data: lease, error } = await client
			.from('leases')
			.select(
				'id, lease_status, owner_signed_at, tenant_signed_at, sent_for_signature_at, owner_user_id, primary_tenant_id, docuseal_submission_id'
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

		// Authorization check: user must be owner or tenant
		if (!lease.owner_user_id) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NO_OWNER
				]
			)
		}
		const isOwner = lease.owner_user_id === userId

		let isTenant = false
		if (!isOwner) {
			// Check if user is the tenant (primary_tenant_id references tenants table)
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

		const ownerSigned = !!lease.owner_signed_at
		const tenantSigned = !!lease.tenant_signed_at

		return {
			lease_id: lease.id,
			status: lease.lease_status,
			owner_signed: ownerSigned,
			owner_signed_at: lease.owner_signed_at,
			tenant_signed: tenantSigned,
			tenant_signed_at: lease.tenant_signed_at,
			sent_for_signature_at: lease.sent_for_signature_at,
			both_signed: ownerSigned && tenantSigned,
			docuseal_submission_id: lease.docuseal_submission_id
		}
	}

	/**
	 * Get DocuSeal signing URL for a user
	 */
	async getSigningUrl(leaseId: string, userId: string): Promise<string | null> {
		const client = this.supabase.getAdminClient()

		// Get lease with DocuSeal submission ID
		const { data: lease, error } = await client
			.from('leases')
			.select('id, docuseal_submission_id, owner_user_id, primary_tenant_id')
			.eq('id', leaseId)
			.single()

		if (error || !lease || !lease.docuseal_submission_id) {
			return null
		}

		// Determine if user is owner or tenant and get their email (optimized)
		if (!lease.owner_user_id) {
			return null // Can't determine ownership without owner_user_id
		}
		const isOwner = lease.owner_user_id === userId

		// Fetch user email and tenant data in parallel
		const [userResult, tenantResult] = await Promise.all([
			client.from('users').select('email').eq('id', userId).single(),
			!isOwner
				? client
						.from('tenants')
						.select('user_id')
						.eq('id', lease.primary_tenant_id)
						.single()
				: Promise.resolve({ data: null, error: null })
		])

		// Verify authorization and get email
		let userEmail: string | null = null
		if (isOwner) {
			userEmail = userResult.data?.email || null
		} else if (tenantResult.data?.user_id === userId) {
			userEmail = userResult.data?.email || null
		}

		if (!userEmail) {
			return null
		}

		// Get signing URL from DocuSeal
		try {
			const signingUrl = await this.docuSealService.getSubmitterSigningUrl(
				parseInt(lease.docuseal_submission_id, 10),
				userEmail
			)
			return signingUrl
		} catch (error) {
			this.logger.error('Failed to get DocuSeal signing URL', {
				error: error instanceof Error ? error.message : String(error),
				leaseId
			})
			return null
		}
	}

	/**
	 * Cancel a pending signature request
	 */
	async cancelSignatureRequest(
		ownerId: string,
		leaseId: string
	): Promise<void> {
		const client = this.supabase.getAdminClient()

		// Get lease and verify ownership
		const { data: lease, error } = await client
			.from('leases')
			.select('id, lease_status, owner_user_id, docuseal_submission_id')
			.eq('id', leaseId)
			.single()

		if (error || !lease) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_FOUND
				]
			)
		}

		this.signatureValidationHelper.ensureLeaseOwner(lease, ownerId)

		this.signatureValidationHelper.ensureLeaseStatus(
			lease,
			'pending_signature',
			LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_PENDING_SIGNATURE
		)

		// Archive DocuSeal submission if exists
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
				// Continue with cancellation even if DocuSeal fails
			}
		}

		// Revert lease to draft status
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

		this.signatureNotificationHelper.emitSignatureCancelled(leaseId)

		this.logger.log('Signature request cancelled', { leaseId })
	}

	/**
	 * Resend signature request using DocuSeal's native PUT /submitters endpoint.
	 * This re-sends email notifications to pending submitters without creating a new submission.
	 */
	async resendSignatureRequest(
		ownerId: string,
		leaseId: string,
		options?: { message?: string }
	): Promise<void> {
		const client = this.supabase.getAdminClient()

		// Get lease and verify ownership
		const { data: lease, error } = await client
			.from('leases')
			.select('id, lease_status, owner_user_id, docuseal_submission_id')
			.eq('id', leaseId)
			.single()

		if (error || !lease) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_FOUND
				]
			)
		}

		this.signatureValidationHelper.ensureLeaseOwner(lease, ownerId)

		this.signatureValidationHelper.ensureLeaseStatus(
			lease,
			'pending_signature',
			LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_PENDING_SIGNATURE
		)

		// Verify DocuSeal submission exists
		if (!lease.docuseal_submission_id || !this.docuSealService.isEnabled()) {
			throw new BadRequestException(
				'No DocuSeal submission found for this lease. Cannot resend.'
			)
		}

		// Get submission to find pending submitters
		const submission = await this.docuSealService.getSubmission(
			parseInt(lease.docuseal_submission_id, 10)
		)

		// Resend to all pending submitters
		const pendingSubmitters = submission.submitters.filter(
			s => s.status === 'pending' || s.status === 'opened'
		)

		if (pendingSubmitters.length === 0) {
			throw new BadRequestException(
				'All parties have already signed. Nothing to resend.'
			)
		}

		// Resend to each pending submitter
		for (const submitter of pendingSubmitters) {
			if (submitter.id) {
				const resendOptions: { message?: string } = {}
				if (options?.message) {
					resendOptions.message = options.message
				}
				await this.docuSealService.resendToSubmitter(
					submitter.id,
					resendOptions
				)
			}
		}

		this.logger.log('Resent signature request', {
			leaseId,
			submitterCount: pendingSubmitters.length
		})
	}

	/**
	 * Get signed document URL from DocuSeal
	 * Only available for active leases with completed signatures
	 */
	async getSignedDocumentUrl(
		leaseId: string,
		userId: string
	): Promise<string | null> {
		const client = this.supabase.getAdminClient()

		// Get lease with DocuSeal submission ID
		const { data: lease, error } = await client
			.from('leases')
			.select(
				'id, lease_status, docuseal_submission_id, owner_user_id, primary_tenant_id'
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

		// Authorization check: user must be owner or tenant
		if (!lease.owner_user_id) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NO_OWNER
				]
			)
		}
		const isOwner = lease.owner_user_id === userId

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

		// Only active leases have signed documents
		if (lease.lease_status !== 'active') {
			return null
		}

		// Get document URL from DocuSeal
		if (!lease.docuseal_submission_id || !this.docuSealService.isEnabled()) {
			return null
		}

		try {
			const submission = await this.docuSealService.getSubmission(
				parseInt(lease.docuseal_submission_id, 10)
			)
			// Return the first document URL (the signed lease PDF)
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
