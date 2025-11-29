/**
 * LeaseSignatureService
 *
 * Handles the lease signature workflow:
 * 1. Owner creates lease draft (status: 'draft')
 * 2. Owner sends lease for signature (status: 'pending_signature')
 * 3. Tenant signs the lease
 * 4. Owner signs the lease (can be before or after tenant)
 * 5. When BOTH signed: status -> 'active', create Stripe subscription
 *
 * Key principle: NO Stripe billing until BOTH parties have signed.
 */

import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import { StripeConnectService } from '../billing/stripe-connect.service'
import { DocuSealService } from '../docuseal/docuseal.service'

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
		private readonly logger: Logger,
		private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2,
		private readonly stripeConnectService: StripeConnectService,
		private readonly docuSealService: DocuSealService
	) {}


	/**
	 * Parse the result from sign_lease_and_check_activation RPC
	 * RPC returns SETOF (array of rows), extract the first row's values
	 */
	private parseSignLeaseRpcResult(rpcResult: unknown): SignLeaseRpcResult {
		if (!rpcResult || (Array.isArray(rpcResult) && rpcResult.length === 0)) {
			return { success: false, both_signed: false, error_message: 'RPC returned no result' }
		}

		const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult

		return {
			success: Boolean((row as Record<string, unknown>).success),
			both_signed: Boolean((row as Record<string, unknown>).both_signed),
			error_message: ((row as Record<string, unknown>).error_message as string) || null
		}
	}

	/**
	 * Check if a user ID (from auth.users) is the owner of a lease
	 * property_owner_id in leases references property_owners.id, not auth.users.id
	 */
	private async isUserLeaseOwner(propertyOwnerId: string, userId: string): Promise<boolean> {
		const client = this.supabase.getAdminClient()
		const { data: propertyOwner } = await client
			.from('property_owners')
			.select('user_id')
			.eq('id', propertyOwnerId)
			.single()

		return propertyOwner?.user_id === userId
	}

	/**
	 * Owner sends a lease for signature (draft -> pending_signature)
	 * If DocuSeal is enabled, creates an e-signature request
	 */
	async sendForSignature(ownerId: string, leaseId: string, options?: SendForSignatureOptions): Promise<void> {
		this.logger.log('Sending lease for signature', { ownerId, leaseId })
		const client = this.supabase.getAdminClient()

		// Step 1: Get lease with related data for DocuSeal
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select(`
				id, lease_status, property_owner_id, primary_tenant_id,
				rent_amount, start_date, end_date,
				unit:units!leases_unit_id_fkey (
					unit_number,
					property:properties!units_property_id_fkey (
						name, address
					)
				)
			`)
			.eq('id', leaseId)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found')
		}

		// Step 2: Verify owner owns the lease (ownerId is auth.users.id)
		if (!lease.property_owner_id) {
			throw new NotFoundException('Lease has no owner assigned')
		}
		const isOwner = await this.isUserLeaseOwner(lease.property_owner_id, ownerId)
		if (!isOwner) {
			throw new ForbiddenException('You do not own this lease')
		}

		// Step 3: Verify lease is in draft status
		if (lease.lease_status !== 'draft') {
			throw new BadRequestException('Only draft leases can be sent for signature')
		}

		// Step 4: Get owner and tenant details for DocuSeal (parallel queries for performance)
		const [{ data: owner }, { data: tenant }] = await Promise.all([
			client.from('property_owners').select('id, user_id').eq('id', ownerId).single(),
			client.from('tenants').select('id, user_id').eq('id', lease.primary_tenant_id).single()
		])

		// Fetch user details in parallel
		let ownerUser: { email: string; first_name: string | null; last_name: string | null } | null = null
		let tenantUser: { email: string; first_name: string | null; last_name: string | null } | null = null

		if (owner?.user_id && tenant?.user_id) {
			// Both exist - fetch in parallel
			const [ownerResult, tenantResult] = await Promise.all([
				client.from('users').select('email, first_name, last_name').eq('id', owner.user_id).single(),
				client.from('users').select('email, first_name, last_name').eq('id', tenant.user_id).single()
			])
			ownerUser = ownerResult.data
			tenantUser = tenantResult.data
		} else {
			// Fetch individually if only one exists
			if (owner?.user_id) {
				const { data } = await client.from('users').select('email, first_name, last_name').eq('id', owner.user_id).single()
				ownerUser = data
			}
			if (tenant?.user_id) {
				const { data } = await client.from('users').select('email, first_name, last_name').eq('id', tenant.user_id).single()
				tenantUser = data
			}
		}

		// Step 5: Create DocuSeal submission if enabled
		let docusealSubmissionId: string | null = null
		const docusealTemplate = this.docuSealService.isEnabled() && options?.templateId

		if (docusealTemplate) {
			// Validate email addresses before DocuSeal submission
			if (!ownerUser?.email) {
				throw new BadRequestException(
					'Cannot send lease for signature: property owner email is missing',
				)
			}
			if (!tenantUser?.email) {
				throw new BadRequestException(
					'Cannot send lease for signature: tenant email is missing',
				)
			}

			try {
				const unit = lease.unit as { unit_number?: string; property?: { name?: string; address?: string } } | null
				const propertyAddress = unit?.property?.address || unit?.property?.name || 'Property Address'

				const submission = await this.docuSealService.createLeaseSubmission({
					templateId: options!.templateId!,
					leaseId: lease.id,
					ownerEmail: ownerUser.email,
					ownerName: `${ownerUser.first_name || ''} ${ownerUser.last_name || ''}`.trim() || 'Property Owner',
					tenantEmail: tenantUser.email,
					tenantName: `${tenantUser.first_name || ''} ${tenantUser.last_name || ''}`.trim() || 'Tenant',
					propertyAddress,
					unitNumber: unit?.unit_number,
					rentAmount: lease.rent_amount,
					startDate: lease.start_date,
					endDate: lease.end_date
				})

				docusealSubmissionId = String(submission.id)
				this.logger.log('Created DocuSeal submission', { submissionId: submission.id, leaseId })
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
			this.logger.error('Failed to update lease status', { error: updateError.message })
			throw new BadRequestException('Failed to send lease for signature')
		}

		// Step 7: Emit event for notification service
		this.eventEmitter.emit('lease.sent_for_signature', {
			lease_id: leaseId,
			tenant_id: lease.primary_tenant_id,
			message: options?.message,
			docuseal_submission_id: docusealSubmissionId
		})

		this.logger.log('Lease sent for signature', { leaseId, docusealSubmissionId })
	}

	/**
	 * Owner signs the lease
	 */
	async signLeaseAsOwner(ownerId: string, leaseId: string, signatureIp: string): Promise<void> {
		this.logger.log('Owner signing lease', { ownerId, leaseId })
		const client = this.supabase.getAdminClient()

		// Step 1: Get lease for authorization check (read-only, no lock needed)
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select('id, property_owner_id, rent_amount, primary_tenant_id')
			.eq('id', leaseId)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found')
		}

		// Step 2: Verify owner owns the lease (ownerId is auth.users.id)
		if (!lease.property_owner_id) {
			throw new NotFoundException('Lease has no owner assigned')
		}
		const isOwner = await this.isUserLeaseOwner(lease.property_owner_id, ownerId)
		if (!isOwner) {
			throw new ForbiddenException('You do not own this lease')
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
			this.logger.error('RPC sign_lease_and_check_activation failed', { leaseId, error: rpcError })
			throw new BadRequestException('Failed to record signature')
		}

		const result = this.parseSignLeaseRpcResult(rpcResult)

		if (!result.success) {
			throw new BadRequestException(result.error_message || 'Failed to sign lease')
		}

		// Step 4: Handle activation if both signed
		if (result.both_signed) {
			await this.activateLease(client, lease, {
				owner_signed_at: now,
				owner_signature_ip: signatureIp
			})
		} else {
			this.eventEmitter.emit('lease.owner_signed', {
				lease_id: leaseId,
				signed_at: now
			})
		}

		this.logger.log('Owner signed lease', { leaseId, bothSigned: result.both_signed })
	}

	/**
	 * Tenant signs the lease
	 */
	async signLeaseAsTenant(tenantUserId: string, leaseId: string, signatureIp: string): Promise<void> {
		this.logger.log('Tenant signing lease', { tenantUserId, leaseId })
		const client = this.supabase.getAdminClient()

		// Step 1: Get tenant record from user_id
		const { data: tenant, error: tenantError } = await client
			.from('tenants')
			.select('id, user_id, stripe_customer_id')
			.eq('user_id', tenantUserId)
			.single()

		if (tenantError || !tenant) {
			throw new NotFoundException('Tenant not found')
		}

		// Step 2: Get lease for authorization check (read-only, no lock needed)
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select('id, property_owner_id, primary_tenant_id, rent_amount')
			.eq('id', leaseId)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found')
		}

		// Step 3: Verify tenant is assigned to this lease
		if (lease.primary_tenant_id !== tenant.id) {
			throw new ForbiddenException('You are not assigned to this lease')
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
			this.logger.error('RPC sign_lease_and_check_activation failed', { leaseId, error: rpcError })
			throw new BadRequestException('Failed to record signature')
		}

		const result = this.parseSignLeaseRpcResult(rpcResult)

		if (!result.success) {
			throw new BadRequestException(result.error_message || 'Failed to sign lease')
		}

		// Step 5: Handle activation if both signed
		if (result.both_signed) {
			await this.activateLease(client, lease, {
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

		this.logger.log('Tenant signed lease', { leaseId, bothSigned: result.both_signed })
	}

	/**
	 * Activate lease and create Stripe subscription (called when both parties sign)
	 *
	 * Database-first approach:
	 * 1. Validate prerequisites (owner Stripe account, tenant exists)
	 * 2. Atomically activate lease with stripe_subscription_status = 'pending'
	 * 3. Emit lease.activated event (lease is now active, subscription pending)
	 * 4. Create Stripe subscription with idempotency key
	 * 5. On success: Update status to 'active' with subscription ID
	 * 6. On failure: Update status to 'failed' with error reason (will be retried)
	 */
	private async activateLease(
		client: ReturnType<SupabaseService['getAdminClient']>,
		lease: {
			id: string
			property_owner_id: string | null
			primary_tenant_id: string
			rent_amount: number
		},
		_signatureData: {
			owner_signed_at?: string
			owner_signature_ip?: string
			owner_signature_method?: 'in_app' | 'docuseal'
			tenant_signed_at?: string
			tenant_signature_ip?: string
			tenant_signature_method?: 'in_app' | 'docuseal'
		}
	): Promise<void> {
		this.logger.log('Activating lease - both parties have signed', { leaseId: lease.id })

		if (!lease.property_owner_id) {
			throw new BadRequestException('Lease must have a property owner to activate')
		}

		// Step 1: Get property owner's Stripe account
		const { data: owner, error: ownerError } = await client
			.from('property_owners')
			.select('id, stripe_account_id, charges_enabled, payouts_enabled')
			.eq('id', lease.property_owner_id)
			.single()

		if (ownerError || !owner || !owner.stripe_account_id) {
			throw new BadRequestException('Property owner must have Stripe Connect setup to activate lease')
		}

		// Verify charges are enabled on the Stripe account
		if (!owner.charges_enabled) {
			throw new BadRequestException(
				'Property owner must complete Stripe Connect verification before lease can be activated. ' +
				'Please complete Stripe onboarding to enable payments.'
			)
		}

		// Step 2: Atomically activate lease with pending subscription status
		const { data: activationResult, error: activationError } = await client.rpc(
			'activate_lease_with_pending_subscription',
			{ p_lease_id: lease.id }
		)

		if (activationError) {
			this.logger.error('RPC activate_lease_with_pending_subscription failed', {
				leaseId: lease.id,
				error: activationError
			})
			throw new BadRequestException('Failed to activate lease')
		}

		// Parse RPC result (returns SETOF)
		const result = Array.isArray(activationResult) ? activationResult[0] : activationResult
		if (!result?.success) {
			throw new BadRequestException(result?.error_message || 'Failed to activate lease')
		}

		// Step 3: Emit lease.activated event (lease is active, subscription pending)
		this.eventEmitter.emit('lease.activated', {
			lease_id: lease.id,
			tenant_id: lease.primary_tenant_id,
			subscription_id: null, // Pending
			subscription_status: 'pending'
		})

		this.logger.log('Lease activated with pending subscription', { leaseId: lease.id })

		// Step 4: Create Stripe subscription (deferred, with retry capability)
		await this.createSubscriptionForLease(client, lease, owner.stripe_account_id)
	}

	/**
	 * Create Stripe subscription for an activated lease
	 * Called immediately after activation and by background retry job
	 *
	 * On success: Updates stripe_subscription_status to 'active'
	 * On failure: Updates stripe_subscription_status to 'failed' with error reason
	 */
	async createSubscriptionForLease(
		client: ReturnType<SupabaseService['getAdminClient']>,
		lease: {
			id: string
			primary_tenant_id: string
			rent_amount: number
		},
		connectedAccountId: string
	): Promise<void> {
		// Get tenant with stripe customer ID
		const { data: tenant, error: tenantError } = await client
			.from('tenants')
			.select('id, user_id, stripe_customer_id')
			.eq('id', lease.primary_tenant_id)
			.single()

		if (tenantError || !tenant) {
			await this.markSubscriptionFailed(client, lease.id, 'Tenant not found')
			return
		}

		// Get user info for email (needed if creating new customer)
		const { data: user } = await client
			.from('users')
			.select('email, first_name, last_name, phone')
			.eq('id', tenant.user_id)
			.single()

		let stripeCustomerId = tenant.stripe_customer_id

		// Create Stripe customer on connected account if needed
		if (!stripeCustomerId) {
			try {
				const customerName = user
					? `${user.first_name || ''} ${user.last_name || ''}`.trim() || undefined
					: undefined

				const createCustomerParams: {
					email: string
					name?: string
					phone?: string
					metadata?: Record<string, string>
				} = {
					email: user?.email || `tenant-${tenant.id}@placeholder.local`,
					metadata: {
						tenant_id: tenant.id,
						user_id: tenant.user_id
					}
				}
				if (customerName) {
					createCustomerParams.name = customerName
				}
				if (user?.phone) {
					createCustomerParams.phone = user.phone
				}

				const customer = await this.stripeConnectService.createCustomerOnConnectedAccount(
					connectedAccountId,
					createCustomerParams
				)
				stripeCustomerId = customer.id

				// Update tenant with Stripe customer ID
				await client
					.from('tenants')
					.update({ stripe_customer_id: stripeCustomerId })
					.eq('id', tenant.id)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to create Stripe customer'
				await this.markSubscriptionFailed(client, lease.id, errorMessage)
				return
			}
		}

		// Create Stripe subscription with idempotency key for safe retries
		try {
			const subscription = await this.stripeConnectService.createSubscriptionOnConnectedAccount(
				connectedAccountId,
				{
					customerId: stripeCustomerId,
					rentAmount: lease.rent_amount,
					idempotencyKey: `lease-activation-${lease.id}`,
					metadata: {
						lease_id: lease.id,
						tenant_id: lease.primary_tenant_id
					}
				}
			)

			// Success: Update subscription status to active
			const { error: updateError } = await client
				.from('leases')
				.update({
					stripe_subscription_id: subscription.id,
					stripe_subscription_status: 'active',
					subscription_failure_reason: null,
					subscription_retry_count: 0,
					updated_at: new Date().toISOString()
				})
				.eq('id', lease.id)

			if (updateError) {
				this.logger.error('Failed to update lease with subscription ID', {
					leaseId: lease.id,
					subscriptionId: subscription.id,
					error: updateError.message
				})
				// Don't throw - subscription was created successfully, just log the error
				// Webhook will also confirm the subscription
			}

			// Emit subscription success event
			this.eventEmitter.emit('lease.subscription_created', {
				lease_id: lease.id,
				tenant_id: lease.primary_tenant_id,
				subscription_id: subscription.id
			})

			this.logger.log('Lease subscription created successfully', {
				leaseId: lease.id,
				subscriptionId: subscription.id
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown Stripe error'
			await this.markSubscriptionFailed(client, lease.id, errorMessage)

			// Emit failure event for alerting
			this.eventEmitter.emit('lease.subscription_failed', {
				lease_id: lease.id,
				tenant_id: lease.primary_tenant_id,
				error: errorMessage
			})
		}
	}

	/**
	 * Mark a lease's subscription as failed
	 * Increments retry count and records failure reason
	 */
	private async markSubscriptionFailed(
		client: ReturnType<SupabaseService['getAdminClient']>,
		leaseId: string,
		errorMessage: string
	): Promise<void> {
		this.logger.error('Stripe subscription creation failed', {
			leaseId,
			error: errorMessage
		})

		// Get current retry count
		const { data: lease } = await client
			.from('leases')
			.select('subscription_retry_count')
			.eq('id', leaseId)
			.single()

		const currentRetryCount = lease?.subscription_retry_count ?? 0

		await client
			.from('leases')
			.update({
				stripe_subscription_status: 'failed',
				subscription_failure_reason: errorMessage,
				subscription_retry_count: currentRetryCount + 1,
				subscription_last_attempt_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.eq('id', leaseId)
	}

	/**
	 * Get the signature status of a lease
	 * Authorization: Only the property owner or assigned tenant can view
	 */
	async getSignatureStatus(leaseId: string, userId: string): Promise<SignatureStatus> {
		const client = this.supabase.getAdminClient()

		const { data: lease, error } = await client
			.from('leases')
			.select('id, lease_status, owner_signed_at, tenant_signed_at, sent_for_signature_at, property_owner_id, primary_tenant_id, docuseal_submission_id')
			.eq('id', leaseId)
			.single()

		if (error || !lease) {
			throw new NotFoundException('Lease not found')
		}

		// Authorization check: user must be owner or tenant
		if (!lease.property_owner_id) {
			throw new NotFoundException('Lease has no owner assigned')
		}
		const isOwner = await this.isUserLeaseOwner(lease.property_owner_id, userId)

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
			throw new ForbiddenException('You do not have access to this lease')
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
	 * Get the DocuSeal signing URL for a user
	 * Returns the embed URL for the user to sign the document
	 */
	async getSigningUrl(leaseId: string, userId: string): Promise<string | null> {
		const client = this.supabase.getAdminClient()

		// Get lease with DocuSeal submission ID
		const { data: lease, error } = await client
			.from('leases')
			.select('id, docuseal_submission_id, property_owner_id, primary_tenant_id')
			.eq('id', leaseId)
			.single()

		if (error || !lease || !lease.docuseal_submission_id) {
			return null
		}

		// Determine if user is owner or tenant and get their email
		if (!lease.property_owner_id) {
			return null // Can't determine ownership without property_owner_id
		}
		let userEmail: string | null = null
		const isOwner = await this.isUserLeaseOwner(lease.property_owner_id, userId)

		if (isOwner) {
			// User is the owner - get their email
			const { data: ownerUser } = await client
				.from('users')
				.select('email')
				.eq('id', userId)
				.single()
			userEmail = ownerUser?.email || null
		} else {
			// Check if user is tenant
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
	 * Cancel/archive a DocuSeal submission (revoke signature request)
	 */
	async cancelSignatureRequest(ownerId: string, leaseId: string): Promise<void> {
		const client = this.supabase.getAdminClient()

		// Get lease and verify ownership
		const { data: lease, error } = await client
			.from('leases')
			.select('id, lease_status, property_owner_id, docuseal_submission_id')
			.eq('id', leaseId)
			.single()

		if (error || !lease) {
			throw new NotFoundException('Lease not found')
		}

		// Verify owner owns the lease (ownerId is auth.users.id)
		if (!lease.property_owner_id) {
			throw new NotFoundException('Lease has no owner assigned')
		}
		const isOwner = await this.isUserLeaseOwner(lease.property_owner_id, ownerId)
		if (!isOwner) {
			throw new ForbiddenException('You do not own this lease')
		}

		if (lease.lease_status !== 'pending_signature') {
			throw new BadRequestException('Only pending signature leases can be cancelled')
		}

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
			throw new BadRequestException('Failed to cancel signature request')
		}

		this.eventEmitter.emit('lease.signature_cancelled', {
			lease_id: leaseId
		})

		this.logger.log('Signature request cancelled', { leaseId })
	}
}
