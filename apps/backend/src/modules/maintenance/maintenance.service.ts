/**
 * Maintenance Service - Repository Pattern Implementation
 *
 * - NO ABSTRACTIONS: Service delegates to repository directly
 * - KISS: Simple, focused service methods
 * - DRY: Repository handles data access logic
 * - Production mirror: Matches controller interface exactly
 */

import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest
} from '@repo/shared/types/backend-domain'
import type {
	MaintenanceRequest,
	MaintenanceStats
} from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import type {
	IMaintenanceRepository,
	MaintenanceQueryOptions
} from '../../repositories/interfaces/maintenance-repository.interface'
import type { IPropertiesRepository } from '../../repositories/interfaces/properties-repository.interface'
import type { IUnitsRepository } from '../../repositories/interfaces/units-repository.interface'
import { REPOSITORY_TOKENS } from '../../repositories/repositories.module'
import { MaintenanceUpdatedEvent } from '../notifications/events/notification.events'

@Injectable()
export class MaintenanceService {
	private readonly logger = new Logger(MaintenanceService.name)

	constructor(
		@Inject(REPOSITORY_TOKENS.MAINTENANCE)
		private readonly maintenanceRepository: IMaintenanceRepository,
		@Inject(REPOSITORY_TOKENS.UNITS)
		private readonly unitsRepository: IUnitsRepository,
		@Inject(REPOSITORY_TOKENS.PROPERTIES)
		private readonly propertiesRepository: IPropertiesRepository,
		private readonly eventEmitter: EventEmitter2
	) {}

	/**
	 * Get all maintenance requests for a user via repository
	 */
	async findAll(
		userId: string,
		query: Record<string, unknown>
	): Promise<MaintenanceRequest[]> {
		try {
			if (!userId) {
				this.logger.warn(
					'Find all maintenance requests requested without userId'
				)
				throw new BadRequestException('User ID is required')
			}

			const options: MaintenanceQueryOptions = {
				search: query.search as string,
				propertyId: query.propertyId as string,
				unitId: query.unitId as string,
				tenantId: query.tenantId as string,
				status: query.status as string,
				priority: query.priority as Database['public']['Enums']['Priority'],
				category:
					query.category as Database['public']['Enums']['MaintenanceCategory'],
				assignedTo: query.assignedTo as string,
				dateFrom: query.dateFrom
					? new Date(query.dateFrom as string)
					: undefined,
				dateTo: query.dateTo ? new Date(query.dateTo as string) : undefined,
				limit: query.limit as number,
				offset: query.offset as number,
				sort: query.sortBy as string,
				order: query.sortOrder as 'asc' | 'desc'
			}

			this.logger.log('Finding all maintenance requests via repository', {
				userId,
				options
			})

			return await this.maintenanceRepository.findByUserIdWithSearch(
				userId,
				options
			)
		} catch (error) {
			this.logger.error(
				'Maintenance service failed to find all maintenance requests',
				{
					error: error instanceof Error ? error.message : String(error),
					userId,
					query
				}
			)
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to fetch maintenance requests'
			)
		}
	}

	/**
	 * Get maintenance statistics via repository
	 */
	async getStats(
		userId: string
	): Promise<
		MaintenanceStats & { totalCost: number; avgResponseTimeHours: number }
	> {
		try {
			if (!userId) {
				this.logger.warn('Maintenance stats requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting maintenance stats via repository', { userId })

			// Repository now returns all calculated stats including totalCost and avgResponseTimeHours
			const stats = await this.maintenanceRepository.getStats(userId)

			return stats
		} catch (error) {
			this.logger.error('Maintenance service failed to get stats', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to get maintenance statistics'
			)
		}
	}

	/**
	 * Get urgent maintenance requests via repository
	 */
	async getUrgent(userId: string): Promise<MaintenanceRequest[]> {
		try {
			if (!userId) {
				this.logger.warn('Urgent maintenance requests requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting urgent maintenance requests via repository', {
				userId
			})

			return await this.maintenanceRepository.getHighPriorityRequests(userId)
		} catch (error) {
			this.logger.error('Maintenance service failed to get urgent requests', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to get urgent maintenance requests'
			)
		}
	}

	/**
	 * Get overdue maintenance requests via repository
	 */
	async getOverdue(userId: string): Promise<MaintenanceRequest[]> {
		try {
			if (!userId) {
				this.logger.warn(
					'Overdue maintenance requests requested without userId'
				)
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting overdue maintenance requests via repository', {
				userId
			})

			return await this.maintenanceRepository.getOverdueRequests(userId)
		} catch (error) {
			this.logger.error('Maintenance service failed to get overdue requests', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to get overdue maintenance requests'
			)
		}
	}

	/**
	 * Find one maintenance request by ID via repository
	 */
	async findOne(
		userId: string,
		maintenanceId: string
	): Promise<MaintenanceRequest | null> {
		try {
			if (!userId || !maintenanceId) {
				this.logger.warn(
					'Find one maintenance request called with missing parameters',
					{ userId, maintenanceId }
				)
				return null
			}

			this.logger.log('Finding one maintenance request via repository', {
				userId,
				maintenanceId
			})

			const maintenance =
				await this.maintenanceRepository.findById(maintenanceId)

			// Note: Maintenance ownership is verified via property ownership in repository RLS policies

			return maintenance
		} catch (error) {
			this.logger.error(
				'Maintenance service failed to find one maintenance request',
				{
					error: error instanceof Error ? error.message : String(error),
					userId,
					maintenanceId
				}
			)
			return null
		}
	}

	private async resolvePropertyContext(unitId?: string) {
		if (!unitId) {
			return {
				propertyName: 'Unknown Property',
				unitName: 'Unknown Unit'
			}
		}

		try {
			const unit = await this.unitsRepository.findById(unitId)
			if (!unit) {
				return {
					propertyName: 'Unknown Property',
					unitName: 'Unknown Unit'
				}
			}

			const unitName = unit.unitNumber || unit.id
			if (!unit.propertyId) {
				return {
					propertyName: 'Unknown Property',
					unitName
				}
			}

			const property = await this.propertiesRepository.findById(unit.propertyId)
			return {
				propertyName: property?.name ?? 'Unknown Property',
				unitName
			}
		} catch (error) {
			this.logger.warn(
				'Failed to resolve property context for maintenance event',
				{
					error: error instanceof Error ? error.message : String(error),
					unitId
				}
			)
			return {
				propertyName: 'Unknown Property',
				unitName: 'Unknown Unit'
			}
		}
	}

	/**
	 * Create maintenance request via repository with event emission
	 */
	async create(
		userId: string,
		createRequest: CreateMaintenanceRequest
	): Promise<MaintenanceRequest> {
		try {
			if (!userId || !createRequest.title) {
				this.logger.warn(
					'Create maintenance request called with missing parameters',
					{ userId, createRequest }
				)
				throw new BadRequestException('User ID and title are required')
			}

			this.logger.log('Creating maintenance request via repository', {
				userId,
				createRequest
			})

			// Validate photo URLs if provided
			if (createRequest.photos && createRequest.photos.length > 0) {
				const supabaseStorageUrl =
					'https://bshjmbshupiibfiewpxb.supabase.co/storage/v1/object/public/maintenance-photos/'
				const invalidPhotos = createRequest.photos.filter(
					url => !url.startsWith(supabaseStorageUrl)
				)
				if (invalidPhotos.length > 0) {
					this.logger.warn('Invalid photo URLs detected', { invalidPhotos })
					throw new BadRequestException(
						'All photo URLs must be from Supabase Storage'
					)
				}
			}

			// Convert CreateMaintenanceRequest to repository input format
			const maintenanceInput = {
				title: createRequest.title,
				description: createRequest.description,
				priority: createRequest.priority || 'MEDIUM',
				unitId: createRequest.unitId,
				allowEntry: true, // Default value
				photos: createRequest.photos || [],
				preferredDate: createRequest.scheduledDate
					? new Date(createRequest.scheduledDate).toISOString()
					: undefined,
				category: createRequest.category,
				estimatedCost: createRequest.estimatedCost
			}

			const priorityMap: Record<
				string,
				'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
			> = {
				LOW: 'LOW',
				MEDIUM: 'MEDIUM',
				HIGH: 'HIGH',
				URGENT: 'EMERGENCY'
			}

			const maintenance = await this.maintenanceRepository.create(userId, {
				...maintenanceInput,
				priority: priorityMap[maintenanceInput.priority] || 'MEDIUM'
			})

			// Emit maintenance created event
			this.eventEmitter.emit('maintenance.created', {
				userId,
				maintenanceId: maintenance.id,
				maintenanceTitle: maintenance.title,
				priority: maintenance.priority,
				unitId: maintenance.unitId
			})

			return maintenance
		} catch (error) {
			this.logger.error(
				'Maintenance service failed to create maintenance request',
				{
					error: error instanceof Error ? error.message : String(error),
					userId,
					createRequest
				}
			)
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to create maintenance request'
			)
		}
	}

	/**
	 * Update maintenance request via repository
	 */
	async update(
		userId: string,
		maintenanceId: string,
		updateRequest: UpdateMaintenanceRequest
	): Promise<MaintenanceRequest | null> {
		try {
			if (!userId || !maintenanceId) {
				this.logger.warn(
					'Update maintenance request called with missing parameters',
					{ userId, maintenanceId }
				)
				return null
			}

			// Note: Maintenance ownership is verified via unit ownership in repository RLS policies
			const existing = await this.maintenanceRepository.findById(maintenanceId)
			if (!existing) {
				this.logger.warn('Maintenance request not found', {
					userId,
					maintenanceId
				})
				return null
			}

			this.logger.log('Updating maintenance request via repository', {
				userId,
				maintenanceId,
				updateRequest
			})

			// Convert UpdateMaintenanceRequest to repository input format
			const updateInput = {
				...updateRequest,
				completedAt: updateRequest.completedDate
					? new Date(updateRequest.completedDate).toISOString()
					: undefined
			}

			// Use database enum types directly for type safety
			type Priority = Database['public']['Enums']['Priority']
			type RequestStatus = Database['public']['Enums']['RequestStatus']

			const priorityMap: Record<string, Priority> = {
				LOW: 'LOW',
				MEDIUM: 'MEDIUM',
				HIGH: 'HIGH',
				URGENT: 'EMERGENCY'
			}

			const statusMap: Record<string, RequestStatus> = {
				PENDING: 'OPEN',
				IN_PROGRESS: 'IN_PROGRESS',
				COMPLETED: 'COMPLETED',
				CANCELLED: 'CANCELED'
			}

			const updated = await this.maintenanceRepository.update(maintenanceId, {
				...updateInput,
				priority: updateInput.priority
					? priorityMap[updateInput.priority] || 'MEDIUM'
					: undefined,
				status: updateInput.status
					? statusMap[updateInput.status] || 'OPEN'
					: undefined
			})

			if (updated) {
				const { propertyName, unitName } = await this.resolvePropertyContext(
					updated.unitId
				)
				this.eventEmitter.emit(
					'maintenance.updated',
					new MaintenanceUpdatedEvent(
						userId,
						updated.id,
						updated.title,
						updated.status,
						updated.priority,
						propertyName,
						unitName,
						updated.description
					)
				)
			}

			return updated
		} catch (error) {
			this.logger.error(
				'Maintenance service failed to update maintenance request',
				{
					error: error instanceof Error ? error.message : String(error),
					userId,
					maintenanceId,
					updateRequest
				}
			)
			return null
		}
	}

	/**
	 * Remove maintenance request via repository
	 */
	async remove(userId: string, maintenanceId: string): Promise<void> {
		try {
			if (!userId || !maintenanceId) {
				this.logger.warn(
					'Remove maintenance request called with missing parameters',
					{ userId, maintenanceId }
				)
				throw new BadRequestException('User ID and maintenance ID are required')
			}

			this.logger.log('Removing maintenance request via repository', {
				userId,
				maintenanceId
			})

			const result = await this.maintenanceRepository.softDelete(
				userId,
				maintenanceId
			)

			if (!result.success) {
				throw new BadRequestException(result.message)
			}
		} catch (error) {
			this.logger.error(
				'Maintenance service failed to remove maintenance request',
				{
					error: error instanceof Error ? error.message : String(error),
					userId,
					maintenanceId
				}
			)
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to remove maintenance request'
			)
		}
	}

	/**
	 * Complete maintenance request via repository
	 */
	async complete(
		userId: string,
		maintenanceId: string,
		actualCost?: number,
		notes?: string
	): Promise<MaintenanceRequest | null> {
		try {
			if (!userId || !maintenanceId) {
				this.logger.warn(
					'Complete maintenance request called with missing parameters',
					{ userId, maintenanceId }
				)
				return null
			}

			this.logger.log('Completing maintenance request via repository', {
				userId,
				maintenanceId,
				actualCost,
				notes
			})

			return await this.maintenanceRepository.updateStatus(
				maintenanceId,
				'COMPLETED',
				userId,
				notes
			)
		} catch (error) {
			this.logger.error(
				'Maintenance service failed to complete maintenance request',
				{
					error: error instanceof Error ? error.message : String(error),
					userId,
					maintenanceId,
					actualCost,
					notes
				}
			)
			return null
		}
	}

	/**
	 * Cancel maintenance request via repository
	 */
	async cancel(
		userId: string,
		maintenanceId: string,
		reason?: string
	): Promise<MaintenanceRequest | null> {
		try {
			if (!userId || !maintenanceId) {
				this.logger.warn(
					'Cancel maintenance request called with missing parameters',
					{ userId, maintenanceId }
				)
				return null
			}

			this.logger.log('Cancelling maintenance request via repository', {
				userId,
				maintenanceId,
				reason
			})

			return await this.maintenanceRepository.updateStatus(
				maintenanceId,
				'CANCELED',
				userId,
				reason
			)
		} catch (error) {
			this.logger.error(
				'Maintenance service failed to cancel maintenance request',
				{
					error: error instanceof Error ? error.message : String(error),
					userId,
					maintenanceId,
					reason
				}
			)
			return null
		}
	}
}
