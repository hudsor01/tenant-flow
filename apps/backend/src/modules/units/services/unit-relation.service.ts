import { BadRequestException, Injectable } from '@nestjs/common'
import type { Unit } from '@repo/shared/types/core'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'

@Injectable()
export class UnitRelationService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	async findByProperty(token: string, property_id: string): Promise<Unit[]> {
		try {
			if (!token || !property_id) {
				this.logger.warn('Find by property called with missing parameters', {
					property_id
				})
				throw new BadRequestException(
					'Authentication token and property ID are required'
				)
			}

			this.logger.log('Finding units by property via RLS-protected query', {
				property_id
			})

			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('units')
				.select('*')
				.eq('property_id', property_id)
				.order('unit_number', { ascending: true })

			if (error) {
				this.logger.error('Failed to fetch units by property from Supabase', {
					error: error.message,
					property_id
				})
				throw new BadRequestException('Failed to retrieve property units')
			}

			return data as Unit[]
		} catch (error) {
			this.logger.error('UnitRelationService failed to find units by property', {
				error: error instanceof Error ? error.message : String(error),
				property_id
			})
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to retrieve property units'
			)
		}
	}

	async getAvailable(token: string, property_id: string): Promise<Unit[]> {
		try {
			if (!token || !property_id) {
				this.logger.warn(
					'Available units requested without token or property_id'
				)
				throw new BadRequestException(
					'Authentication token and property ID are required'
				)
			}

			this.logger.log('Getting available units via RLS-protected query', {
				property_id
			})

			const client = this.supabase.getUserClient(token)
			const { data, error } = await client
				.from('units')
				.select('*')
				.eq('property_id', property_id)
				.eq('status', 'available')

			if (error) {
				this.logger.error('Failed to get available units from Supabase', {
					error: error.message,
					property_id
				})
				throw new BadRequestException('Failed to get available units')
			}

			return (data as Unit[]) || []
		} catch (error) {
			this.logger.error('UnitRelationService failed to get available units', {
				error: error instanceof Error ? error.message : String(error),
				property_id
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get available units'
			)
		}
	}
}
