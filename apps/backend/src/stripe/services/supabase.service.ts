import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

interface SubscriptionUpdate {
	status?: string
	plan?: string
	startDate?: string
	endDate?: string | null
	cancelledAt?: string | null
	cancelAtPeriodEnd?: boolean
	currentPeriodStart?: string
	currentPeriodEnd?: string
	stripeCustomerId?: string
	stripeSubscriptionId?: string
	stripePriceId?: string
	planId?: string
	billingPeriod?: string
	updatedAt?: string
}

interface CreateSubscriptionData {
	userId: string
	plan: string
	status: string
	startDate: string
	endDate?: string | null
	stripeCustomerId: string
	stripeSubscriptionId: string
	stripePriceId?: string
	planId?: string
	billingPeriod?: string
	currentPeriodStart: string
	currentPeriodEnd: string
	cancelAtPeriodEnd: boolean
	createdAt: string
	updatedAt: string
}

@Injectable()
export class SupabaseService {
	private readonly supabase: SupabaseClient
	private readonly logger = new Logger(SupabaseService.name)

	constructor(private configService: ConfigService) {
		const supabaseUrl = this.configService.get<string>('VITE_SUPABASE_URL') || this.configService.get<string>('SUPABASE_URL')
		const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new Error('Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
		}

		this.supabase = createClient(supabaseUrl, supabaseServiceKey)
	}

	getClient(): SupabaseClient {
		return this.supabase
	}

	// Helper method to get user by ID
	async getUserById(userId: string) {
		const { data: user, error } = await this.supabase
			.from('User')
			.select('id, email, name')
			.eq('id', userId)
			.single()

		if (error) {
			this.logger.error('User lookup failed', error)
			throw new Error('User not found')
		}

		return user
	}

	// Helper method to get subscription by user ID
	async getSubscriptionByUserId(userId: string) {
		const { data: subscription, error } = await this.supabase
			.from('Subscription')
			.select('*')
			.eq('userId', userId)
			.single()

		if (error && error.code !== 'PGRST116') {
			this.logger.error('Subscription lookup failed', error)
			throw new Error('Failed to fetch subscription')
		}

		return subscription
	}

	// Helper method to update subscription
	async updateSubscription(subscriptionId: string, updates: Partial<SubscriptionUpdate>) {
		const { data, error } = await this.supabase
			.from('Subscription')
			.update(updates)
			.eq('id', subscriptionId)
			.select()
			.single()

		if (error) {
			this.logger.error('Subscription update failed', error)
			throw new Error('Failed to update subscription')
		}

		return data
	}

	// Helper method to create subscription
	async createSubscription(subscriptionData: CreateSubscriptionData) {
		const { data, error } = await this.supabase
			.from('Subscription')
			.insert(subscriptionData)
			.select()
			.single()

		if (error) {
			this.logger.error('Subscription creation failed', error)
			throw new Error('Failed to create subscription')
		}

		return data
	}

	// File storage methods
	async uploadFile(
		bucket: string, 
		path: string, 
		file: Buffer, 
		options?: {
			contentType?: string
			cacheControl?: string
			upsert?: boolean
		}
	) {
		const { data, error } = await this.supabase.storage
			.from(bucket)
			.upload(path, file, {
				contentType: options?.contentType,
				cacheControl: options?.cacheControl || '3600',
				upsert: options?.upsert || false
			})

		if (error) {
			this.logger.error('File upload failed', error)
			throw new Error('Failed to upload file')
		}

		return data
	}

	async getPublicUrl(bucket: string, path: string) {
		const { data } = this.supabase.storage
			.from(bucket)
			.getPublicUrl(path)

		return data.publicUrl
	}

	async deleteFile(bucket: string, path: string) {
		const { error } = await this.supabase.storage
			.from(bucket)
			.remove([path])

		if (error) {
			this.logger.error('File deletion failed', error)
			throw new Error('Failed to delete file')
		}

		return true
	}

	async listFiles(bucket: string, folder?: string) {
		const { data, error } = await this.supabase.storage
			.from(bucket)
			.list(folder)

		if (error) {
			this.logger.error('File listing failed', error)
			throw new Error('Failed to list files')
		}

		return data
	}
}