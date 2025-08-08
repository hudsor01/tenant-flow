import { Injectable, UnauthorizedException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { PrismaService } from '../prisma/prisma.service'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import { EmailService } from '../email/email.service'
import { SecurityUtils } from '../common/security/security.utils'
import type { AuthUser, UserRole } from '@repo/shared'




export interface SupabaseUser {
	id: string
	email?: string
	email_confirmed_at?: string
	user_metadata?: {
		name?: string
		full_name?: string
		avatar_url?: string
	}
	created_at?: string
	updated_at?: string
}

// ValidatedUser extends AuthUser but with string dates for JSON serialization
export interface ValidatedUser extends Omit<AuthUser, 'createdAt' | 'updatedAt' | 'name' | 'avatarUrl'> {
	name: string | undefined
	avatarUrl: string | undefined
	createdAt: string
	updatedAt: string
	stripeCustomerId: string | null
}

/**
 * Normalize Prisma user data to match ValidatedUser interface
 * Ensures all fields are properly typed and formatted for API responses
 */
function normalizePrismaUser(prismaUser: {
	id: string
	email: string
	name?: string | null
	avatarUrl?: string | null
	role: string
	phone?: string | null
	createdAt: Date
	updatedAt: Date
	bio?: string | null
	supabaseId?: string
	stripeCustomerId?: string | null
}): ValidatedUser {
	return {
		id: prismaUser.id,
		email: prismaUser.email,
		name: prismaUser.name || undefined,
		avatarUrl: prismaUser.avatarUrl || undefined,
		role: prismaUser.role as UserRole,
		phone: prismaUser.phone ?? null,
		createdAt: prismaUser.createdAt.toISOString(),
		updatedAt: prismaUser.updatedAt.toISOString(),
		emailVerified: true, // Always true for authenticated users
		bio: prismaUser.bio ?? null,
		supabaseId: prismaUser.supabaseId ?? prismaUser.id,
		stripeCustomerId: prismaUser.stripeCustomerId ?? null,
		organizationId: null // Not implemented in current schema
	}
}

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name)
	private readonly supabase: SupabaseClient

	constructor(
		private readonly configService: ConfigService,
		private readonly prisma: PrismaService,
		private readonly errorHandler: ErrorHandlerService,
		private readonly emailService: EmailService,
		private readonly securityUtils: SecurityUtils
	) {
		// Initialize Supabase client for server-side operations
		const supabaseUrl = this.configService.get<string>('SUPABASE_URL')
		const supabaseServiceKey = this.configService.get<string>(
			'SUPABASE_SERVICE_ROLE_KEY'
		)

		if (!supabaseUrl || !supabaseServiceKey) {
			throw this.errorHandler.createConfigError(
				'Missing required Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
			)
		}

		this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		})
	}

	/**
	 * Validate Supabase JWT token and return user information
	 * 
	 * SECURITY: All tokens must be validated through Supabase - no bypasses allowed.
	 * For testing, use proper Jest mocking or test Supabase instances.
	 */
	async validateSupabaseToken(token: string): Promise<ValidatedUser> {
		try {
			this.logger.debug('Validating token')
			
			// All tokens must go through Supabase validation - no exceptions
			// For testing, mock this method in tests rather than bypassing security
			this.logger.debug('Calling Supabase getUser')
			const {
				data: { user },
				error
			} = await this.supabase.auth.getUser(token)

			this.logger.log('🔍 Supabase getUser response:', {
				hasUser: !!user,
				hasError: !!error,
				error: error?.message,
				userId: user?.id,
				userEmail: user?.email
			})

			if (error || !user) {
				this.logger.error('Token validation failed:', {
					error: error?.message,
					errorName: error?.name,
					errorStatus: error?.status
				})
				throw new UnauthorizedException('Invalid or expired token')
			}

			if (!user.email_confirmed_at) {
				throw new UnauthorizedException('Email not verified')
			}

			// Sync user data with local database if needed
			const localUser = await this.syncUserWithDatabase(user)

			return localUser
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error
			}
			throw new UnauthorizedException('Token validation failed')
		}
	}

	/**
	 * Sync Supabase user with local Prisma database
	 * Simplified - just upsert without complex error handling
	 */
	async syncUserWithDatabase(
		supabaseUser: SupabaseUser
	): Promise<ValidatedUser> {
		if (!supabaseUser) {
			this.logger.error('syncUserWithDatabase called with undefined supabaseUser')
			throw new Error('Supabase user is required')
		}

		this.logger.debug('syncUserWithDatabase called', {
			hasUser: !!supabaseUser,
			userId: supabaseUser?.id,
			userEmail: supabaseUser?.email
		})

		const { id: supabaseId, email, user_metadata } = supabaseUser

		if (!email) {
			throw new UnauthorizedException('User email is required')
		}

		const name = user_metadata?.name || user_metadata?.full_name || ''
		const avatarUrl = user_metadata?.avatar_url || null

		// Check if user exists before upserting to detect new users
		const existingUser = await this.prisma.user.findUnique({
			where: { id: supabaseId }
		})
		const isNewUser = !existingUser

		// Simple upsert - let Supabase handle the complexity
		const user = await this.prisma.user.upsert({
			where: { id: supabaseId },
			update: {
				email,
				name,
				avatarUrl,
				updatedAt: new Date()
			},
			create: {
				id: supabaseId,
				email,
				name,
				avatarUrl,
				role: 'OWNER',
				supabaseId,
				createdAt: supabaseUser.created_at
					? new Date(supabaseUser.created_at)
					: new Date(),
				updatedAt: supabaseUser.updated_at
					? new Date(supabaseUser.updated_at)
					: new Date()
			}
		})

		// Send welcome email for new users
		if (isNewUser && name) {
			try {
				const emailResult = await this.emailService.sendWelcomeEmail(email, name)
				
				if (emailResult.success) {
					this.logger.debug('Welcome email sent to new user', {
						userId: supabaseId,
						email,
						messageId: emailResult.messageId
					})
				} else {
					this.logger.warn('Failed to send welcome email to new user', {
						userId: supabaseId,
						email,
						error: emailResult.error
					})
				}
			} catch (emailError) {
				this.logger.error('Error sending welcome email to new user', {
					userId: supabaseId,
					email,
					error: emailError instanceof Error ? emailError.message : 'Unknown email error'
				})
				// Don't fail the sync if email fails
			}
		}

		// Get Stripe customer ID if exists
		const subscription = await this.prisma.subscription.findFirst({
			where: { userId: supabaseId },
			select: { stripeCustomerId: true }
		})

		return {
			...normalizePrismaUser(user),
			supabaseId,
			stripeCustomerId: subscription?.stripeCustomerId || null
		}
	}

	/**
	 * Get user by Supabase ID
	 */
	async getUserBySupabaseId(
		supabaseId: string
	): Promise<ValidatedUser | null> {
		const user = await this.prisma.user.findUnique({
			where: { id: supabaseId }
		})
		return user ? normalizePrismaUser(user) : null
	}

	/**
	 * Update user profile in local database
	 */
	async updateUserProfile(
		supabaseId: string,
		updates: {
			name?: string
			phone?: string
			bio?: string
			avatarUrl?: string
		}
	): Promise<{ user: ValidatedUser }> {
		const user = await this.prisma.user.update({
			where: { id: supabaseId },
			data: {
				...updates,
				updatedAt: new Date()
			}
		})
		return { user: normalizePrismaUser(user) }
	}

	/**
	 * Alias for validateSupabaseToken for backward compatibility with guards
	 */
	async validateTokenAndGetUser(token: string): Promise<ValidatedUser> {
		return this.validateSupabaseToken(token)
	}

	/**
	 * Get user by email
	 */
	async getUserByEmail(email: string): Promise<ValidatedUser | null> {
		const user = await this.prisma.user.findUnique({
			where: { email }
		})
		return user ? normalizePrismaUser(user) : null
	}

	/**
	 * Check if user has specific role
	 */
	async userHasRole(supabaseId: string, role: string): Promise<boolean> {
		const user = await this.getUserBySupabaseId(supabaseId)
		return user?.role === role
	}

	/**
	 * Get user statistics
	 */
	async getUserStats() {
		const [total, owners, managers, tenants] = await Promise.all([
			this.prisma.user.count(),
			this.prisma.user.count({ where: { role: 'OWNER' } }),
			this.prisma.user.count({ where: { role: 'MANAGER' } }),
			this.prisma.user.count({ where: { role: 'TENANT' } })
		])

		return {
			total,
			byRole: {
				owners,
				managers,
				tenants
			}
		}
	}

	/**
	 * Create a new user account with Supabase
	 */
	async createUser(userData: {
		email: string
		name: string
		password?: string
	}): Promise<{
		user: {
			id: string
			email: string
			name: string
		}
		access_token: string
		refresh_token: string
	}> {
		try {
			// Validate input data
			if (!userData.email || !userData.name) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.BAD_REQUEST,
					'Email and name are required',
					{ operation: 'createUser', resource: 'auth' }
				)
			}

			// Validate password if provided
			if (userData.password) {
				const passwordValidation = this.securityUtils.validatePassword(userData.password)
				if (!passwordValidation.valid) {
					throw this.errorHandler.createBusinessError(
						ErrorCode.BAD_REQUEST,
						'Password does not meet security requirements',
						{ 
							operation: 'createUser', 
							resource: 'auth',
							metadata: {
								errors: passwordValidation.errors,
								score: passwordValidation.score
							}
						}
					)
				}
				
				// Log password strength (without the actual password)
				this.logger.debug('Password validation passed', {
					email: userData.email,
					passwordScore: passwordValidation.score
				})
			}

			this.logger.debug('Creating Supabase user', {
				email: userData.email,
				hasPassword: !!userData.password
			})

			// Create user in Supabase auth
			const { data, error } = await this.supabase.auth.admin.createUser({
				email: userData.email,
				password: userData.password || undefined, // Let Supabase generate password if not provided
				email_confirm: false, // Require email confirmation
				user_metadata: {
					name: userData.name,
					full_name: userData.name
				}
			})

			// Handle Supabase errors according to Stripe error handling patterns
			if (error) {
				this.logger.error('Failed to create Supabase user', {
					error: {
						message: error.message,
						status: error.status,
						name: error.name
					},
					email: userData.email
				})

				// Map Supabase errors to appropriate business errors
				if (error.message?.includes('already registered')) {
					throw this.errorHandler.createBusinessError(
						ErrorCode.CONFLICT,
						'User with this email already exists',
						{ operation: 'createUser', resource: 'auth', metadata: { email: userData.email } }
					)
				}

				if (error.message?.includes('invalid email')) {
					throw this.errorHandler.createBusinessError(
						ErrorCode.BAD_REQUEST,
						'Invalid email format',
						{ operation: 'createUser', resource: 'auth', metadata: { email: userData.email } }
					)
				}

				// Default error handling
				throw this.errorHandler.createBusinessError(
					ErrorCode.INTERNAL_SERVER_ERROR,
					error.message || 'Failed to create user account',
					{ 
						operation: 'createUser', 
						resource: 'auth', 
						metadata: { 
							errorMessage: error.message,
							errorCode: error.code || 'UNKNOWN'
						} 
					}
				)
			}

			// Validate response data structure
			if (!data) {
				this.logger.error('Supabase returned null data', {
					email: userData.email,
					hasError: !!error
				})
				throw this.errorHandler.createBusinessError(
					ErrorCode.INTERNAL_SERVER_ERROR,
					'Failed to create user account - no response data',
					{ operation: 'createUser', resource: 'auth' }
				)
			}

			if (!data.user) {
				this.logger.error('Supabase returned no user data', {
					hasData: true,
					dataKeys: Object.keys(data),
					userData: JSON.stringify(data, null, 2).substring(0, 500),
					email: userData.email
				})
				throw this.errorHandler.createBusinessError(
					ErrorCode.INTERNAL_SERVER_ERROR,
					'Failed to create user account - no user data returned',
					{ 
						operation: 'createUser', 
						resource: 'auth', 
						metadata: { 
							hasData: true,
							dataKeys: Object.keys(data).join(',')
						} 
					}
				)
			}

			// Validate user object structure
			if (!data.user.id || !data.user.email) {
				this.logger.error('Supabase returned incomplete user data', {
					hasId: !!data.user.id,
					hasEmail: !!data.user.email,
					userKeys: Object.keys(data.user),
					email: userData.email
				})
				throw this.errorHandler.createBusinessError(
					ErrorCode.INTERNAL_SERVER_ERROR,
					'Failed to create user account - incomplete user data',
					{ 
						operation: 'createUser', 
						resource: 'auth', 
						metadata: { 
							userId: data.user.id || 'unknown',
							userEmail: data.user.email || 'unknown',
							hasId: !!data.user.id,
							hasEmail: !!data.user.email
						} 
					}
				)
			}

			this.logger.debug('Successfully created Supabase user', {
				userId: data.user.id,
				userEmail: data.user.email,
				hasMetadata: !!data.user.user_metadata
			})

			// Sync user with local database
			try {
				await this.syncUserWithDatabase(data.user)
				this.logger.debug('Successfully synced user with local database', {
					userId: data.user.id
				})
			} catch (syncError) {
				this.logger.error('Failed to sync user with local database', {
					userId: data.user.id,
					email: data.user.email,
					error: syncError instanceof Error ? syncError.message : 'Unknown sync error'
				})
				// Continue - the Supabase user was created successfully
				// The sync can be retried later when the user logs in
			}

			// Return standardized response
			const response = {
				user: {
					id: data.user.id,
					email: data.user.email,
					name: userData.name
				},
				access_token: 'temp_token_email_confirmation_required',
				refresh_token: 'temp_refresh_token_email_confirmation_required'
			}

			// Send welcome email
			try {
				const emailResult = await this.emailService.sendWelcomeEmail(
					data.user.email,
					userData.name
				)
				
				if (emailResult.success) {
					this.logger.debug('Welcome email sent successfully', {
						userId: data.user.id,
						email: data.user.email,
						messageId: emailResult.messageId
					})
				} else {
					this.logger.warn('Failed to send welcome email', {
						userId: data.user.id,
						email: data.user.email,
						error: emailResult.error
					})
				}
			} catch (emailError) {
				this.logger.error('Error sending welcome email', {
					userId: data.user.id,
					email: data.user.email,
					error: emailError instanceof Error ? emailError.message : 'Unknown email error'
				})
				// Don't fail the user creation if email fails
			}

			this.logger.debug('createUser completed successfully', {
				userId: response.user.id,
				email: response.user.email
			})

			return response

		} catch (error) {
			// Re-throw business errors without modification
			if (error instanceof Error && error.name?.includes('BusinessError')) {
				throw error
			}

			// Handle unexpected errors
			this.logger.error('Unexpected error in createUser', {
				error: {
					message: error instanceof Error ? error.message : 'Unknown error',
					name: error instanceof Error ? error.name : 'Unknown',
					stack: error instanceof Error ? error.stack : undefined
				},
				email: userData.email
			})

			throw this.errorHandler.createBusinessError(
				ErrorCode.INTERNAL_SERVER_ERROR,
				'An unexpected error occurred while creating user account',
				{ 
					operation: 'createUser', 
					resource: 'auth', 
					metadata: { 
						errorMessage: error instanceof Error ? error.message : 'Unknown error',
						errorType: error instanceof Error ? error.constructor.name : typeof error
					} 
				}
			)
		}
	}

	/**
	 * Delete user and all associated data
	 */
	async deleteUser(supabaseId: string): Promise<void> {
		await this.prisma.user.delete({
			where: { id: supabaseId }
		})
	}

	/**
	 * Refresh access token using refresh token
	 * Implements secure token rotation pattern
	 */
	async refreshToken(refreshToken: string): Promise<{
		access_token: string
		refresh_token: string
		expires_in: number
		user: ValidatedUser
	}> {
		try {
			this.logger.debug('Attempting to refresh token')
			
			// Use Supabase's built-in refresh token mechanism
			const { data, error } = await this.supabase.auth.refreshSession({
				refresh_token: refreshToken
			})

			if (error || !data.session) {
				this.logger.error('Failed to refresh token:', {
					error: error?.message,
					hasSession: !!data?.session
				})
				throw new UnauthorizedException('Invalid or expired refresh token')
			}

			// Sync user data with database
			if (!data.user) {
				throw new UnauthorizedException('No user data returned from refresh')
			}
			const user = await this.syncUserWithDatabase(data.user)

			this.logger.debug('Token refreshed successfully', {
				userId: user.id,
				expiresIn: data.session.expires_in
			})

			return {
				access_token: data.session.access_token,
				refresh_token: data.session.refresh_token, // New refresh token (rotation)
				expires_in: data.session.expires_in || 3600,
				user
			}
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error
			}
			
			this.logger.error('Unexpected error during token refresh:', error)
			throw new UnauthorizedException('Failed to refresh token')
		}
	}

	/**
	 * Login user and return tokens
	 */
	async login(email: string, password: string): Promise<{
		access_token: string
		refresh_token: string
		expires_in: number
		user: ValidatedUser
	}> {
		try {
			const { data, error } = await this.supabase.auth.signInWithPassword({
				email,
				password
			})

			if (error || !data.session) {
				this.logger.error('Login failed:', {
					error: error?.message,
					email
				})
				throw new UnauthorizedException('Invalid email or password')
			}

			// Sync user data with database
			if (!data.user) {
				throw new UnauthorizedException('No user data returned from login')
			}
			const user = await this.syncUserWithDatabase(data.user)

			return {
				access_token: data.session.access_token,
				refresh_token: data.session.refresh_token,
				expires_in: data.session.expires_in || 3600,
				user
			}
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error
			}
			
			this.logger.error('Unexpected error during login:', error)
			throw new UnauthorizedException('Login failed')
		}
	}

	/**
	 * Logout user and invalidate tokens
	 */
	async logout(token: string): Promise<void> {
		try {
			// Supabase handles token invalidation
			const { error } = await this.supabase.auth.admin.signOut(token)
			
			if (error) {
				this.logger.error('Logout failed:', error)
				// Don't throw - allow logout to proceed even if token is already invalid
			}
			
			this.logger.debug('User logged out successfully')
		} catch (error) {
			this.logger.error('Unexpected error during logout:', error)
			// Don't throw - allow logout to proceed
		}
	}

	/**
	 * Test Supabase connection
	 */
	async testSupabaseConnection(): Promise<{
		connected: boolean
		auth?: object
	}> {
		try {
			const { data, error } = await this.supabase.auth.getSession()

			if (error) {
				// Log detailed error for debugging but don't expose to client
				this.logger.error('Supabase connection test failed:', error)
				throw this.errorHandler.createBusinessError(
					ErrorCode.SERVICE_UNAVAILABLE,
					'Authentication service connection failed',
					{ operation: 'testConnection', resource: 'auth', metadata: { error: error.message } }
				)
			}

			return {
				connected: true,
				auth: {
					session: data.session ? 'exists' : 'none',
					url:
						this.configService
							.get('SUPABASE_URL')
							?.substring(0, 30) + '...'
				}
			}
		} catch (error) {
			this.logger.error('Supabase connection test error:', error)
			throw error
		}
	}
}
