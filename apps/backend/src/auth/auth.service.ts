import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SupabaseService } from '../supabase/supabase.service'
import {
	ErrorCode,
	ErrorHandlerService
} from '../common/errors/error-handler.service'
import { SimpleSecurityService } from '../common/security/simple-security.service'
import { SecurityMonitorService } from '../common/security/security-monitor.service'
import type { AuthUser, UserRole } from '@repo/shared'
import type { Database } from '@repo/shared/types/supabase-generated'

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
export interface ValidatedUser
	extends Omit<AuthUser, 'createdAt' | 'updatedAt' | 'name' | 'avatarUrl'> {
	name: string | undefined
	avatarUrl: string | undefined
	createdAt: string
	updatedAt: string
	stripeCustomerId: string | null
}

/**
 * Normalize Supabase user data to match ValidatedUser interface
 * Ensures all fields are properly typed and formatted for API responses
 */
function normalizeSupabaseUser(
	supabaseUser: Database['public']['Tables']['User']['Row']
): ValidatedUser {
	return {
		id: supabaseUser.id,
		email: supabaseUser.email,
		name: supabaseUser.name || undefined,
		avatarUrl: supabaseUser.avatarUrl || undefined,
		role: (supabaseUser.role || 'OWNER') as UserRole,
		phone: supabaseUser.phone ?? null,
		createdAt: new Date(supabaseUser.createdAt).toISOString(),
		updatedAt: new Date(supabaseUser.updatedAt).toISOString(),
		emailVerified: true, // Always true for authenticated users
		bio: supabaseUser.bio ?? null,
		supabaseId: supabaseUser.supabaseId ?? supabaseUser.id,
		stripeCustomerId: supabaseUser.stripeCustomerId ?? null,
		organizationId: null // organizationId field doesn't exist in User table
	}
}

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name)
	private readonly supabase: SupabaseClient

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly errorHandler: ErrorHandlerService,
		private readonly securityService: SimpleSecurityService,
		private readonly securityMonitor: SecurityMonitorService
	) {
		// Initialize Supabase client for server-side operations
		const supabaseUrl = process.env.SUPABASE_URL
		const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
		// SECURITY: Input validation - reject obviously invalid tokens early
		if (!token || typeof token !== 'string') {
			throw new UnauthorizedException('Invalid token format')
		}

		// SECURITY: Token length validation to prevent DoS attacks
		if (token.length < 20 || token.length > 2048) {
			throw new UnauthorizedException('Token length invalid')
		}

		// SECURITY: Basic JWT format check (3 parts separated by dots)
		if (!token.includes('.') || token.split('.').length !== 3) {
			throw new UnauthorizedException('Malformed token')
		}

		try {
			this.logger.debug('Validating token', { tokenLength: token.length })

			// All tokens must go through Supabase validation - no exceptions
			// For testing, mock this method in tests rather than bypassing security
			const {
				data: { user },
				error
			} = await this.supabase.auth.getUser(token)

			// SECURITY: Don't log sensitive user data in production
			this.logger.debug('Supabase validation response', {
				hasUser: !!user,
				hasError: !!error,
				errorType: error?.name,
				userId: user?.id
			})

			if (error || !user) {
				// SECURITY: Log failed validation attempts for monitoring
				this.logger.warn('Token validation failed', {
					errorType: error?.name,
					errorStatus: error?.status,
					hasUser: !!user
				})
				throw new UnauthorizedException('Invalid or expired token')
			}

			// SECURITY: Require email verification for all users
			if (!user.email_confirmed_at) {
				this.logger.warn('Unverified email login attempt', {
					userId: user.id
				})
				throw new UnauthorizedException('Email verification required')
			}

			// SECURITY: Check for basic user data integrity
			if (!user.id || !user.email) {
				this.logger.error('Invalid user data from Supabase', {
					hasId: !!user.id,
					hasEmail: !!user.email
				})
				throw new UnauthorizedException('User data integrity error')
			}

			// Sync user data with local database if needed
			const localUser = await this.syncUserWithDatabase(user)

			return localUser
		} catch (error) {
			// Re-throw UnauthorizedException without modification
			if (error instanceof UnauthorizedException) {
				throw error
			}

			// SECURITY: Log unexpected errors for monitoring but don't expose details
			this.logger.error('Unexpected error in token validation', {
				errorType:
					error instanceof Error
						? error.constructor.name
						: typeof error,
				errorMessage:
					error instanceof Error ? error.message : 'Unknown error'
			})

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
			this.logger.error(
				'syncUserWithDatabase called with undefined supabaseUser'
			)
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

		const metadata = user_metadata as Record<string, unknown>
		const name = String(metadata?.name || metadata?.full_name || '')
		const avatarUrl = metadata?.avatar_url
			? String(metadata.avatar_url)
			: null
		const phone = metadata?.phone ? String(metadata.phone) : null
		const companyName = metadata?.company_name
			? String(metadata.company_name)
			: null
		const companyType = String(metadata?.company_type || 'LANDLORD')
		const companySize = String(metadata?.company_size || '1-10')

		// Check if user exists before upserting to detect new users
		const adminClient = this.supabaseService.getAdminClient()
		const { data: existingUser } = await adminClient
			.from('User')
			.select('*')
			.eq('id', supabaseId)
			.single()
		const isNewUser = !existingUser

		// Upsert user in database
		const { data: user, error } = await adminClient
			.from('User')
			.upsert({
				id: supabaseId,
				email,
				name,
				phone,
				avatarUrl,
				role: existingUser?.role || 'OWNER',
				supabaseId,
				createdAt:
					existingUser?.createdAt ||
					supabaseUser.created_at ||
					new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})
			.select()
			.single()

		if (error || !user) {
			this.logger.error('Failed to sync user with database', {
				error,
				supabaseId
			})
			throw new Error('Failed to sync user data')
		}

		// Log new user metadata for analytics
		if (isNewUser) {
			this.logger.log('New user created with metadata', {
				userId: supabaseId,
				email,
				name,
				phone: !!phone,
				companyName,
				companyType,
				companySize,
				role: 'OWNER'
			})
		}

		// Send welcome email for new users (EmailService disabled)
		if (isNewUser && name) {
			try {
				this.logger.log(
					'Welcome email would be sent (EmailService disabled)',
					{
						email,
						name,
						companySize
					}
				)
			} catch (emailError) {
				this.logger.error('Error sending welcome email to new user', {
					userId: supabaseId,
					email,
					error:
						emailError instanceof Error
							? emailError.message
							: 'Unknown email error'
				})
				// Don't fail the sync if email fails
			}
		}

		// Get Stripe customer ID if exists
		const { data: subscription } = await adminClient
			.from('Subscription')
			.select('stripeCustomerId')
			.eq('userId', supabaseId)
			.limit(1)
			.single()

		return {
			...normalizeSupabaseUser(user),
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
		const adminClient = this.supabaseService.getAdminClient()
		const { data: user } = await adminClient
			.from('User')
			.select('*')
			.eq('id', supabaseId)
			.single()
		return user ? normalizeSupabaseUser(user) : null
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
		const adminClient = this.supabaseService.getAdminClient()
		const { data: user, error } = await adminClient
			.from('User')
			.update({
				...updates,
				updatedAt: new Date().toISOString()
			})
			.eq('id', supabaseId)
			.select()
			.single()

		if (error || !user) {
			throw new Error('Failed to update user profile')
		}
		return { user: normalizeSupabaseUser(user) }
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
		const adminClient = this.supabaseService.getAdminClient()
		const { data: user } = await adminClient
			.from('User')
			.select('*')
			.eq('email', email)
			.single()
		return user ? normalizeSupabaseUser(user) : null
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
		const adminClient = this.supabaseService.getAdminClient()
		const [totalResult, ownersResult, managersResult, tenantsResult] =
			await Promise.all([
				adminClient
					.from('User')
					.select('*', { count: 'exact', head: true }),
				adminClient
					.from('User')
					.select('*', { count: 'exact', head: true })
					.eq('role', 'OWNER'),
				adminClient
					.from('User')
					.select('*', { count: 'exact', head: true })
					.eq('role', 'MANAGER'),
				adminClient
					.from('User')
					.select('*', { count: 'exact', head: true })
					.eq('role', 'TENANT')
			])

		return {
			total: totalResult.count || 0,
			byRole: {
				owners: ownersResult.count || 0,
				managers: managersResult.count || 0,
				tenants: tenantsResult.count || 0
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
				const passwordValidation =
					this.securityService.validatePassword(userData.password)
				if (!passwordValidation.valid) {
					throw this.errorHandler.createBusinessError(
						ErrorCode.BAD_REQUEST,
						'Password does not meet security requirements',
						{
							operation: 'createUser',
							resource: 'auth',
							metadata: {
								errors: passwordValidation.errors
							}
						}
					)
				}

				// Log password validation success (without the actual password)
				this.logger.debug('Password validation passed', {
					email: userData.email,
					valid: passwordValidation.valid
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
						{
							operation: 'createUser',
							resource: 'auth',
							metadata: { email: userData.email }
						}
					)
				}

				if (error.message?.includes('invalid email')) {
					throw this.errorHandler.createBusinessError(
						ErrorCode.BAD_REQUEST,
						'Invalid email format',
						{
							operation: 'createUser',
							resource: 'auth',
							metadata: { email: userData.email }
						}
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
				this.logger.debug(
					'Successfully synced user with local database',
					{
						userId: data.user.id
					}
				)
			} catch (syncError) {
				this.logger.error('Failed to sync user with local database', {
					userId: data.user.id,
					email: data.user.email,
					error:
						syncError instanceof Error
							? syncError.message
							: 'Unknown sync error'
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

			// Send welcome email (EmailService disabled)
			try {
				this.logger.log(
					'Welcome email would be sent (EmailService disabled)',
					{
						email: data.user.email,
						name: userData.name
					}
				)
			} catch (emailError) {
				this.logger.error('Error sending welcome email', {
					userId: data.user.id,
					email: data.user.email,
					error:
						emailError instanceof Error
							? emailError.message
							: 'Unknown email error'
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
			if (
				error instanceof Error &&
				error.name?.includes('BusinessError')
			) {
				throw error
			}

			// Handle unexpected errors
			this.logger.error('Unexpected error in createUser', {
				error: {
					message:
						error instanceof Error
							? error.message
							: 'Unknown error',
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
						errorMessage:
							error instanceof Error
								? error.message
								: 'Unknown error',
						errorType:
							error instanceof Error
								? error.constructor.name
								: typeof error
					}
				}
			)
		}
	}

	/**
	 * Delete user and all associated data
	 */
	async deleteUser(supabaseId: string): Promise<void> {
		const adminClient = this.supabaseService.getAdminClient()
		const { error } = await adminClient
			.from('User')
			.delete()
			.eq('id', supabaseId)

		if (error) {
			this.logger.error('Failed to delete user', { error, supabaseId })
			throw error
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
	 * Refresh access token using refresh token
	 * Implements secure token rotation to prevent token replay attacks
	 */
	async refreshToken(refreshToken: string): Promise<{
		access_token: string
		refresh_token: string
		expires_in: number
		user: ValidatedUser
	}> {
		try {
			this.logger.debug('Attempting token refresh')

			// Validate refresh token with Supabase
			const { data, error } = await this.supabase.auth.refreshSession({
				refresh_token: refreshToken
			})

			if (error) {
				this.logger.warn('Token refresh failed', {
					error: error.message,
					errorCode: error.status
				})

				// Map Supabase errors to business errors
				if (
					error.message?.includes('Invalid refresh token') ||
					error.status === 400
				) {
					throw this.errorHandler.createBusinessError(
						ErrorCode.UNAUTHORIZED,
						'Invalid or expired refresh token',
						{ operation: 'refreshToken', resource: 'auth' }
					)
				}

				throw this.errorHandler.createBusinessError(
					ErrorCode.INTERNAL_SERVER_ERROR,
					'Token refresh failed',
					{
						operation: 'refreshToken',
						resource: 'auth',
						metadata: { errorMessage: error.message }
					}
				)
			}

			if (!data.session || !data.user) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.UNAUTHORIZED,
					'Invalid session data received',
					{ operation: 'refreshToken', resource: 'auth' }
				)
			}

			// Get updated user data
			const validatedUser = await this.validateSupabaseToken(
				data.session.access_token
			)

			this.logger.debug('Token refresh successful', {
				userId: validatedUser.id,
				email: validatedUser.email
			})

			// Return new tokens with user data
			return {
				access_token: data.session.access_token,
				refresh_token: data.session.refresh_token,
				expires_in: data.session.expires_in || 3600,
				user: validatedUser
			}
		} catch (error) {
			this.logger.error('Token refresh error:', error)

			// Re-throw business errors as-is
			if (
				error &&
				typeof error === 'object' &&
				'code' in error &&
				'statusCode' in error
			) {
				throw error
			}

			// Wrap unexpected errors
			throw this.errorHandler.createBusinessError(
				ErrorCode.INTERNAL_SERVER_ERROR,
				'Unexpected error during token refresh',
				{ operation: 'refreshToken', resource: 'auth' }
			)
		}
	}

	/**
	 * Login user with email and password
	 * Returns access token, refresh token, and user data
	 */
	async login(
		email: string,
		password: string,
		ip?: string
	): Promise<{
		access_token: string
		refresh_token: string
		expires_in: number
		user: ValidatedUser
	}> {
		try {
			this.logger.debug('Attempting user login', { email })

			// Log authentication attempt
			await this.securityMonitor.logSecurityEvent({
				type: 'AUTH_ATTEMPT',
				email,
				ip,
				details: { operation: 'login' }
			})

			// Check for brute force attacks before attempting authentication
			const authAttempt = await this.securityMonitor.trackAuthAttempt(
				ip || 'unknown',
				email,
				false
			)
			if (authAttempt.blocked) {
				await this.securityMonitor.logSecurityEvent({
					type: 'BRUTE_FORCE_DETECTED',
					email,
					ip,
					severity: 'critical',
					details: {
						remainingAttempts: authAttempt.remainingAttempts,
						action: 'login_blocked'
					}
				})

				throw this.errorHandler.createBusinessError(
					ErrorCode.TOO_MANY_REQUESTS,
					'Too many failed login attempts. Please try again later.',
					{
						operation: 'login',
						resource: 'auth',
						metadata: { email, ip }
					}
				)
			}

			// Authenticate with Supabase
			const { data, error } = await this.supabase.auth.signInWithPassword(
				{
					email,
					password
				}
			)

			if (error) {
				this.logger.warn('Login failed', {
					email,
					error: error.message,
					errorCode: error.status
				})

				// Log authentication failure
				await this.securityMonitor.logSecurityEvent({
					type: 'AUTH_FAILURE',
					email,
					ip,
					details: {
						error: error.message,
						errorCode: error.status
					}
				})

				// Track failed attempt for brute force detection
				await this.securityMonitor.trackAuthAttempt(
					ip || 'unknown',
					email,
					false
				)

				// Map Supabase errors to business errors
				if (
					error.message?.includes('Invalid login credentials') ||
					error.status === 400
				) {
					throw this.errorHandler.createBusinessError(
						ErrorCode.UNAUTHORIZED,
						'Invalid email or password',
						{
							operation: 'login',
							resource: 'auth',
							metadata: { email }
						}
					)
				}

				if (error.message?.includes('Email not confirmed')) {
					throw this.errorHandler.createBusinessError(
						ErrorCode.FORBIDDEN,
						'Please verify your email address before signing in',
						{
							operation: 'login',
							resource: 'auth',
							metadata: { email }
						}
					)
				}

				throw this.errorHandler.createBusinessError(
					ErrorCode.INTERNAL_SERVER_ERROR,
					'Login failed',
					{
						operation: 'login',
						resource: 'auth',
						metadata: { email, errorMessage: error.message }
					}
				)
			}

			if (!data.session || !data.user) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.INTERNAL_SERVER_ERROR,
					'Invalid login response',
					{
						operation: 'login',
						resource: 'auth',
						metadata: { email }
					}
				)
			}

			// Get validated user data
			const validatedUser = await this.validateSupabaseToken(
				data.session.access_token
			)

			// Log successful authentication and reset tracking
			await this.securityMonitor.logSecurityEvent({
				type: 'AUTH_SUCCESS',
				userId: validatedUser.id,
				email: validatedUser.email,
				ip,
				details: { operation: 'login' }
			})

			// Reset brute force tracking on successful login
			await this.securityMonitor.trackAuthAttempt(
				ip || 'unknown',
				email,
				true
			)

			this.logger.log('User login successful', {
				userId: validatedUser.id,
				email: validatedUser.email
			})

			return {
				access_token: data.session.access_token,
				refresh_token: data.session.refresh_token,
				expires_in: data.session.expires_in || 3600,
				user: validatedUser
			}
		} catch (error) {
			this.logger.error('Login error:', error)

			// Re-throw business errors as-is
			if (
				error &&
				typeof error === 'object' &&
				'code' in error &&
				'statusCode' in error
			) {
				throw error
			}

			// Wrap unexpected errors
			throw this.errorHandler.createBusinessError(
				ErrorCode.INTERNAL_SERVER_ERROR,
				'Unexpected error during login',
				{ operation: 'login', resource: 'auth' }
			)
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
					{
						operation: 'testConnection',
						resource: 'auth',
						metadata: { error: error.message }
					}
				)
			}

			return {
				connected: true,
				auth: {
					session: data.session ? 'exists' : 'none',
					url: process.env.SUPABASE_URL?.substring(0, 30) + '...'
				}
			}
		} catch (error) {
			this.logger.error('Supabase connection test error:', error)
			throw error
		}
	}
}
