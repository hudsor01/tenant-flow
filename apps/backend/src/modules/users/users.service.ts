import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import { SupabaseQueryHelpers } from '../../shared/supabase/supabase-query-helpers'

type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']
type UserRow = Database['public']['Tables']['users']['Row']

@Injectable()
export class UsersService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly queryHelpers: SupabaseQueryHelpers
	) {}

	async findUserByEmail(email: string): Promise<UserRow> {
		const client = this.supabase.getAdminClient()

		return this.queryHelpers.querySingle<UserRow>(
			client.from('users').select('*').eq('email', email).single(),
			{
				resource: 'user',
				operation: 'findOne',
				metadata: { email }
			}
		)
	}

	async createUser(userData: UserInsert): Promise<UserRow> {
		const client = this.supabase.getAdminClient()

		return this.queryHelpers.querySingle<UserRow>(
			client.from('users').insert(userData).select().single(),
			{
				resource: 'user',
				operation: 'create'
			}
		)
	}

	async updateUser(userId: string, userData: UserUpdate): Promise<UserRow> {
		const client = this.supabase.getAdminClient()

		return this.queryHelpers.querySingle<UserRow>(
			client.from('users').update(userData).eq('id', userId).select().single(),
			{
				resource: 'user',
				id: userId,
				operation: 'update'
			}
		)
	}

	async getUserById(userId: string): Promise<UserRow> {
		const client = this.supabase.getAdminClient()

		return this.queryHelpers.querySingle<UserRow>(
			client.from('users').select('*').eq('id', userId).single(),
			{
				resource: 'user',
				id: userId,
				operation: 'findOne'
			}
		)
	}
}
