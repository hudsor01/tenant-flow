import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'

@Injectable()
export class PropertyAccessService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	async getPropertyIds(token: string): Promise<string[]> {
		const client = this.supabase.getUserClient(token)
		const { data, error } = await client.from('properties').select('id')

		if (error) {
			this.logger.error('Failed to fetch property ids', {
				error: error.message
			})
			return []
		}

		const rows = (data ?? []) as Array<{ id: string }>
		return rows.map(property => property.id)
	}

	async getUnitIds(token: string): Promise<string[]> {
		const propertyIds = await this.getPropertyIds(token)
		if (propertyIds.length === 0) {
			return []
		}

		const client = this.supabase.getUserClient(token)
		const { data, error } = await client
			.from('units')
			.select('id')
			.in('property_id', propertyIds)

		if (error) {
			this.logger.error('Failed to fetch unit ids', {
				error: error.message
			})
			return []
		}

		return (data ?? []).map(unit => unit.id)
	}
}
