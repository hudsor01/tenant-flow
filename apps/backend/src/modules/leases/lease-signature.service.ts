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

		// Step 4: Get owner and tenant details for DocuSeal
		const { data: owner } = await client
			.from('property_owners')
			.select('id, user_id')
			.eq('id', ownerId)
			.single()

		let ownerUser: { email: string; first_name: string | null; last_name: string | null } | null = null
		if (owner?.user_id) {
			const { data } = await client
				.from('users')
				.select('email, first_name, last_name')
				.eq('id', owner.user_id)
				.single()
			ownerUser = data
		}

		const { data: tenant } = await client
			.from('tenants')
			.select('id, user_id')
			.eq('id', lease.primary_tenant_id)
			.single()

		let tenantUser: { email: string; first_name: string | null; last_name: string | null } | null = null
		if (tenant?.user_id) {
			const { data } = await client
				.from('users')
				.select('email, first_name, last_name')
				.eq('id', tenant.user_id)
				.single()
			tenantUser = data
		}

		// Step 5: Create DocuSeal submission if enabled
		let docusealSubmissionId: string | null = null

		if (this.docuSealService.isEnabled() && options?.templateId) {
			try {
				const unit = lease.unit as { unit_number?: string; property?: { name?: string; address?: string } } | null
				const propertyAddress = unit?.property?.address || unit?.property?.name || 'Property Address'

				const submission = await this.docuSealService.createLeaseSubmission({
					templateId: options.templateId,
					leaseId: lease.id,
					ownerEmail: ownerUser?.email || '',
					ownerName: `${ownerUser?.first_name || ''} ${ownerUser?.last_name || ''}`.trim() || 'Property Owner',
					tenantEmail: tenantUser?.email || '',
					tenantName: `${tenantUser?.first_name || ''} ${tenantUser?.last_name || ''}`.trim() || 'Tenant',
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

		// Step 1: Get lease
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select('id, lease_status, property_owner_id, owner_signed_at, tenant_signed_at, rent_amount, primary_tenant_id')
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

		// Step 3: Verify lease is in correct status
		if (lease.lease_status !== 'pending_signature' && lease.lease_status !== 'draft') {
			throw new BadRequestException('Lease cannot be signed in its current status')
		}

		// Step 4: Check if already signed
		if (lease.owner_signed_at) {
			throw new BadRequestException('Owner has already signed this lease')
		}

		// Step 5: Record owner signature
		const now = new Date().toISOString()
		const tenantAlreadySigned = !!lease.tenant_signed_at
		const bothWillBeSigned = tenantAlreadySigned

		if (bothWillBeSigned) {
			// Both parties will have signed - activate the lease
			await this.activateLease(client, lease, {
				owner_signed_at: now,
				owner_signature_ip: signatureIp
			})
		} else {
			// Just record owner signature
			const { error: updateError } = await client
				.from('leases')
				.update({
					owner_signed_at: now,
					owner_signature_ip: signatureIp
				})
				.eq('id', leaseId)

			if (updateError) {
				throw new BadRequestException('Failed to record signature')
			}

			this.eventEmitter.emit('lease.owner_signed', {
				lease_id: leaseId,
				signed_at: now
			})
		}

		this.logger.log('Owner signed lease', { leaseId, bothSigned: bothWillBeSigned })
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

		// Step 2: Get lease
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select('id, lease_status, property_owner_id, primary_tenant_id, owner_signed_at, tenant_signed_at, rent_amount')
			.eq('id', leaseId)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found')
		}

		// Step 3: Verify tenant is assigned to this lease
		if (lease.primary_tenant_id !== tenant.id) {
			throw new ForbiddenException('You are not assigned to this lease')
		}

		// Step 4: Verify lease is in pending_signature status
		if (lease.lease_status !== 'pending_signature') {
			throw new BadRequestException('Lease must be pending signature to sign')
		}

		// Step 5: Check if already signed
		if (lease.tenant_signed_at) {
			throw new BadRequestException('Tenant has already signed this lease')
		}

		// Step 6: Record tenant signature
		const now = new Date().toISOString()
		const ownerAlreadySigned = !!lease.owner_signed_at
		const bothWillBeSigned = ownerAlreadySigned

		if (bothWillBeSigned) {
			// Both parties will have signed - activate the lease
			await this.activateLease(client, lease, {
				tenant_signed_at: now,
				tenant_signature_ip: signatureIp
			})
		} else {
			// Just record tenant signature
			const { error: updateError } = await client
				.from('leases')
				.update({
					tenant_signed_at: now,
					tenant_signature_ip: signatureIp
				})
				.eq('id', leaseId)

			if (updateError) {
				throw new BadRequestException('Failed to record signature')
			}

			this.eventEmitter.emit('lease.tenant_signed', {
				lease_id: leaseId,
				tenant_id: tenant.id,
				signed_at: now
			})
		}

		this.logger.log('Tenant signed lease', { leaseId, bothSigned: bothWillBeSigned })
	}

	/**
	 * Activate lease and create Stripe subscription (called when both parties sign)
	 */
	private async activateLease(
		client: ReturnType<SupabaseService['getAdminClient']>,
		lease: {
			id: string
			property_owner_id: string | null
			primary_tenant_id: string
			rent_amount: number
		},
		signatureData: {
			owner_signed_at?: string
			owner_signature_ip?: string
			tenant_signed_at?: string
			tenant_signature_ip?: string
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

		// Step 2: Get tenant with user profile (for email)
		const { data: tenant, error: tenantError } = await client
			.from('tenants')
			.select('id, user_id, stripe_customer_id')
			.eq('id', lease.primary_tenant_id)
			.single()

		if (tenantError || !tenant) {
			throw new NotFoundException('Tenant not found')
		}

		// Get user info for email
		const { data: user } = await client
			.from('users')
			.select('email, first_name, last_name, phone')
			.eq('id', tenant.user_id)
			.single()

		let stripeCustomerId = tenant.stripe_customer_id

		// Create Stripe customer on connected account if needed
		if (!stripeCustomerId) {
			const customerName = user
				? `${user.first_name || ''} ${user.last_name || ''}`.trim() || undefined
				: undefined

			// Build params object conditionally to satisfy exactOptionalPropertyTypes
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
				owner.stripe_account_id,
				createCustomerParams
			)
			stripeCustomerId = customer.id

			// Update tenant with Stripe customer ID
			await client
				.from('tenants')
				.update({ stripe_customer_id: stripeCustomerId })
				.eq('id', tenant.id)
		}

		// Step 3: Create Stripe subscription
		const subscription = await this.stripeConnectService.createSubscriptionOnConnectedAccount(
			owner.stripe_account_id,
			{
				customerId: stripeCustomerId,
				rentAmount: lease.rent_amount
			}
		)

		// Step 4: Update lease to active status with subscription ID
		const { error: updateError } = await client
			.from('leases')
			.update({
				...signatureData,
				lease_status: 'active',
				stripe_subscription_id: subscription.id
			})
			.eq('id', lease.id)

		if (updateError) {
			throw new BadRequestException('Failed to activate lease')
		}

		// Step 5: Emit lease activated event
		this.eventEmitter.emit('lease.activated', {
			lease_id: lease.id,
			tenant_id: lease.primary_tenant_id,
			subscription_id: subscription.id
		})

		this.logger.log('Lease activated with Stripe subscription', {
			leaseId: lease.id,
			subscriptionId: subscription.id
		})
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
				tenant_signed_at: null,
				tenant_signature_ip: null
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
