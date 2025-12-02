import { Injectable, InternalServerErrorException } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'

type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']

@Injectable()
export class UsersService {
	constructor(private readonly supabase: SupabaseService) {}

	async findUserByEmail(
		email: string
	): Promise<Database['public']['Tables']['users']['Row'] | null> {
		const { data, error } = await this.supabase
			.getAdminClient() // This method is used for authentication lookups, so admin client is appropriate
			.from('users')
			.select('*')
			.eq('email', email)
			.single()

		if (error) {
			return null
		}

		return data
	}

	async createUser(
		userData: UserInsert
	): Promise<Database['public']['Tables']['users']['Row']> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('users')
			.insert(userData)
			.select()
			.single()

		if (error) {
			throw new InternalServerErrorException(
				`Failed to create user: ${error.message}`
			)
		}

		return data
	}

	async updateUser(
		token: string,
		user_id: string,
		userData: UserUpdate
	): Promise<Database['public']['Tables']['users']['Row']> {
		// Verify user is authenticated and has permission to update this user
		const client = this.supabase.getUserClient(token)

		// First verify the user exists and they have access to it
		const { data: existingUser, error: fetchError } = await client
			.from('users')
			.select('id')
			.eq('id', user_id)
			.single()

		if (fetchError) {
			throw new InternalServerErrorException(
				`Failed to verify user access: ${fetchError.message}`
			)
		}

		if (!existingUser) {
			throw new InternalServerErrorException('User not found or access denied')
		}

		// Update the user with RLS enforcement
		const { data, error } = await client
			.from('users')
			.update(userData)
			.eq('id', user_id)
			.select()
			.single()

		if (error) {
			throw new InternalServerErrorException(
				`Failed to update user: ${error.message}`
			)
		}

		return data
	}

	async getUserById(
		token: string,
		user_id: string
	): Promise<Database['public']['Tables']['users']['Row'] | null> {
		const client = this.supabase.getUserClient(token)

		// Use RLS to enforce that user can only access their own data
		const { data, error } = await client
			.from('users')
			.select('*')
			.eq('id', user_id)
			.single()

		if (error) {
			return null
		}

		return data
	}
}
