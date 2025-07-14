import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import type { UserRole } from '../types/auth'

export interface UserCreationResult {
	success: boolean
	userId?: string
	error?: string
	action?: string
	details?: Record<string, unknown>
}

export interface UserCreationOptions {
	role?: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN'
	name?: string
	maxRetries?: number
	retryDelayMs?: number
}

@Injectable()
export class UsersService {
	constructor(private prisma: PrismaService) {}

	async getUserById(id: string) {
		return await this.prisma.user.findUnique({
			where: { id },
			select: {
				id: true,
				email: true,
				name: true,
				phone: true,
				bio: true,
				avatarUrl: true,
				role: true,
				createdAt: true,
				updatedAt: true
			}
		})
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
		return await this.prisma.user.update({
			where: { id },
			data: {
				...data,
				updatedAt: new Date()
			},
			select: {
				id: true,
				email: true,
				name: true,
				phone: true,
				bio: true,
				avatarUrl: true,
				role: true,
				createdAt: true,
				updatedAt: true
			}
		})
	}

	/**
	 * Check if a User record exists in the database
	 */
	async checkUserExists(userId: string): Promise<boolean> {
		try {
			const user = await this.prisma.user.findUnique({
				where: { id: userId },
				select: { id: true }
			})
			return !!user
		} catch (error) {
			console.error('Error checking user existence:', error)
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
			let lastError: unknown = null
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
						lastError = result.error
						console.warn(
							`User creation failed (attempt ${attempt}/${maxRetries}):`,
							result.error
						)
					}
				} catch (error) {
					lastError = error
					console.warn(
						`User creation attempt failed (${attempt}/${maxRetries}):`,
						error
					)

					// Don't retry on certain types of errors
					if (this.isNonRetryableError(error)) {
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
				details: lastError as Record<string, unknown>
			}
		} catch (error) {
			console.error('Unexpected error in ensureUserExists:', error)
			return {
				success: false,
				error: 'Unexpected error during user creation',
				details: error as Record<string, unknown>
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
			const user = await this.prisma.user.upsert({
				where: { id: authUser.id },
				update: {
					name: options.name,
					updatedAt: new Date()
				},
				create: {
					id: authUser.id,
					email: authUser.email,
					name: options.name || null,
					role: options.role as UserRole,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			})

			return {
				success: true,
				userId: user.id,
				action: 'created',
				details: { user }
			}
		} catch (error) {
			console.error('Error creating user:', error)
			return {
				success: false,
				error: 'Failed to create user record',
				details: error as Record<string, unknown>
			}
		}
	}

	/**
	 * Determine if an error should not be retried
	 */
	private isNonRetryableError(error: unknown): boolean {
		if (!error) return false

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
			console.error('Error verifying user creation:', error)
			return false
		}
	}
}
