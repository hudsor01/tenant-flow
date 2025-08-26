<<<<<<< HEAD
import { Injectable, InternalServerErrorException } from '@nestjs/common'
=======
import { Injectable } from '@nestjs/common'
>>>>>>> origin/main
import { SupabaseService } from '../database/supabase.service'
import type { Database } from '@repo/shared/types/supabase-generated'

type UserInsert = Database['public']['Tables']['User']['Insert']
type UserUpdate = Database['public']['Tables']['User']['Update']

@Injectable()
export class UsersService {
	constructor(private readonly supabase: SupabaseService) {}

<<<<<<< HEAD
	async findUserByEmail(
		email: string
	): Promise<Database['public']['Tables']['User']['Row'] | null> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('User')
=======
	async findUserByEmail(email: string) {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('users')
>>>>>>> origin/main
			.select('*')
			.eq('email', email)
			.single()

		if (error) {
			return null
<<<<<<< HEAD
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
=======
>>>>>>> origin/main
		}

		return data
	}

<<<<<<< HEAD
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

=======
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

>>>>>>> origin/main
		return data
	}
}
