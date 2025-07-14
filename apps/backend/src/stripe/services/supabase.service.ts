import { Injectable } from '@nestjs/common'
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
			throw new Error(`User not found: ${error.message}`)
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
			throw new Error(`Failed to fetch subscription: ${error.message}`)
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
			throw new Error(`Failed to update subscription: ${error.message}`)
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
			throw new Error(`Failed to create subscription: ${error.message}`)
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
			throw new Error(`Failed to upload file: ${error.message}`)
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
			throw new Error(`Failed to delete file: ${error.message}`)
		}

		return true
	}

	async listFiles(bucket: string, folder?: string) {
		const { data, error } = await this.supabase.storage
			.from(bucket)
			.list(folder)

		if (error) {
			throw new Error(`Failed to list files: ${error.message}`)
		}

		return data
	}
}