import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import type { UserRole } from '@repo/shared'

// Define UserCreationResult locally
export interface UserCreationResult {
	success: boolean
	error?: string
	userId?: string
	action?: string
	details?: {
		userId?: string
		email?: string
		name?: string | null
		message?: string
	}
}

interface UserCreationOptions {
	role?: UserRole
	name?: string
	maxRetries?: number
	retryDelayMs?: number
}

@Injectable()
export class UsersService {
	private readonly logger = new Logger(UsersService.name)

	constructor(private supabase: SupabaseService) {}

	async getUserById(id: string) {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('User')
			.select(
				'id, email, name, phone, bio, avatarUrl, role, createdAt, updatedAt, stripeCustomerId'
			)
			.eq('id', id)
			.single()

		if (error) {
			this.logger.error('Failed to get user by ID', { error, id })
			return null
		}
		return data
	}

	async updateUser(
		id: string,
		data: {
			stripeCustomerId?: string
			name?: string
			email?: string
			[key: string]: unknown
		}
	) {
		const { data: user, error } = await this.supabase
			.getAdminClient()
			.from('User')
			.update({
				...data,
				updatedAt: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single()

		if (error) {
			this.logger.error('Failed to update user', { error, id })
			throw error
		}
		return user
	}

	async updateUserProfile(
		id: string,
		data: {
			name?: string
			phone?: string
			bio?: string
			avatarUrl?: string
		}
	) {
		const { data: user, error } = await this.supabase
			.getAdminClient()
			.from('User')
			.update({
				...data,
				updatedAt: new Date().toISOString()
			})
			.eq('id', id)
			.select(
				'id, email, name, phone, bio, avatarUrl, role, createdAt, updatedAt, stripeCustomerId'
			)
			.single()

		if (error) {
			this.logger.error('Failed to update user profile', { error, id })
			throw error
		}
		return user
	}

	/**
	 * Check if a User record exists in the database
	 */
	async checkUserExists(userId: string): Promise<boolean> {
		try {
			const { data: user, error } = await this.supabase
				.getAdminClient()
				.from('User')
				.select('id')
				.eq('id', userId)
				.single()

			if (error && error.code !== 'PGRST116') {
				// PGRST116 is 'not found' error
				this.logger.warn('Failed to check user existence', {
					userId,
					error: error.message
				})
			}
			return !!user
		} catch (error) {
			this.logger.warn('Failed to check user existence', {
				userId,
				error: error instanceof Error ? error.message : String(error)
			})
			return false
		}
	}

	/**
	 * Ensures a User record exists for the given auth user.
	 * This is the main entry point that handles all scenarios.
	 */
	async ensureUserExists(
		authUser: {
			id: string
			email: string
			user_metadata?: {
				name?: string
				full_name?: string
			}
		},
		options: UserCreationOptions = {}
	): Promise<UserCreationResult> {
		const {
			role = 'OWNER',
			name,
			maxRetries = 3,
			retryDelayMs = 1000
		} = options

		try {
			// Step 1: Check if user already exists
			const existingUser = await this.checkUserExists(authUser.id)
			if (existingUser) {
				return {
					success: true,
					userId: authUser.id,
					action: 'already_exists'
				}
			}

			// Step 2: User doesn't exist, create with retries
			let lastError:
				| string
				| Record<string, string | number | boolean | null> = {}
			for (let attempt = 1; attempt <= maxRetries; attempt++) {
				try {
					const result = await this.createUser(authUser, {
						role,
						name:
							name ||
							authUser.user_metadata?.name ||
							authUser.user_metadata?.full_name
					})

					if (result.success) {
						return result
					} else {
						lastError = result.error || 'Unknown error'
						this.logger.warn(
							`User creation failed (attempt ${attempt}/${maxRetries})`,
							{ error: result.error }
						)
					}
				} catch (err) {
					lastError = String(err)
					this.logger.warn(
						`User creation attempt failed (${attempt}/${maxRetries})`,
						{ error: err }
					)

					// Don't retry on certain types of errors
					if (this.isNonRetryableError(err as Error)) {
						break
					}
				}

				// Wait before retry (exponential backoff)
				if (attempt < maxRetries) {
					const delay = retryDelayMs * Math.pow(2, attempt - 1)
					await new Promise(resolve => setTimeout(resolve, delay))
				}
			}

			return {
				success: false,
				error: `Failed to create user after ${maxRetries} attempts`,
				details: { message: String(lastError) }
			}
		} catch (error) {
			return {
				success: false,
				error: 'Unexpected error during user creation',
				details: { message: String(error) }
			}
		}
	}

	/**
	 * Create user record
	 */
	private async createUser(
		authUser: {
			id: string
			email: string
		},
		options: { role: string; name?: string }
	): Promise<UserCreationResult> {
		try {
			// Use upsert to handle race conditions
			const { data: user, error } = await this.supabase
				.getAdminClient()
				.from('User')
				.upsert({
					id: authUser.id,
					supabaseId: authUser.id,
					email: authUser.email,
					name: options.name || null,
					role: options.role as UserRole,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				})
				.select()
				.single()

			if (error) {
				throw error
			}

			return {
				success: true,
				userId: user.id,
				action: 'created',
				details: {
					userId: user.id,
					email: user.email,
					name: user.name
				}
			}
		} catch (error) {
			return {
				success: false,
				error: 'Failed to create user record',
				details: { message: String(error) }
			}
		}
	}

	/**
	 * Determine if an error should not be retried
	 */
	private isNonRetryableError(
		error: string | Error | Record<string, string | number | boolean | null>
	): boolean {
		if (!error) {
			return false
		}

		const errorObject = error as { message?: string; code?: string }
		const message = errorObject?.message?.toLowerCase() || ''

		// Don't retry on validation errors, constraint violations, etc.
		return (
			message.includes('unique constraint') ||
			message.includes('invalid input') ||
			message.includes('permission denied') ||
			message.includes('already exists') ||
			errorObject?.code === '23505' // PostgreSQL unique violation
		)
	}

	/**
	 * Verify that user creation was successful
	 */
	async verifyUserCreation(userId: string): Promise<boolean> {
		try {
			// Wait a moment for any async operations to complete
			await new Promise(resolve => setTimeout(resolve, 500))

			const userExists = await this.checkUserExists(userId)
			return userExists
		} catch (error) {
			this.logger.warn('Failed to verify user creation', {
				userId,
				error: error instanceof Error ? error.message : String(error)
			})
			return false
		}
	}
}
