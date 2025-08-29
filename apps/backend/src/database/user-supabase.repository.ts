import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import type { User, Subscription } from '@repo/shared/types/database'
import { UserRole } from '@repo/shared/types/security'

// Type guard for database role enum to TypeScript UserRole
function isValidUserRole(role: string): role is UserRole {
	return ['OWNER', 'MANAGER', 'TENANT', 'ADMIN'].includes(role)
}

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

		if (!data) return null
		
		if (!isValidUserRole(data.role)) {
			throw new Error(`Invalid user role from database: ${data.role}`)
		}
		
		return {
			...data,
			role: data.role
		}
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

		if (!data) return null
		
		if (!isValidUserRole(data.role)) {
			throw new Error(`Invalid user role from database: ${data.role}`)
		}
		
		return {
			...data,
			role: data.role
		}
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

		if (!data) return null
		
		if (!isValidUserRole(data.role)) {
			throw new Error(`Invalid user role from database: ${data.role}`)
		}
		
		return {
			...data,
			role: data.role,
			Subscription: data.Subscription || []
		}
	}
}
