import { Injectable, UnauthorizedException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { PrismaService } from 'nestjs-prisma'
// Temporary relative import until @tenantflow/types package resolves
type UserRole = 'ADMIN' | 'OWNER' | 'TENANT' | 'MANAGER'

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

export interface ValidatedUser {
	id: string
	email: string
	name: string
	avatarUrl: string | null
	role: UserRole
	phone: string | null
	createdAt: string
	updatedAt: string
	emailVerified: boolean
	bio: string | null
	supabaseId: string
	stripeCustomerId: string | null
}

function normalizePrismaUser(prismaUser: {
	id: string
	email: string
	name?: string | null
	avatarUrl?: string | null
	role: string
	phone?: string | null
	createdAt: Date
	updatedAt: Date
	emailVerified?: boolean
	bio?: string | null
	supabaseId?: string
	stripeCustomerId?: string | null
}): ValidatedUser {
	return {
		id: prismaUser.id,
		email: prismaUser.email,
		name: prismaUser.name ?? '',
		avatarUrl: prismaUser.avatarUrl ?? null,
		role: (prismaUser.role as UserRole) || 'TENANT',
		phone: prismaUser.phone ?? null,
		createdAt: prismaUser.createdAt instanceof Date
			? prismaUser.createdAt.toISOString()
			: typeof prismaUser.createdAt === 'string'
				? prismaUser.createdAt
				: new Date().toISOString(),
		updatedAt: prismaUser.updatedAt instanceof Date
			? prismaUser.updatedAt.toISOString()
			: typeof prismaUser.updatedAt === 'string'
				? prismaUser.updatedAt
				: new Date().toISOString(),
		emailVerified: prismaUser.emailVerified ?? true,
		bio: prismaUser.bio ?? null,
		supabaseId: prismaUser.supabaseId ?? prismaUser.id,
		stripeCustomerId: prismaUser.stripeCustomerId ?? null
	}
}

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name)
	private supabase: SupabaseClient

	constructor(
		private configService: ConfigService,
		private prisma: PrismaService
	) {
		// Initialize Supabase client for server-side operations
		const supabaseUrl = this.configService.get<string>('SUPABASE_URL')
		const supabaseServiceKey = this.configService.get<string>(
			'SUPABASE_SERVICE_ROLE_KEY'
		)

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new Error(
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
	 * Simplified - just trust Supabase's validation
	 */
	async validateSupabaseToken(token: string): Promise<ValidatedUser> {
		try {
			// Let Supabase handle token validation
			const { data: { user }, error } = await this.supabase.auth.getUser(token)

			if (error || !user) {
				throw new UnauthorizedException('Invalid or expired token')
			}

			// Ensure user email is verified
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
	private async syncUserWithDatabase(supabaseUser: SupabaseUser): Promise<ValidatedUser> {
		const { id: supabaseId, email, user_metadata } = supabaseUser

		if (!email) {
			throw new UnauthorizedException('User email is required')
		}

		const name = user_metadata?.name || user_metadata?.full_name || ''
		const avatarUrl = user_metadata?.avatar_url || null

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
				createdAt: supabaseUser.created_at ? new Date(supabaseUser.created_at) : new Date(),
				updatedAt: supabaseUser.updated_at ? new Date(supabaseUser.updated_at) : new Date()
			}
		})

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
	async getUserBySupabaseId(supabaseId: string): Promise<ValidatedUser | null> {
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
	 * Delete user and all associated data
	 */
	async deleteUser(supabaseId: string): Promise<void> {
		await this.prisma.user.delete({
			where: { id: supabaseId }
		})
	}

	/**
	 * Test Supabase connection
	 */
	async testSupabaseConnection(): Promise<{ connected: boolean; auth?: object }> {
		try {
			const { data, error } = await this.supabase.auth.getSession()
			
			if (error) {
				this.logger.error('Supabase connection test failed:', error)
				throw new Error(`Supabase connection failed: ${error.message}`)
			}

			return {
				connected: true,
				auth: {
					session: data.session ? 'exists' : 'none',
					url: this.configService.get('SUPABASE_URL')?.substring(0, 30) + '...'
				}
			}
		} catch (error) {
			this.logger.error('Supabase connection test error:', error)
			throw error
		}
	}
}