import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import type { Database } from '@repo/shared/types/supabase-generated'

type UserInsert = Database['public']['Tables']['User']['Insert']
type UserUpdate = Database['public']['Tables']['User']['Update']

@Injectable()
export class UsersService {
	constructor(private readonly supabase: SupabaseService) {}

	async findUserByEmail(email: string) {
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

	async createUser(userData: UserInsert) {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('User')
			.insert(userData)
			.select()
			.single()

		if (error) {
			throw new Error(`Failed to create user: ${error.message}`)
		}

		return data
	}

	async updateUser(userId: string, userData: UserUpdate) {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('User')
			.update(userData)
			.eq('id', userId)
			.select()
			.single()

		if (error) {
			throw new Error(`Failed to update user: ${error.message}`)
		}

		return data
	}

	async getUserById(userId: string) {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('users')
			.select('*')
			.eq('id', userId)
			.single()

		if (error) {
			return null
		}

		return data
	}
}