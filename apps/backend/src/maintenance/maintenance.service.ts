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
				.select(`
					*,
					unit:Unit!inner (
						id,
						unitNumber,
						property:Property!inner (
							id,
							name,
							address,
							ownerId
						)
					)
				`)
				.eq('unit.property.ownerId', ownerId)
				.order('createdAt', { ascending: false })

			// Apply filters
			if (query?.status) {
				queryBuilder = queryBuilder.eq('status', query.status)
			}
			if (query?.priority) {
				queryBuilder = queryBuilder.eq('priority', query.priority)
			}
			if (query?.category) {
				queryBuilder = queryBuilder.eq('category', query.category)
			}
			if (query?.unitId) {
				queryBuilder = queryBuilder.eq('unitId', query.unitId)
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
				.select(`
					*,
					unit:Unit!inner (
						id,
						unitNumber,
						property:Property!inner (
							id,
							name,
							address,
							ownerId
						)
					)
				`)
				.eq('id', id)
				.eq('unit.property.ownerId', ownerId)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					throw new NotFoundException('Maintenance request not found')
				}
				this.logger.error('Error fetching maintenance request:', error)
				throw new Error(`Failed to fetch maintenance request: ${error.message}`)
			}

			return data
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error
			}
			this.logger.error('Error fetching maintenance request:', error)
			throw new InternalServerErrorException('Failed to fetch maintenance request')
		}
	}

	async create(
		createDto: MaintenanceCreateDto,
		ownerId: string
	): Promise<MaintenanceRequestWithRelations> {
		try {
			const client = this.supabaseService.getAdminClient()

			// First verify the unit belongs to the owner
			const { data: unitCheck, error: unitError } = await client
				.from('Unit')
				.select('id, property:Property!inner(ownerId)')
				.eq('id', createDto.unitId)
				.eq('property.ownerId', ownerId)
				.single()

			if (unitError || !unitCheck) {
				throw new NotFoundException('Unit not found or access denied')
			}

			const maintenanceData = {
				...createDto,
				status: 'OPEN' as RequestStatus,
				allowEntry: createDto.allowEntry ?? false,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			const { data, error } = await client
				.from('MaintenanceRequest')
				.insert(maintenanceData)
				.select(`
					*,
					unit:Unit!inner (
						id,
						unitNumber,
						property:Property!inner (
							id,
							name,
							address,
							ownerId
						)
					)
				`)
				.single()

			if (error) {
				this.logger.error('Error creating maintenance request:', error)
				throw new Error(`Failed to create maintenance request: ${error.message}`)
			}

			this.logger.log(`Created maintenance request: ${data.id}`)
			return data
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error
			}
			this.logger.error('Error creating maintenance request:', error)
			throw new InternalServerErrorException('Failed to create maintenance request')
		}
	}

	async update(
		id: string,
		updateDto: MaintenanceUpdateDto,
		ownerId: string
	): Promise<MaintenanceRequestWithRelations> {
		try {
			const client = this.supabaseService.getAdminClient()

			// First verify the maintenance request belongs to the owner
			const existing = await this.findOne(id, ownerId)
			if (!existing) {
				throw new NotFoundException('Maintenance request not found')
			}

			const updateData = {
				...updateDto,
				updatedAt: new Date().toISOString()
			}

			const { data, error } = await client
				.from('MaintenanceRequest')
				.update(updateData)
				.eq('id', id)
				.select(`
					*,
					unit:Unit!inner (
						id,
						unitNumber,
						property:Property!inner (
							id,
							name,
							address,
							ownerId
						)
					)
				`)
				.single()

			if (error) {
				this.logger.error('Error updating maintenance request:', error)
				throw new Error(`Failed to update maintenance request: ${error.message}`)
			}

			this.logger.log(`Updated maintenance request: ${id}`)
			return data
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error
			}
			this.logger.error('Error updating maintenance request:', error)
			throw new InternalServerErrorException('Failed to update maintenance request')
		}
	}

	async updateStatus(
		id: string,
		status: RequestStatus,
		ownerId: string
	): Promise<MaintenanceRequestWithRelations> {
		try {
			const client = this.supabaseService.getAdminClient()

			// First verify the maintenance request belongs to the owner
			const existing = await this.findOne(id, ownerId)
			if (!existing) {
				throw new NotFoundException('Maintenance request not found')
			}

			const updateData = {
				status,
				updatedAt: new Date().toISOString(),
				...(status === 'COMPLETED' && { completedAt: new Date().toISOString() })
			}

			const { data, error } = await client
				.from('MaintenanceRequest')
				.update(updateData)
				.eq('id', id)
				.select(`
					*,
					unit:Unit!inner (
						id,
						unitNumber,
						property:Property!inner (
							id,
							name,
							address,
							ownerId
						)
					)
				`)
				.single()

			if (error) {
				this.logger.error('Error updating maintenance request status:', error)
				throw new Error(`Failed to update maintenance request status: ${error.message}`)
			}

			this.logger.log(`Updated maintenance request status: ${id} -> ${status}`)
			return data
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error
			}
			this.logger.error('Error updating maintenance request status:', error)
			throw new InternalServerErrorException('Failed to update maintenance request status')
		}
	}

	async remove(id: string, ownerId: string): Promise<void> {
		try {
			const client = this.supabaseService.getAdminClient()

			// First verify the maintenance request belongs to the owner
			const existing = await this.findOne(id, ownerId)
			if (!existing) {
				throw new NotFoundException('Maintenance request not found')
			}

			const { error } = await client
				.from('MaintenanceRequest')
				.delete()
				.eq('id', id)

			if (error) {
				this.logger.error('Error deleting maintenance request:', error)
				throw new Error(`Failed to delete maintenance request: ${error.message}`)
			}

			this.logger.log(`Deleted maintenance request: ${id}`)
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error
			}
			this.logger.error('Error deleting maintenance request:', error)
			throw new InternalServerErrorException('Failed to delete maintenance request')
		}
	}

	async getStats(ownerId: string): Promise<{
		total: number
		open: number
		inProgress: number
		completed: number
		canceled: number
		onHold: number
		overdue: number
		averageCompletionTime: number
		totalCost: number
		averageCost: number
	}> {
		try {
			const client = this.supabaseService.getAdminClient()

			const { data, error } = await client
				.from('MaintenanceRequest')
				.select(`
					status, 
					createdAt, 
					completedAt, 
					actualCost, 
					preferredDate,
					unit:Unit!inner (
						property:Property!inner (
							ownerId
						)
					)
				`)
				.eq('unit.property.ownerId', ownerId)

			if (error) {
				this.logger.error('Error fetching maintenance stats:', error)
				throw new Error(`Failed to fetch maintenance stats: ${error.message}`)
			}

			const requests = data || []
			const now = new Date()

			const stats = {
				total: requests.length,
				open: requests.filter(r => r.status === 'OPEN').length,
				inProgress: requests.filter(r => r.status === 'IN_PROGRESS').length,
				completed: requests.filter(r => r.status === 'COMPLETED').length,
				canceled: requests.filter(r => r.status === 'CANCELED').length,
				onHold: requests.filter(r => r.status === 'ON_HOLD').length,
				overdue: requests.filter(r => 
					r.status !== 'COMPLETED' && 
					r.status !== 'CANCELED' && 
					r.preferredDate && 
					new Date(r.preferredDate) < now
				).length,
				averageCompletionTime: 0,
				totalCost: 0,
				averageCost: 0
			}

			// Calculate completion time and costs
			const completedRequests = requests.filter(r => r.status === 'COMPLETED' && r.completedAt)
			if (completedRequests.length > 0) {
				const totalDays = completedRequests.reduce((sum, r) => {
					const created = new Date(r.createdAt)
					const completed = new Date(r.completedAt ?? r.createdAt)
					return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
				}, 0)
				stats.averageCompletionTime = totalDays / completedRequests.length
			}

			const requestsWithCost = requests.filter(r => r.actualCost)
			if (requestsWithCost.length > 0) {
				stats.totalCost = requestsWithCost.reduce((sum, r) => sum + (r.actualCost || 0), 0)
				stats.averageCost = stats.totalCost / requestsWithCost.length
			}

			return stats
		} catch (error) {
			this.logger.error('Error fetching maintenance stats:', error)
			throw new InternalServerErrorException('Failed to fetch maintenance stats')
		}
	}
}
