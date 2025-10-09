import { Injectable, InternalServerErrorException } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../database/supabase.service'

type UserInsert = Database['public']['Tables']['User']['Insert']
type UserUpdate = Database['public']['Tables']['User']['Update']

@Injectable()
export class UsersService {
	constructor(private readonly supabase: SupabaseService) {}

	async findUserByEmail(
		email: string
	): Promise<Database['public']['Tables']['User']['Row'] | null> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('User')
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
	): Promise<Database['public']['Tables']['User']['Row']> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('User')
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
		userId: string,
		userData: UserUpdate
	): Promise<Database['public']['Tables']['User']['Row']> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('User')
			.update(userData)
			.eq('id', userId)
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
		userId: string
	): Promise<Database['public']['Tables']['User']['Row'] | null> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('User')
			.select('*')
			.eq('id', userId)
			.single()

		if (error) {
			return null
		}

		return data
	}
}
