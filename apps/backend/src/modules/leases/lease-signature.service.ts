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
 */

import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import { DocuSealService } from '../docuseal/docuseal.service'
import { LeaseDocumentService } from './lease-document.service'
import { LeaseSubscriptionService } from './lease-subscription.service'
import {
	LEASE_SIGNATURE_ERROR_MESSAGES,
	LEASE_SIGNATURE_ERROR_CODES
} from '@repo/shared/constants/lease-signature-errors'
import { AppLogger } from '../../logger/app-logger.service'

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
	templateId?: number | undefined // DocuSeal template ID (if not provided, uses default)
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
		private readonly eventEmitter: EventEmitter2,
		private readonly docuSealService: DocuSealService,
		private readonly leaseDocumentService: LeaseDocumentService,
		private readonly leaseSubscriptionService: LeaseSubscriptionService,
		private readonly logger: AppLogger
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
	 * If DocuSeal is enabled, creates an e-signature request
	 */
	async sendForSignature(
		ownerId: string,
		leaseId: string,
		options?: SendForSignatureOptions
	): Promise<void> {
		this.logger.log('Sending lease for signature', { ownerId, leaseId })
		const client = this.supabase.getAdminClient()

		// Step 1: Get lease with related data for DocuSeal
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select(
				`
				id, lease_status, property_owner_id, primary_tenant_id,
				rent_amount, start_date, end_date,
				property_owner:property_owners!leases_property_owner_id_fkey (user_id),
				unit:units!leases_unit_id_fkey (
					unit_number,
					property:properties!units_property_id_fkey (
						name, address
					)
				)
			`
			)
			.eq('id', leaseId)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_FOUND
				]
			)
		}

		// Step 2: Verify owner owns the lease (ownerId is auth.users.id)
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

		// Step 3: Verify lease is in draft status
		if (lease.lease_status !== 'draft') {
			throw new BadRequestException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_DRAFT
				]
			)
		}

		// Step 4: Get owner and tenant details for DocuSeal (parallel queries for performance)
		// Note: lease.property_owner_id is the property_owners table ID, not auth.users.id
		const [{ data: owner }, { data: tenant }] = await Promise.all([
			client
				.from('property_owners')
				.select('id, user_id')
				.eq('id', lease.property_owner_id)
				.single(),
			client
				.from('tenants')
				.select('id, user_id')
				.eq('id', lease.primary_tenant_id)
				.single()
		])

		// Fetch user details in parallel
		let ownerUser: {
			email: string
			first_name: string | null
			last_name: string | null
		} | null = null
		let tenantUser: {
			email: string
			first_name: string | null
			last_name: string | null
		} | null = null

		if (owner?.user_id && tenant?.user_id) {
			// Both exist - fetch in parallel
			const [ownerResult, tenantResult] = await Promise.all([
				client
					.from('users')
					.select('email, first_name, last_name')
					.eq('id', owner.user_id)
					.single(),
				client
					.from('users')
					.select('email, first_name, last_name')
					.eq('id', tenant.user_id)
					.single()
			])
			ownerUser = ownerResult.data
			tenantUser = tenantResult.data
		} else {
			// Fetch individually if only one exists
			if (owner?.user_id) {
				const { data } = await client
					.from('users')
					.select('email, first_name, last_name')
					.eq('id', owner.user_id)
					.single()
				ownerUser = data
			}
			if (tenant?.user_id) {
				const { data } = await client
					.from('users')
					.select('email, first_name, last_name')
					.eq('id', tenant.user_id)
					.single()
				tenantUser = data
			}
		}

		// Step 5: Create DocuSeal submission if enabled
		let docusealSubmissionId: string | null = null
		const docusealTemplate =
			this.docuSealService.isEnabled() && options?.templateId

		if (docusealTemplate) {
			// Validate email addresses before DocuSeal submission
			if (!ownerUser?.email) {
				throw new BadRequestException(
					LEASE_SIGNATURE_ERROR_MESSAGES[
						LEASE_SIGNATURE_ERROR_CODES.OWNER_EMAIL_MISSING
					]
				)
			}
			if (!tenantUser?.email) {
				throw new BadRequestException(
					LEASE_SIGNATURE_ERROR_MESSAGES[
						LEASE_SIGNATURE_ERROR_CODES.TENANT_EMAIL_MISSING
					]
				)
			}

			try {
				const unit = lease.unit as {
					unit_number?: string
					property?: { name?: string; address?: string }
				} | null
				const propertyAddress =
					unit?.property?.address || unit?.property?.name || 'Property Address'

				const submission = await this.docuSealService.createLeaseSubmission({
					templateId: options!.templateId!,
					leaseId: lease.id,
					ownerEmail: ownerUser.email,
					ownerName:
						`${ownerUser.first_name || ''} ${ownerUser.last_name || ''}`.trim() ||
						'Property Owner',
					tenantEmail: tenantUser.email,
					tenantName:
						`${tenantUser.first_name || ''} ${tenantUser.last_name || ''}`.trim() ||
						'Tenant',
					propertyAddress,
					unitNumber: unit?.unit_number,
					rentAmount: lease.rent_amount,
					startDate: lease.start_date,
					endDate: lease.end_date
				})

				docusealSubmissionId = String(submission.id)
				this.logger.log('Created DocuSeal submission', {
					submissionId: submission.id,
					leaseId
				})
			} catch (error) {
				this.logger.error('Failed to create DocuSeal submission', {
					error: error instanceof Error ? error.message : String(error),
					leaseId
				})
				// Continue without DocuSeal - fallback to in-app signing
			}
		}

		// Step 6: Update lease status
		const now = new Date().toISOString()
		const updateData: Record<string, unknown> = {
			lease_status: 'pending_signature',
			sent_for_signature_at: now
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

		// Step 7: Emit event for notification service
		this.eventEmitter.emit('lease.sent_for_signature', {
			lease_id: leaseId,
			tenant_id: lease.primary_tenant_id,
			message: options?.message,
			docuseal_submission_id: docusealSubmissionId
		})

		this.logger.log('Lease sent for signature', {
			leaseId,
			docusealSubmissionId
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
			.select(
				'id, property_owner_id, rent_amount, primary_tenant_id, property_owner:property_owners!leases_property_owner_id_fkey (user_id)'
			)
			.eq('id', leaseId)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_FOUND
				]
			)
		}

		// Step 2: Verify owner owns the lease (ownerId is auth.users.id)
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
		} else {
			this.eventEmitter.emit('lease.owner_signed', {
				lease_id: leaseId,
				signed_at: now
			})
		}

		this.logger.log('Owner signed lease', {
			leaseId,
			bothSigned: result.both_signed
		})
	}

	/**
	 * Tenant signs the lease via in-app signature
	 */
	async signLeaseAsTenant(
		tenantUserId: string,
		leaseId: string,
		signatureIp: string
	): Promise<void> {
		this.logger.log('Tenant signing lease', { tenantUserId, leaseId })
		const client = this.supabase.getAdminClient()

		// Step 1: Get tenant record from user_id
		const { data: tenant, error: tenantError } = await client
			.from('tenants')
			.select('id, user_id, stripe_customer_id')
			.eq('user_id', tenantUserId)
			.single()

		if (tenantError || !tenant) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.TENANT_NOT_FOUND
				]
			)
		}

		// Step 2: Get lease for authorization check (read-only, no lock needed)
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select('id, property_owner_id, primary_tenant_id, rent_amount')
			.eq('id', leaseId)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_FOUND
				]
			)
		}

		// Step 3: Verify tenant is assigned to this lease
		if (lease.primary_tenant_id !== tenant.id) {
			throw new ForbiddenException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.NOT_ASSIGNED_TO_LEASE
				]
			)
		}

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
		} else {
			this.eventEmitter.emit('lease.tenant_signed', {
				lease_id: leaseId,
				tenant_id: tenant.id,
				signed_at: now
			})
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
				'id, lease_status, owner_signed_at, tenant_signed_at, sent_for_signature_at, property_owner_id, primary_tenant_id, docuseal_submission_id, property_owner:property_owners!leases_property_owner_id_fkey (user_id)'
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

	async getSigningUrl(leaseId: string, userId: string): Promise<string | null> {
		return this.leaseDocumentService.getSigningUrl(leaseId, userId)
	}

	async cancelSignatureRequest(ownerId: string, leaseId: string): Promise<void> {
		return this.leaseDocumentService.cancelSignatureRequest(ownerId, leaseId)
	}

	async resendSignatureRequest(
		ownerId: string,
		leaseId: string,
		options?: { message?: string }
	): Promise<void> {
		return this.leaseDocumentService.resendSignatureRequest(ownerId, leaseId, options)
	}

	async getSignedDocumentUrl(
		leaseId: string,
		userId: string
	): Promise<string | null> {
		return this.leaseDocumentService.getSignedDocumentUrl(leaseId, userId)
	}
}
