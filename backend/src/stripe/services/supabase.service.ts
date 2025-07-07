import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

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
			.select('id, email, name, firstName, lastName')
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
	async updateSubscription(subscriptionId: string, updates: any) {
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
	async createSubscription(subscriptionData: any) {
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
}