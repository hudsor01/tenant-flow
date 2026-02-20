import {
	Injectable,
	InternalServerErrorException,
	NotFoundException
} from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import type { UserInsert, UserUpdate } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'

export interface UserDataExport {
	exported_at: string
	user: {
		id: string
		email: string
		first_name: string | null
		last_name: string | null
		phone: string | null
		user_type: string
		created_at: string | null
	}
	properties: unknown[]
	units: unknown[]
	tenants: unknown[]
	leases: unknown[]
	rent_payments: unknown[]
	maintenance_requests: unknown[]
}

@Injectable()
export class UsersService {
	constructor(private readonly supabase: SupabaseService) {}

	async findUserByEmail(
		email: string
	): Promise<Database['public']['Tables']['users']['Row']> {
		const { data, error } = await this.supabase
			.getAdminClient() // This method is used for authentication lookups, so admin client is appropriate
			.from('users')
			.select('id, email, first_name, last_name, full_name, phone, avatar_url, user_type, status, onboarding_completed_at, onboarding_status, stripe_customer_id, identity_verification_status, identity_verification_session_id, identity_verified_at, identity_verification_data, identity_verification_error, created_at, updated_at')
			.eq('email', email)
			.single()

		if (error || !data) {
			throw new NotFoundException('User not found')
		}

		return data
	}

	async createUser(
		userData: UserInsert
	): Promise<Database['public']['Tables']['users']['Row']> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('users')
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
		token: string,
		user_id: string,
		userData: UserUpdate
	): Promise<Database['public']['Tables']['users']['Row']> {
		// Verify user is authenticated and has permission to update this user
		const client = this.supabase.getUserClient(token)

		// First verify the user exists and they have access to it
		const { data: existingUser, error: fetchError } = await client
			.from('users')
			.select('id')
			.eq('id', user_id)
			.single()

		if (fetchError) {
			throw new InternalServerErrorException(
				`Failed to verify user access: ${fetchError.message}`
			)
		}

		if (!existingUser) {
			throw new InternalServerErrorException('User not found or access denied')
		}

		// Update the user with RLS enforcement
		const { data, error } = await client
			.from('users')
			.update(userData)
			.eq('id', user_id)
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
		token: string,
		user_id: string
	): Promise<Database['public']['Tables']['users']['Row']> {
		const client = this.supabase.getUserClient(token)

		// Use RLS to enforce that user can only access their own data
		const { data, error } = await client
			.from('users')
			.select('id, email, first_name, last_name, full_name, phone, avatar_url, user_type, status, onboarding_completed_at, onboarding_status, stripe_customer_id, identity_verification_data, identity_verification_error, identity_verification_session_id, identity_verification_status, identity_verified_at, created_at, updated_at')
			.eq('id', user_id)
			.single()

		if (error || !data) {
			throw new NotFoundException('User not found')
		}

		return data
	}

	async deleteAccount(user_id: string): Promise<void> {
		const adminClient = this.supabase.getAdminClient()

		// Soft-delete the user record by setting deleted_at
		// Cast needed until migration is applied and `pnpm db:types` regenerates types
		const softDeleteData: Record<string, string | null> = {
			deleted_at: new Date().toISOString()
		}
		const { error: deleteError } = await adminClient
			.from('users')
			.update(softDeleteData as unknown as UserUpdate)
			.eq('id', user_id)

		if (deleteError) {
			throw new InternalServerErrorException(
				`Failed to delete account: ${deleteError.message}`
			)
		}

		// Cascade: deactivate all properties owned by this user
		const { error: propertiesError } = await adminClient
			.from('properties')
			.update({ status: 'inactive' })
			.eq('owner_user_id', user_id)
			.eq('status', 'active')

		if (propertiesError) {
			throw new InternalServerErrorException(
				`Failed to deactivate properties: ${propertiesError.message}`
			)
		}

		// Delete the auth user to revoke all sessions immediately
		const { error: authError } = await adminClient.auth.admin.deleteUser(user_id)

		if (authError) {
			throw new InternalServerErrorException(
				`Failed to delete auth user: ${authError.message}`
			)
		}
	}

	async exportUserData(user_id: string): Promise<UserDataExport> {
		const adminClient = this.supabase.getAdminClient()

		// Fetch user profile
		const { data: user, error: userError } = await adminClient
			.from('users')
			.select('id, email, first_name, last_name, phone, user_type, created_at')
			.eq('id', user_id)
			.single()

		if (userError || !user) {
			throw new NotFoundException('User not found')
		}

		// Fetch all properties
		const { data: properties = [] } = await adminClient
			.from('properties')
			.select('id, name, address_line1, address_line2, city, state, postal_code, property_type, status, created_at')
			.eq('owner_user_id', user_id)

		// Fetch property IDs to query related data
		const propertyIds = (properties ?? []).map((p: { id: string }) => p.id)

		// Fetch units for owned properties
		const { data: units = [] } = propertyIds.length > 0
			? await adminClient
				.from('units')
				.select('id, property_id, unit_number, bedrooms, bathrooms, rent_amount, status, created_at')
				.in('property_id', propertyIds)
			: { data: [] }

		// Fetch tenants
		const { data: tenants = [] } = await adminClient
			.from('tenants')
			.select('id, first_name, last_name, email, phone, status, created_at')
			.eq('owner_user_id', user_id)

		// Fetch unit IDs to query leases
		const unitIds = (units ?? []).map((u: { id: string }) => u.id)

		// Fetch leases
		const { data: leases = [] } = unitIds.length > 0
			? await adminClient
				.from('leases')
				.select('id, unit_id, start_date, end_date, rent_amount, lease_status, created_at')
				.in('unit_id', unitIds)
			: { data: [] }

		// Fetch lease IDs for payment queries
		const leaseIds = (leases ?? []).map((l: { id: string }) => l.id)

		// Fetch rent payments
		const { data: rent_payments = [] } = leaseIds.length > 0
			? await adminClient
				.from('rent_payments')
				.select('id, lease_id, amount, status, due_date, paid_at, created_at')
				.in('lease_id', leaseIds)
			: { data: [] }

		// Fetch maintenance requests
		const { data: maintenance_requests = [] } = propertyIds.length > 0
			? await adminClient
				.from('maintenance_requests')
				.select('id, property_id, title, description, status, priority, created_at')
				.in('property_id', propertyIds)
			: { data: [] }

		return {
			exported_at: new Date().toISOString(),
			user,
			properties: properties ?? [],
			units: units ?? [],
			tenants: tenants ?? [],
			leases: leases ?? [],
			rent_payments: rent_payments ?? [],
			maintenance_requests: maintenance_requests ?? []
		}
	}
}
