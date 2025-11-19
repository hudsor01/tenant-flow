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
			.getAdminClient()
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
		user_id: string,
		userData: UserUpdate
	): Promise<Database['public']['Tables']['users']['Row']> {
		const { data, error } = await this.supabase
			.getAdminClient()
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
		user_id: string
	): Promise<Database['public']['Tables']['users']['Row'] | null> {
		const { data, error } = await this.supabase
			.getAdminClient()
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
