import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import type { MaintenanceRequest } from '@repo/shared'
import {
	ErrorCode,
	ErrorHandlerService
} from '../services/error-handler.service'

/**
 * IMPORTANT: Database Schema Reference
 * 
 * The actual Supabase table name is: "MaintenanceRequest" (not "maintenance_requests")
 * 
 * Key column mappings:
 * - unitId (not unit_id)
 * - requestedBy (not owner_id) - References the user who created the request
 * - createdAt, updatedAt, completedAt (camelCase)
 * - assignedTo, estimatedCost, actualCost (camelCase)
 * 
 * The table uses enum types for:
 * - priority: Priority enum (MEDIUM, HIGH, etc.)
 * - status: RequestStatus enum (OPEN, IN_PROGRESS, etc.)
 */

export interface MaintenanceCreateDto {
	unitId: string
	title: string
	description: string
	category?: string
	priority?: MaintenancePriority
	status?: MaintenanceStatus
	preferredDate?: string
	allowEntry?: boolean
	contactPhone?: string
	requestedBy?: string
	notes?: string
}

export interface MaintenanceUpdateDto {
	title?: string
	description?: string
	category?: string
	priority?: MaintenancePriority
	status?: MaintenanceStatus
	preferredDate?: string
	allowEntry?: boolean
	contactPhone?: string
	requestedBy?: string
	notes?: string
	assignedTo?: string
	estimatedCost?: number
	actualCost?: number
	completedAt?: string
}

export interface MaintenanceQueryDto {
	unitId?: string
	propertyId?: string
	status?: MaintenanceStatus
	priority?: MaintenancePriority
	assignedTo?: string
	limit?: number
	offset?: number
}

export enum MaintenancePriority {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	EMERGENCY = 'EMERGENCY'
}

export enum MaintenanceCategory {
	PLUMBING = 'plumbing',
	ELECTRICAL = 'electrical',
	HVAC = 'hvac',
	APPLIANCES = 'appliances',
	GENERAL = 'general',
	EMERGENCY = 'emergency'
}

export enum MaintenanceStatus {
	OPEN = 'OPEN',
	IN_PROGRESS = 'IN_PROGRESS',
	COMPLETED = 'COMPLETED',
	CANCELED = 'CANCELED',
	ON_HOLD = 'ON_HOLD'
}

@Injectable()
export class MaintenanceService {
	private readonly logger = new Logger(MaintenanceService.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly errorHandler: ErrorHandlerService
	) {}

	async create(ownerId: string, createDto: MaintenanceCreateDto): Promise<MaintenanceRequest> {
		try {
			const client = this.supabaseService.getAdminClient()
			
			const { data, error } = await client
				.from('MaintenanceRequest')
				.insert({
					unitId: createDto.unitId,
					title: createDto.title,
					description: createDto.description,
					category: createDto.category,
					priority: createDto.priority || MaintenancePriority.MEDIUM,
					status: createDto.status || MaintenanceStatus.OPEN,
					preferredDate: createDto.preferredDate,
					allowEntry: createDto.allowEntry ?? true,
					contactPhone: createDto.contactPhone,
					requestedBy: createDto.requestedBy || ownerId,
					notes: createDto.notes
				})
				.select()
				.single()

			if (error) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.STORAGE_ERROR,
					'Failed to create maintenance request',
					{ metadata: { error: error.message } }
				)
			}

			return data as MaintenanceRequest
		} catch (error) {
			this.logger.error('Failed to create maintenance request', { error, ownerId, createDto })
			throw error
		}
	}

	async findAll(ownerId: string, query?: MaintenanceQueryDto): Promise<MaintenanceRequest[]> {
		try {
			const client = this.supabaseService.getAdminClient()
			
			let queryBuilder = client
				.from('MaintenanceRequest')
				.select('*')
				.eq('requestedBy', ownerId)

			if (query?.unitId) {
				queryBuilder = queryBuilder.eq('unitId', query.unitId)
			}
			
			if (query?.status) {
				queryBuilder = queryBuilder.eq('status', query.status)
			}
			
			if (query?.priority) {
				queryBuilder = queryBuilder.eq('priority', query.priority)
			}

			if (query?.limit) {
				queryBuilder = queryBuilder.limit(query.limit)
			}

			if (query?.offset) {
				queryBuilder = queryBuilder.range(query.offset, (query.offset + (query.limit || 10)) - 1)
			}

			const { data, error } = await queryBuilder

			if (error) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.STORAGE_ERROR,
					'Failed to fetch maintenance requests',
					{ metadata: { error: error.message } }
				)
			}

			return data as MaintenanceRequest[]
		} catch (error) {
			this.logger.error('Failed to fetch maintenance requests', { error, ownerId, query })
			throw error
		}
	}

	async findOne(id: string, ownerId: string): Promise<MaintenanceRequest> {
		try {
			const client = this.supabaseService.getAdminClient()
			
			const { data, error } = await client
				.from('MaintenanceRequest')
				.select('*')
				.eq('id', id)
				.eq('requestedBy', ownerId)
				.single()

			if (error) {
				throw this.errorHandler.createNotFoundError('Maintenance request', id)
			}

			return data as MaintenanceRequest
		} catch (error) {
			this.logger.error('Failed to fetch maintenance request', { error, id, ownerId })
			throw error
		}
	}

	async update(id: string, ownerId: string, updateDto: MaintenanceUpdateDto): Promise<MaintenanceRequest> {
		try {
			const client = this.supabaseService.getAdminClient()
			
			const { data, error } = await client
				.from('MaintenanceRequest')
				.update(updateDto)
				.eq('id', id)
				.eq('requestedBy', ownerId)
				.select()
				.single()

			if (error) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.STORAGE_ERROR,
					'Failed to update maintenance request',
					{ metadata: { error: error.message } }
				)
			}

			return data as MaintenanceRequest
		} catch (error) {
			this.logger.error('Failed to update maintenance request', { error, id, ownerId, updateDto })
			throw error
		}
	}

	async remove(id: string, ownerId: string): Promise<void> {
		try {
			const client = this.supabaseService.getAdminClient()
			
			const { error } = await client
				.from('MaintenanceRequest')
				.delete()
				.eq('id', id)
				.eq('requestedBy', ownerId)

			if (error) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.STORAGE_ERROR,
					'Failed to delete maintenance request',
					{ metadata: { error: error.message } }
				)
			}
		} catch (error) {
			this.logger.error('Failed to delete maintenance request', { error, id, ownerId })
			throw error
		}
	}
}