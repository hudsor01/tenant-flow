import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'

@Injectable()
export class PaymentMethodsService {
	private readonly logger = new Logger(PaymentMethodsService.name)
	private readonly stripe: Stripe

	constructor(private readonly supabase: SupabaseService) {
		this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
			apiVersion: '2025-09-30.clover'
		})
	} /**
	 * Get or create Stripe customer for a user.
	 * Caches the Stripe customer ID on the User record to avoid duplicate customers.
	 */
	async getOrCreateStripeCustomer(userId: string, email?: string) {
		const adminClient = this.supabase.getAdminClient()

		const { data: user, error } = await adminClient
			.from('User')
			.select('stripeCustomerId, email')
			.eq('id', userId)
			.single()

		if (error) {
			this.logger.error('Failed to load user while resolving Stripe customer', {
				userId,
				error: error.message
			})
			throw new NotFoundException('User not found for Stripe customer lookup')
		}

		if (user?.stripeCustomerId) {
			return user.stripeCustomerId
		}

		this.logger.log(`Creating Stripe customer for user ${userId}`)
		const customer = await this.stripe.customers.create({
			email: email || user?.email || undefined,
			metadata: { userId }
		})

		const { error: updateError } = await adminClient
			.from('User')
			.update({
				stripeCustomerId: customer.id,
				updatedAt: new Date().toISOString()
			})
			.eq('id', userId)

		if (updateError) {
			this.logger.error('Failed to persist Stripe customer ID', {
				userId,
				error: updateError.message
			})
		}

		return customer.id
	}

	/**
	 * Create a Stripe SetupIntent so the tenant can add a payment method.
	 * Supports both card and ACH (us_bank_account) payment method types.
	 */
	async createSetupIntent(
		userId: string,
		email: string | undefined,
		paymentMethodType: 'card' | 'us_bank_account'
	) {
		if (!userId) {
			throw new BadRequestException('User not authenticated')
		}

		this.logger.log('Creating payment method SetupIntent', {
			userId,
			paymentMethodType
		})

		const stripeCustomerId = await this.getOrCreateStripeCustomer(userId, email)

		const setupIntentParams: Stripe.SetupIntentCreateParams = {
			customer: stripeCustomerId,
			payment_method_types: [paymentMethodType],
			usage: 'off_session'
		}

		if (paymentMethodType === 'us_bank_account') {
			setupIntentParams.payment_method_options = {
				us_bank_account: {
					verification_method: 'instant',
					financial_connections: {
						permissions: ['payment_method', 'balances']
					}
				}
			}
		}

		const setupIntent = await this.stripe.setupIntents.create(setupIntentParams)

		return {
			clientSecret: setupIntent.client_secret ?? null,
			setupIntentId: setupIntent.id
		}
	}

	/**
	 * Save a confirmed Stripe payment method in the TenantPaymentMethod table.
	 * Automatically flags the first method as default and ensures ownership checks.
	 */
	async savePaymentMethod(userId: string, stripePaymentMethodId: string) {
		if (!userId || !stripePaymentMethodId) {
			throw new BadRequestException('Missing required payment method details')
		}

		this.logger.log('Saving tenant payment method', {
			userId,
			stripePaymentMethodId
		})

		const adminClient = this.supabase.getAdminClient()
		const stripeCustomerId = await this.getOrCreateStripeCustomer(userId)

		const paymentMethod = await this.stripe.paymentMethods.retrieve(
			stripePaymentMethodId
		)

		if (paymentMethod.customer && paymentMethod.customer !== stripeCustomerId) {
			this.logger.error('Payment method attached to different customer', {
				userId,
				expectedCustomer: stripeCustomerId,
				paymentMethodCustomer: paymentMethod.customer
			})
			throw new BadRequestException(
				'Payment method is linked to a different customer'
			)
		}

		if (!paymentMethod.customer) {
			await this.stripe.paymentMethods.attach(stripePaymentMethodId, {
				customer: stripeCustomerId
			})
		}

		const { data: existing, error: existingError } = await adminClient
			.from('TenantPaymentMethod')
			.select('id')
			.match({
				tenantId: userId,
				stripePaymentMethodId
			})
			.maybeSingle()

		if (existingError) {
			this.logger.error('Failed to check for existing payment method', {
				userId,
				stripePaymentMethodId,
				error: existingError.message
			})
			throw new BadRequestException('Failed to save payment method')
		}

		if (existing) {
			this.logger.log('Payment method already saved, skipping insert', {
				userId,
				stripePaymentMethodId
			})
			return { success: true }
		}

		const { data: existingMethods, error: listError } = await adminClient
			.from('TenantPaymentMethod')
			.select('id')
			.eq('tenantId', userId)

		if (listError) {
			this.logger.error('Failed to load tenant payment methods', {
				userId,
				error: listError.message
			})
			throw new BadRequestException('Failed to save payment method')
		}

		const shouldBeDefault = !existingMethods || existingMethods.length === 0

		if (shouldBeDefault) {
			await adminClient
				.from('TenantPaymentMethod')
				.update({
					isDefault: false,
					updatedAt: new Date().toISOString()
				})
				.eq('tenantId', userId)
		}

		const { error } = await adminClient.from('TenantPaymentMethod').insert({
			tenantId: userId,
			stripePaymentMethodId,
			stripeCustomerId,
			type: paymentMethod.type,
			last4:
				paymentMethod.card?.last4 ||
				paymentMethod.us_bank_account?.last4 ||
				null,
			brand: paymentMethod.card?.brand || null,
			bankName: paymentMethod.us_bank_account?.bank_name || null,
			isDefault: shouldBeDefault,
			verificationStatus:
				paymentMethod.type === 'card' ? 'verified' : 'verified', // US bank accounts are verified through Financial Connections during setup
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		})

		if (error) {
			this.logger.error('Failed to save tenant payment method', {
				userId,
				stripePaymentMethodId,
				error: error.message
			})
			throw new BadRequestException('Failed to save payment method')
		}

		return { success: true }
	}

	/**
	 * List payment methods saved by the authenticated tenant.
	 */
	async listPaymentMethods(userId: string) {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('TenantPaymentMethod')
			.select(
				'id, tenantId, stripePaymentMethodId, type, last4, brand, bankName, isDefault, verificationStatus, createdAt, updatedAt'
			)
			.eq('tenantId', userId)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch tenant payment methods', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to load payment methods')
		}

		return data ?? []
	}

	/**
	 * Mark a tenant payment method as the default option.
	 */
	async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
		const adminClient = this.supabase.getAdminClient()

		const { data: paymentMethod, error: fetchError } = await adminClient
			.from('TenantPaymentMethod')
			.select('id')
			.eq('id', paymentMethodId)
			.eq('tenantId', userId)
			.single()

		if (fetchError || !paymentMethod) {
			this.logger.warn(
				'Attempt to set default for non-existent payment method',
				{
					userId,
					paymentMethodId,
					error: fetchError?.message
				}
			)
			throw new NotFoundException('Payment method not found')
		}

		const now = new Date().toISOString()

		await adminClient
			.from('TenantPaymentMethod')
			.update({ isDefault: false, updatedAt: now })
			.eq('tenantId', userId)

		const { error } = await adminClient
			.from('TenantPaymentMethod')
			.update({ isDefault: true, updatedAt: now })
			.eq('id', paymentMethodId)
			.eq('tenantId', userId)

		if (error) {
			this.logger.error('Failed to update default payment method', {
				userId,
				paymentMethodId,
				error: error.message
			})
			throw new BadRequestException('Failed to set default payment method')
		}

		return { success: true }
	}

	/**
	 * Delete a tenant payment method both in Stripe and in the database.
	 * If the deleted method was default, promote the next oldest method.
	 */
	async deletePaymentMethod(userId: string, paymentMethodId: string) {
		const adminClient = this.supabase.getAdminClient()

		const { data: paymentMethod, error: fetchError } = await adminClient
			.from('TenantPaymentMethod')
			.select('stripePaymentMethodId, isDefault')
			.eq('id', paymentMethodId)
			.eq('tenantId', userId)
			.single()

		if (fetchError || !paymentMethod) {
			this.logger.warn('Attempted to delete unknown payment method', {
				userId,
				paymentMethodId,
				error: fetchError?.message
			})
			throw new NotFoundException('Payment method not found')
		}

		if (paymentMethod.stripePaymentMethodId) {
			await this.stripe.paymentMethods.detach(
				paymentMethod.stripePaymentMethodId
			)
		}

		const { error } = await adminClient
			.from('TenantPaymentMethod')
			.delete()
			.eq('id', paymentMethodId)
			.eq('tenantId', userId)

		if (error) {
			this.logger.error('Failed to delete payment method', {
				userId,
				paymentMethodId,
				error: error.message
			})
			throw new BadRequestException('Failed to delete payment method')
		}

		if (paymentMethod.isDefault) {
			const { data: nextDefault } = await adminClient
				.from('TenantPaymentMethod')
				.select('id')
				.eq('tenantId', userId)
				.order('createdAt', { ascending: true })
				.limit(1)

			if (nextDefault && nextDefault.length > 0) {
				const firstMethod = nextDefault[0]
				if (firstMethod) {
					await adminClient
						.from('TenantPaymentMethod')
						.update({
							isDefault: true,
							updatedAt: new Date().toISOString()
						})
						.eq('id', firstMethod.id)
				}
			}
		}

		return { success: true }
	}
}
