import { Injectable, Logger, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SupabaseService } from '../database/supabase.service'
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

export interface ValidatedUser
	extends Omit<AuthUser, 'createdAt' | 'updatedAt' | 'name' | 'avatarUrl'> {
	name: string | undefined
	avatarUrl: string | undefined
	createdAt: string
	updatedAt: string
	stripeCustomerId: string | null
	supabaseId: string
	bio: string | null
	profileComplete: boolean
	lastLoginAt: string
	[key: string]: unknown
}

function normalizeSupabaseUser(
	supabaseUser: Database['public']['Tables']['User']['Row']
): ValidatedUser {
	return {
		id: supabaseUser.id,
		email: supabaseUser.email,
		name: supabaseUser.name ?? undefined,
		avatarUrl: supabaseUser.avatarUrl ?? undefined,
		role: supabaseUser.role as UserRole,
		phone: supabaseUser.phone ?? null,
		createdAt: new Date(supabaseUser.createdAt).toISOString(),
		updatedAt: new Date(supabaseUser.updatedAt).toISOString(),
		emailVerified: true,
		bio: supabaseUser.bio ?? null,
		supabaseId: supabaseUser.supabaseId ?? supabaseUser.id,
		stripeCustomerId: supabaseUser.stripeCustomerId ?? null,
		profileComplete: true,
		lastLoginAt: new Date().toISOString(),
		organizationId: null
	}
}

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name)
	private readonly supabase: SupabaseClient

	constructor(
		private readonly supabaseService: SupabaseService
	) {
		const supabaseUrl = process.env.SUPABASE_URL
		const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new InternalServerErrorException(
				'Missing required Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
			)
		}

		this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
			auth: { autoRefreshToken: false, persistSession: false }
		})
	}

	async validateSupabaseToken(token: string): Promise<ValidatedUser> {
		if (!token || typeof token !== 'string') {
			throw new UnauthorizedException('Invalid token format')
		}

		if (token.length < 20 || token.length > 2048) {
			throw new UnauthorizedException('Token length invalid')
		}

		if (!token.includes('.') || token.split('.').length !== 3) {
			throw new UnauthorizedException('Malformed token')
		}

		try {
			const {
				data: { user },
				error
			} = await this.supabase.auth.getUser(token)

			if (error || !user) {
				this.logger.warn('Token validation failed', {
					errorType: error?.name ?? 'unknown'
				})
				throw new UnauthorizedException('Invalid or expired token')
			}

			if (!user.email_confirmed_at) {
				throw new UnauthorizedException('Email verification required')
			}

			if (!user.id || !user.email) {
				throw new UnauthorizedException('User data integrity error')
			}

			return await this.syncUserWithDatabase(user)
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error
			}
			this.logger.error('Token validation error', {
				error: error instanceof Error ? error.message : 'Unknown error'
			})
			throw new UnauthorizedException('Token validation failed')
		}
	}

	async syncUserWithDatabase(
		supabaseUser: SupabaseUser
	): Promise<ValidatedUser> {
		if (!supabaseUser.email) {
			throw new UnauthorizedException('User email is required')
		}

		const { id: supabaseId, email, user_metadata: userMetadata } = supabaseUser
		const metadata = userMetadata as Record<string, unknown>
		const name = String(metadata.name ?? metadata.full_name ?? '')
		const avatarUrl = metadata.avatar_url
			? String(metadata.avatar_url)
			: null
		const phone = metadata.phone ? String(metadata.phone) : null

		const adminClient = this.supabaseService.getAdminClient()

		const { data: existingUser } = await adminClient
			.from('User')
			.select('*')
			.eq('id', supabaseId)
			.single()

		const isNewUser = !existingUser

		const { data: user, error } = await adminClient
			.from('User')
			.upsert({
				id: supabaseId,
				email,
				name,
				phone,
				avatarUrl,
				role: existingUser?.role ?? 'OWNER',
				supabaseId,
				createdAt:
					existingUser?.createdAt ??
					supabaseUser.created_at ??
					new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})
			.select()
			.single()

		if (error) {
			throw new Error('Failed to sync user data')
		}

		if (isNewUser) {
			this.logger.log('New user created', {
				userId: supabaseId,
				email,
				name
			})
		}

		const { data: subscription } = await adminClient
			.from('Subscription')
			.select('stripeCustomerId')
			.eq('userId', supabaseId)
			.limit(1)
			.single()

		return {
			...normalizeSupabaseUser(user),
			supabaseId,
			stripeCustomerId: subscription?.stripeCustomerId ?? null
		}
	}

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
			.update({ ...updates, updatedAt: new Date().toISOString() })
			.eq('id', supabaseId)
			.select()
			.single()

		if (error) {
			throw new Error('Failed to update user profile')
		}
		return { user: normalizeSupabaseUser(user) }
	}

	async validateTokenAndGetUser(token: string): Promise<ValidatedUser> {
		return this.validateSupabaseToken(token)
	}

	async getUserByEmail(email: string): Promise<ValidatedUser | null> {
		const adminClient = this.supabaseService.getAdminClient()
		const { data: user } = await adminClient
			.from('User')
			.select('*')
			.eq('email', email)
			.single()
		return user ? normalizeSupabaseUser(user) : null
	}

	async userHasRole(supabaseId: string, role: string): Promise<boolean> {
		const user = await this.getUserBySupabaseId(supabaseId)
		return user?.role === role
	}

	async getUserStats(): Promise<{
		total: number;
		byRole: {
			owners: number;
			managers: number;
			tenants: number;
		};
	}> {
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
			total: totalResult.count ?? 0,
			byRole: {
				owners: ownersResult.count ?? 0,
				managers: managersResult.count ?? 0,
				tenants: tenantsResult.count ?? 0
			}
		}
	}

	async createUser(userData: {
		email: string
		name: string
		password?: string
	}): Promise<{
		user: { id: string; email: string; name: string }
		access_token: string
		refresh_token: string
	}> {
		if (!userData.email || !userData.name) {
			throw new BadRequestException('Email and name are required')
		}

		if (userData.password) {
			// Basic password validation (could be enhanced with proper validation library)
			if (userData.password.length < 8) {
				throw new BadRequestException(
					'Password must be at least 8 characters long'
				)
			}
		}

		const { data, error } = await this.supabase.auth.admin.createUser({
			email: userData.email,
			password: userData.password ?? undefined,
			email_confirm: false,
			user_metadata: { name: userData.name, full_name: userData.name }
		})

		if (error) {
			if (error.message.includes('already registered')) {
				throw new BadRequestException(
					'User with this email already exists'
				)
			}
		throw new BadRequestException(
			error.message
		)
		}

		if (!data.user.id || !data.user.email) {
			throw new BadRequestException(
				'Failed to create user account'
			)
		}

		try {
			await this.syncUserWithDatabase(data.user)
		} catch (syncError) {
			this.logger.error('User sync failed', {
				userId: data.user.id,
				error:
					syncError instanceof Error
						? syncError.message
						: 'Unknown error'
			})
		}

		return {
			user: {
				id: data.user.id,
				email: data.user.email,
				name: userData.name
			},
			access_token: 'temp_token_email_confirmation_required',
			refresh_token: 'temp_refresh_token_email_confirmation_required'
		}
	}

	async deleteUser(supabaseId: string): Promise<void> {
		const adminClient = this.supabaseService.getAdminClient()
		const { error } = await adminClient
			.from('User')
			.delete()
			.eq('id', supabaseId)
		if (error) {
			throw error
		}
	}

	async logout(token: string): Promise<void> {
		try {
			await this.supabase.auth.admin.signOut(token)
		} catch (error) {
			this.logger.error('Logout error:', error)
		}
	}

	async refreshToken(refreshToken: string): Promise<{
		access_token: string
		refresh_token: string
		expires_in: number
		user: ValidatedUser
	}> {
		const { data, error } = await this.supabase.auth.refreshSession({
			refresh_token: refreshToken
		})

		 
		if (error || !data.session || !data.user) {
			throw new BadRequestException(
				'Invalid or expired refresh token'
			)
		}

		const validatedUser = await this.validateSupabaseToken(
			data.session.access_token
		)

		return {
			access_token: data.session.access_token,
			refresh_token: data.session.refresh_token,
			expires_in: data.session.expires_in,
			user: validatedUser
		}
	}

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
		this.logger.log(`Auth attempt for email: ${email} from IP: ${ip}`)

		// Rate limiting temporarily disabled
		// if (authAttempt.blocked) {
		//		email,
		//		ip,
		//		severity: 'critical',
		//		details: { action: 'login_blocked' }
		//	})
		//	throw new BadRequestException(
		//		ErrorCode.TOO_MANY_REQUESTS,
		//		'Too many failed login attempts. Please try again later.',
		//		{ operation: 'login', resource: 'auth' }
		//	)
		// }

		const { data, error } = await this.supabase.auth.signInWithPassword({
			email,
			password
		})

		if (error) {
			this.logger.warn(`Auth failure for email: ${email} from IP: ${ip} - ${error.message}`)

			if (error.message.includes('Invalid login credentials')) {
				throw new BadRequestException(
					'Invalid email or password'
				)
			}

			if (error.message.includes('Email not confirmed')) {
				throw new BadRequestException(
					'Please verify your email address before signing in'
				)
			}

			throw new BadRequestException(
				'Login failed'
			)
		}

		const validatedUser = await this.validateSupabaseToken(
			data.session.access_token
		)

		this.logger.log(`Auth success for user: ${validatedUser.id} from IP: ${ip}`)


		return {
			access_token: data.session.access_token,
			refresh_token: data.session.refresh_token,
			expires_in: data.session.expires_in,
			user: validatedUser
		}
	}

	async testSupabaseConnection(): Promise<{
		connected: boolean
		auth?: object
	}> {
		const { data, error } = await this.supabase.auth.getSession()

		if (error) {
			throw new BadRequestException(
				'Authentication service connection failed'
			)
		}

		return {
			connected: true,
			auth: {
				session: data.session ? 'exists' : 'none',
				url: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'not configured'
			}
		}
	}
}
