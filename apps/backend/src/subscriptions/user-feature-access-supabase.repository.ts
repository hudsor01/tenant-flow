import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { BaseSupabaseRepository } from '../common/repositories/base-supabase.repository'
import { SupabaseService } from '../common/supabase/supabase.service'
import { MultiTenantSupabaseService } from '../common/supabase/multi-tenant-supabase.service'

type UserFeatureAccessRow =
	Database['public']['Tables']['UserFeatureAccess']['Row']
type UserFeatureAccessInsert =
	Database['public']['Tables']['UserFeatureAccess']['Insert']
type UserFeatureAccessUpdate =
	Database['public']['Tables']['UserFeatureAccess']['Update']

/**
 * Supabase repository for UserFeatureAccess entity
 * Handles user feature access permissions and limits
 */
@Injectable()
export class UserFeatureAccessSupabaseRepository extends BaseSupabaseRepository<UserFeatureAccessRow> {
	protected readonly tableName = 'UserFeatureAccess'

	constructor(
		supabaseService: SupabaseService,
		multiTenantService: MultiTenantSupabaseService
	) {
		super(supabaseService, multiTenantService)
	}

	/**
	 * Find feature access by user ID
	 */
	async findByUserId(
		userId: string,
		userToken?: string
	): Promise<UserFeatureAccessRow | null> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from(this.tableName)
				.select('*')
				.eq('userId', userId)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					// No rows returned
					return null
				}
				throw error
			}

			return data
		} catch (error) {
			this.logger.error(
				`Failed to find feature access for user ${userId}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Upsert user feature access
	 */
	async upsertUserAccess(
		accessData: UserFeatureAccessInsert,
		userId?: string,
		userToken?: string
	): Promise<UserFeatureAccessRow> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from(this.tableName)
				.upsert(accessData, {
					onConflict: 'userId'
				})
				.select()
				.single()

			if (error) {
				throw error
			}

			return data
		} catch (error) {
			this.logger.error('Failed to upsert user feature access:', error)
			throw error
		}
	}

	/**
	 * Update feature access by user ID
	 */
	async updateByUserId(
		userId: string,
		updateData: UserFeatureAccessUpdate,
		userToken?: string
	): Promise<UserFeatureAccessRow | null> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from(this.tableName)
				.update({
					...updateData,
					lastUpdated: new Date().toISOString()
				})
				.eq('userId', userId)
				.select()
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					// No rows updated
					return null
				}
				throw error
			}

			return data
		} catch (error) {
			this.logger.error(
				`Failed to update feature access for user ${userId}:`,
				error
			)
			throw error
		}
	}
}
