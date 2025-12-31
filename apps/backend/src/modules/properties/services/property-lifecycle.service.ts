import type { PropertyStatus } from '@repo/shared/types/core'
import { BadRequestException, Injectable } from '@nestjs/common'

import { SupabaseService } from '../../../database/supabase.service'
import { executeSaga } from '../../../shared/patterns/saga.pattern'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { getTokenFromRequest } from '../../../database/auth-token.utils'
import { AppLogger } from '../../../logger/app-logger.service'
import { PropertiesService } from '../properties.service'
import { PropertyCacheInvalidationService } from './property-cache-invalidation.service'

/**
 * Property Lifecycle Service
 * Handles property status transitions: soft delete (inactive) and sold marking
 * Extracted from PropertiesService to maintain <300 line limit per CLAUDE.md
 *
 * @todo TEST-001: Add unit tests for this service.
 *       Coverage: softDelete, hardDelete, markAsSold, restore operations.
 *       See TODO.md for details.
 */
@Injectable()
export class PropertyLifecycleService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly cacheInvalidation: PropertyCacheInvalidationService,
		private readonly logger: AppLogger,
		private readonly propertiesService: PropertiesService
	) {}

	/**
	 * Soft delete a property by marking it as INACTIVE
	 * Uses saga pattern for compensable transaction
	 */
	async remove(
		req: AuthenticatedRequest,
		property_id: string
	): Promise<{ success: boolean; message: string }> {
		const { token, user_id } = this.extractAuthContext(req)
		const property = await this.validatePropertyAccess(req, property_id)
		await this.executeSoftDeleteSaga(token, property_id, user_id, property.status)
		this.cacheInvalidation.invalidatePropertyCaches(user_id, property_id)

		return { success: true, message: 'Property deleted successfully' }
	}

	/**
	 * Extract and validate authentication context from request
	 */
	private extractAuthContext(
		req: AuthenticatedRequest
	): { token: string; user_id: string } {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		return { token, user_id: req.user.id }
	}

	/**
	 * Validate property exists and user has access
	 */
	private async validatePropertyAccess(
		req: AuthenticatedRequest,
		property_id: string
	) {
		const property = await this.propertiesService.findOne(req, property_id)
		if (!property) {
			throw new BadRequestException('Property not found or access denied')
		}
		return property
	}

	/**
	 * Execute soft delete using saga pattern for compensable transaction
	 */
	private async executeSoftDeleteSaga(
		token: string,
		property_id: string,
		user_id: string,
		previousStatus: PropertyStatus
	): Promise<void> {
		const client = this.supabase.getUserClient(token)

		const result = await executeSaga(
			[
				{
					name: 'Mark property as INACTIVE in database',
					execute: async () => {
						const { data, error } = await client
							.from('properties')
							.update({
								status: 'inactive' as PropertyStatus,
								updated_at: new Date().toISOString()
							})
							.eq('id', property_id)
							.select()
							.single()

						if (error) {
							this.logger.error('Failed to mark property as inactive', {
								error,
								user_id,
								property_id
							})
							throw new BadRequestException('Failed to delete property')
						}

						this.logger.log('Marked property as INACTIVE', { property_id })
						return { previousStatus, data }
					},
					compensate: async (result) => {
						const { previousStatus } = result as { previousStatus: PropertyStatus }
						const { error } = await client
							.from('properties')
							.update({
								status: previousStatus,
								updated_at: new Date().toISOString()
							})
							.eq('id', property_id)

						if (error) {
							this.logger.error(
								'Failed to restore property status during compensation',
								{ error, property_id, previousStatus }
							)
							throw error
						}

						this.logger.log('Restored property status during compensation', {
							property_id,
							status: previousStatus
						})
					}
				}
			],
			this.logger
		)

		if (!result.success) {
			this.logger.error('Property deletion saga failed', {
				error: result.error?.message,
				property_id,
				completedSteps: result.completedSteps,
				compensatedSteps: result.compensatedSteps
			})
			throw new BadRequestException(
				result.error?.message || 'Failed to delete property'
			)
		}

		this.logger.log('Property deletion saga completed successfully', {
			property_id,
			completedSteps: result.completedSteps
		})
	}

	/**
	 * Mark a property as sold with sale date and price
	 */
	async markAsSold(
		req: AuthenticatedRequest,
		property_id: string,
		dateSold: Date,
		salePrice: number
	): Promise<{ success: boolean; message: string }> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		const property = await this.propertiesService.findOne(req, property_id)
		if (!property) {
			throw new BadRequestException('Property not found or access denied')
		}

		const { error } = await client
			.from('properties')
			.update({
				status: 'sold',
				date_sold: dateSold.toISOString().split('T')[0] as string,
				sale_price: salePrice,
				updated_at: new Date().toISOString()
			})
			.eq('id', property_id)

		if (error) {
			this.logger.error('Failed to mark property as sold', {
				error,
				property_id
			})
			throw new BadRequestException(
				'Failed to mark property as sold: ' + error.message
			)
		}

		this.logger.log('Property marked as sold', {
			property_id,
			salePrice,
			dateSold: dateSold.toISOString()
		})

		return {
			success: true,
			message: `Property marked as sold for $${salePrice.toLocaleString()}. Records will be retained for 7 years as required.`
		}
	}
}
