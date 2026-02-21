/**
 * Vendors Service
 * CRUD operations for vendor/contractor management
 * RLS COMPLIANT: Uses getUserClient(token) - RLS filters to owner's vendors automatically
 *
 * NOTE: The vendors table is created by migration 20260220140000_create_vendors_table.sql.
 * Until pnpm db:types is run after applying the migration, 'vendors' will not appear in
 * the generated supabase.ts. The client is typed as SupabaseClient (without Database
 * generic) to allow access to tables not yet in the generated types.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VendorCreate, VendorUpdate } from '@repo/shared/validation/vendors'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'

// ============================================================================
// Local vendor row type (until pnpm db:types regenerates supabase.ts)
// Exported so controllers can reference the return type without re-declaring
// ============================================================================

export interface VendorRow {
	id: string
	owner_user_id: string
	name: string
	email: string | null
	phone: string | null
	trade: string
	hourly_rate: number | null
	status: string
	notes: string | null
	created_at: string
	updated_at: string
}

@Injectable()
export class VendorsService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger,
	) {}

	/**
	 * Get an untyped Supabase client for the vendors table.
	 * The vendors table is not yet in the generated Database types
	 * (requires pnpm db:types after migration is applied), so we use
	 * SupabaseClient without the Database generic to allow access.
	 */
	private getClient(token: string): SupabaseClient {
		return this.supabase.getUserClient(token) as unknown as SupabaseClient
	}

	/**
	 * List all vendors for the authenticated user with optional filters
	 * Defaults to active vendors only unless status filter is provided
	 */
	async findAll(
		token: string,
		query: {
			trade?: string
			status?: string
			search?: string
			limit?: number
			offset?: number
		},
	) {
		const client = this.getClient(token)

		let qb = client
			.from('vendors')
			.select(
				'id, owner_user_id, name, email, phone, trade, hourly_rate, status, notes, created_at, updated_at',
				{ count: 'exact' },
			)
			.order('name', { ascending: true })

		if (query.trade) qb = qb.eq('trade', query.trade)
		if (query.status) {
			qb = qb.eq('status', query.status)
		} else {
			// Default to active vendors only
			qb = qb.eq('status', 'active')
		}
		if (query.search) qb = qb.ilike('name', `%${query.search}%`)

		const limit = Math.min(query.limit ?? 50, 100)
		const offset = query.offset ?? 0
		qb = qb.range(offset, offset + limit - 1)

		const { data, error, count } = (await qb) as {
			data: VendorRow[] | null
			error: { message: string } | null
			count: number | null
		}

		if (error) {
			this.logger.error('Failed to fetch vendors', { error: error.message })
			throw new BadRequestException(error.message)
		}
		return { data: data ?? [], total: count ?? 0, limit, offset }
	}

	/**
	 * Get a single vendor by ID
	 * RLS ensures the vendor belongs to the authenticated user
	 */
	async findOne(token: string, id: string) {
		const client = this.getClient(token)

		const { data, error } = (await client
			.from('vendors')
			.select(
				'id, owner_user_id, name, email, phone, trade, hourly_rate, status, notes, created_at, updated_at',
			)
			.eq('id', id)
			.single()) as { data: VendorRow | null; error: { message: string } | null }

		if (error || !data) throw new NotFoundException('Vendor not found')
		return data
	}

	/**
	 * Create a new vendor for the authenticated user
	 * owner_user_id is set server-side from the verified JWT user ID
	 */
	async create(token: string, userId: string, createDto: VendorCreate) {
		const client = this.getClient(token)

		const { data, error } = (await client
			.from('vendors')
			.insert({
				name: createDto.name,
				email: createDto.email ?? null,
				phone: createDto.phone ?? null,
				trade: createDto.trade,
				hourly_rate: createDto.hourly_rate ?? null,
				notes: createDto.notes ?? null,
				owner_user_id: userId,
				status: 'active',
			})
			.select(
				'id, owner_user_id, name, email, phone, trade, hourly_rate, status, notes, created_at, updated_at',
			)
			.single()) as { data: VendorRow | null; error: { message: string } | null }

		if (error) {
			this.logger.error('Failed to create vendor', { error: error.message })
			throw new BadRequestException(error.message)
		}
		return data
	}

	/**
	 * Update an existing vendor
	 * RLS ensures only the owner can update their vendors
	 */
	async update(token: string, id: string, updateDto: VendorUpdate) {
		const client = this.getClient(token)

		const { data, error } = (await client
			.from('vendors')
			.update({ ...updateDto, updated_at: new Date().toISOString() })
			.eq('id', id)
			.select(
				'id, owner_user_id, name, email, phone, trade, hourly_rate, status, notes, created_at, updated_at',
			)
			.single()) as { data: VendorRow | null; error: { message: string } | null }

		if (error || !data) throw new NotFoundException('Vendor not found or access denied')
		return data
	}

	/**
	 * Delete a vendor
	 * RLS ensures only the owner can delete their vendors
	 * Linked maintenance requests will have vendor_id set to NULL (ON DELETE SET NULL)
	 */
	async remove(token: string, id: string) {
		const client = this.getClient(token)

		const { error } = (await client.from('vendors').delete().eq('id', id)) as {
			error: { message: string } | null
		}

		if (error) {
			this.logger.error('Failed to delete vendor', { error: error.message })
			throw new BadRequestException(error.message)
		}
	}

	/**
	 * Assign or unassign a vendor to a maintenance request
	 * Pass vendorId=null to unassign
	 */
	async assignToMaintenance(
		token: string,
		maintenanceId: string,
		vendorId: string | null,
	) {
		const client = this.getClient(token)

		const { data, error } = (await client
			.from('maintenance_requests')
			.update({ vendor_id: vendorId, updated_at: new Date().toISOString() })
			.eq('id', maintenanceId)
			.select('id, vendor_id')
			.single()) as {
			data: { id: string; vendor_id: string | null } | null
			error: { message: string } | null
		}

		if (error || !data)
			throw new NotFoundException('Maintenance request not found or access denied')
		return data
	}
}
