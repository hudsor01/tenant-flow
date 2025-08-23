import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import type { Subscription, User } from '@repo/shared'

export interface UserWithSubscription extends User {
	Subscription?: Subscription[]
}

@Injectable()
export class UserSupabaseRepository {
	constructor(private readonly supabaseService: SupabaseService) {}

	async findByStripeCustomerId(
		stripeCustomerId: string
	): Promise<User | null> {
		const { data } = await this.supabaseService
			.getAdminClient()
			.from('User')
			.select('*')
			.eq('stripeCustomerId', stripeCustomerId)
			.single()

		return data ? { 
			...data, 
			organizationId: null,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt)
		} : null
	}

	async updateStripeCustomerId(
		userId: string,
		stripeCustomerId: string
	): Promise<void> {
		await this.supabaseService
			.getAdminClient()
			.from('User')
			.update({ stripeCustomerId })
			.eq('id', userId)
	}

	async findById(userId: string): Promise<User | null> {
		const { data } = await this.supabaseService
			.getAdminClient()
			.from('User')
			.select('*')
			.eq('id', userId)
			.single()

		return data ? { 
			...data, 
			organizationId: null,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt)
		} : null
	}

	async findByIdWithSubscription(
		userId: string
	): Promise<UserWithSubscription | null> {
		const { data } = await this.supabaseService
			.getAdminClient()
			.from('User')
			.select('*, Subscription(*)')
			.eq('id', userId)
			.single()

		return data as UserWithSubscription | null
	}
}
