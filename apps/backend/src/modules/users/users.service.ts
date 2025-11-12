import {
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException
} from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import {
	querySingle,
	queryMutation
} from '../../shared/utils/query-helpers'

type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']

/**
 * Safe column list for users queries
 * SECURITY: Explicit column list prevents over-fetching
 */
const SAFE_USERS_COLUMNS = `
	avatarUrl,
	bio,
	chargesEnabled,
	connectedAccountId,
	createdAt,
	detailsSubmitted,
	email,
	firstName,
	id,
	lastLoginAt,
	lastName,
	name,
	onboardingComplete,
	onboardingCompletedAt,
	orgId,
	payoutsEnabled,
	phone,
	profileComplete,
	role,
	stripeAccountId,
	stripeCustomerId,
	subscription_status,
	subscriptionTier,
	supabaseId,
	updatedAt,
	version
`.trim()

@Injectable()
export class UsersService {
	private readonly logger = new Logger(UsersService.name)

	constructor(private readonly supabase: SupabaseService) {}

	async findUserByEmail(
		email: string
	): Promise<Database['public']['Tables']['users']['Row'] | null> {
		try {
			return await querySingle<Database['public']['Tables']['users']['Row']>(
				this.supabase
					.getAdminClient()
					.from('users')
					.select(SAFE_USERS_COLUMNS)
					.eq('email', email)
					.single(),
				{
					resource: 'user',
					operation: 'fetch by email',
					logger: this.logger
				}
			)
		} catch (error) {
			// Return null for not found (soft failure for optional user lookup)
			if (error instanceof NotFoundException) {
				return null
			}
			throw error
		}
	}

	async createUser(
		userData: UserInsert
	): Promise<Database['public']['Tables']['users']['Row']> {
		return await queryMutation<Database['public']['Tables']['users']['Row']>(
			this.supabase.getAdminClient().from('users').insert(userData).select().single(),
			{
				resource: 'user',
				operation: 'create',
				logger: this.logger
			}
		)
	}

	async updateUser(
		userId: string,
		userData: UserUpdate
	): Promise<Database['public']['Tables']['users']['Row']> {
		return await queryMutation<Database['public']['Tables']['users']['Row']>(
			this.supabase
				.getAdminClient()
				.from('users')
				.update(userData)
				.eq('id', userId)
				.select()
				.single(),
			{
				resource: 'user',
				id: userId,
				operation: 'update',
				logger: this.logger
			}
		)
	}

	async getUserById(
		userId: string
	): Promise<Database['public']['Tables']['users']['Row'] | null> {
		try {
			return await querySingle<Database['public']['Tables']['users']['Row']>(
				this.supabase
					.getAdminClient()
					.from('users')
					.select(SAFE_USERS_COLUMNS)
					.eq('id', userId)
					.single(),
				{
					resource: 'user',
					id: userId,
					operation: 'fetch',
					logger: this.logger
				}
			)
		} catch (error) {
			// Return null for not found (soft failure for optional user lookup)
			if (error instanceof NotFoundException) {
				return null
			}
			throw error
		}
	}
}
