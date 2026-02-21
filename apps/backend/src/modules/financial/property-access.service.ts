/**
 * Property Access Service (Financial Module)
 *
 * Provides property and unit ID lookups for the financial module.
 * Moved here from the deleted properties module as this was the only consumer.
 */

import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class PropertyAccessService {
	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Get all property IDs owned by the authenticated user
	 */
	async getPropertyIds(token: string): Promise<string[]> {
		const client = this.supabaseService.getUserClient(token)
		const { data } = await client
			.from('properties')
			.select('id')
			.neq('status', 'inactive')

		return (data ?? []).map((p: { id: string }) => p.id)
	}

	/**
	 * Get all unit IDs for properties owned by the authenticated user
	 */
	async getUnitIds(token: string): Promise<string[]> {
		const propertyIds = await this.getPropertyIds(token)

		if (propertyIds.length === 0) {
			return []
		}

		const client = this.supabaseService.getUserClient(token)
		const { data } = await client
			.from('units')
			.select('id')
			.in('property_id', propertyIds)
			.neq('status', 'inactive')

		return (data ?? []).map((u: { id: string }) => u.id)
	}
}
