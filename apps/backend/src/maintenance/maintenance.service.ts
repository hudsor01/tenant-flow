import { Injectable, BadRequestException, NotFoundException, Scope, Inject, Logger } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import { TypeSafeConfigService } from '../common/config/config.service'
import { CreateMaintenanceRequestDto, UpdateMaintenanceRequestDto } from '../common/dto/dto-exports'

type MaintenanceRequest = Database['public']['Tables']['MaintenanceRequest']['Row']
type MaintenanceRequestInsert = Database['public']['Tables']['MaintenanceRequest']['Insert']
type MaintenanceRequestUpdate = Database['public']['Tables']['MaintenanceRequest']['Update']

export interface MaintenanceRequestWithRelations extends MaintenanceRequest {
	Unit?: {
		id: string
		unitNumber: string
		status: string
		Property: {
			id: string
			name: string
			address: string
			ownerId: string
		}
	}
}

export interface MaintenanceRequestQueryOptions {
	status?: string
	priority?: string
	category?: string
	unitId?: string
	requestedByEmail?: string
	search?: string
	limit?: number
	offset?: number
	page?: number
}

/**
 * Maintenance service - Direct Supabase implementation following KISS principle
 * No abstraction layers, no base classes, just simple CRUD operations
 */
@Injectable({ scope: Scope.REQUEST })
export class MaintenanceService {
	private readonly logger = new Logger(MaintenanceService.name)
	private readonly supabase: SupabaseClient<Database>

	constructor(
		@Inject(REQUEST) private request: any,
		private supabaseService: SupabaseService
	) {
		// Get user-scoped client if token available, otherwise admin client
		const token = this.request.user?.supabaseToken || 
			this.request.headers?.authorization?.replace('Bearer ', '')
		
		this.supabase = token 
			? this.supabaseService.getUserClient(token)
			: this.supabaseService.getAdminClient()
	}

	/**
	 * Get all maintenance requests for an owner
	 */
	async findAll(
		ownerId: string, 
		options: MaintenanceRequestQueryOptions = {}
	): Promise<MaintenanceRequestWithRelations[]> {
		const {
			status,
			priority,
			category,
			unitId,
			requestedByEmail,
			search,
			limit = 50,
			offset = 0
		} = options

		let query = this.supabase
			.from('MaintenanceRequest')
			.select(`
				*,
				Unit!inner (
					id,
					unitNumber,
					status,
					Property!inner (
						id,
						name,
						address,
						ownerId
					)
				)
			`)
			.eq('Unit.Property.ownerId', ownerId)

		// Apply filters
		if (status) query = query.eq('status', status as MaintenanceRequest['status'])
		if (priority) query = query.eq('priority', priority as MaintenanceRequest['priority'])
		if (category) query = query.eq('category', category)
		if (unitId) query = query.eq('unitId', unitId)
		if (requestedByEmail) query = query.eq('requestedByEmail', requestedByEmail)

		// Search in title, description, category, notes
		if (search) {
			query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%,notes.ilike.%${search}%`)
		}

		// Order and paginate
		query = query
			.order('createdAt', { ascending: false })
			.range(offset, offset + limit - 1)

		const { data, error } = await query

		if (error) {
			this.logger.error('Failed to fetch maintenance requests:', error)
			throw new BadRequestException(error.message)
		}

		return data as MaintenanceRequestWithRelations[]
	}

	/**
	 * Get single maintenance request by ID
	 */
	async findOne(id: string, ownerId: string): Promise<MaintenanceRequestWithRelations> {
		const { data, error } = await this.supabase
			.from('MaintenanceRequest')
			.select(`
				*,
				Unit!inner (
					id,
					unitNumber,
					status,
					Property!inner (
						id,
						name,
						address,
						ownerId
					)
				)
			`)
			.eq('id', id)
			.eq('Unit.Property.ownerId', ownerId)
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				throw new NotFoundException('Maintenance request not found')
			}
			this.logger.error('Failed to fetch maintenance request:', error)
			throw new BadRequestException(error.message)
		}

		return data as MaintenanceRequestWithRelations
	}

	/**
	 * Create new maintenance request
	 */
	async create(dto: CreateMaintenanceRequestDto, ownerId: string): Promise<MaintenanceRequestWithRelations> {
		// First validate unit ownership
		const { data: unit, error: unitError } = await this.supabase
			.from('Unit')
			.select(`
				id,
				Property!inner (
					ownerId
				)
			`)
			.eq('id', dto.unitId)
			.single()

		if (unitError || !unit || unit.Property.ownerId !== ownerId) {
			throw new BadRequestException('Unit not found or not owned by user')
		}

		const requestData: MaintenanceRequestInsert = {
			unitId: dto.unitId,
			title: dto.title,
			description: dto.description,
			category: dto.category || 'GENERAL',
			priority: (dto.priority || 'MEDIUM') as MaintenanceRequestInsert['priority'],
			status: (dto.status || 'OPEN') as MaintenanceRequestInsert['status'],
			contactPhone: dto.contactPhone,
			requestedBy: dto.requestedBy,
			allowEntry: dto.allowEntry,
			photos: dto.photos || [],
			notes: dto.notes,
			preferredDate: dto.preferredDate ? new Date(dto.preferredDate).toISOString() : undefined,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}

		const { data, error } = await this.supabase
			.from('MaintenanceRequest')
			.insert(requestData)
			.select(`
				*,
				Unit (
					id,
					unitNumber,
					status,
					Property (
						id,
						name,
						address,
						ownerId
					)
				)
			`)
			.single()

		if (error) {
			this.logger.error('Failed to create maintenance request:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Maintenance request created: ${data.id}`)
		return data as MaintenanceRequestWithRelations
	}

	/**
	 * Update maintenance request
	 */
	async update(
		id: string,
		dto: UpdateMaintenanceRequestDto,
		ownerId: string
	): Promise<MaintenanceRequestWithRelations> {
		// Verify ownership
		await this.findOne(id, ownerId)

		const updateData: MaintenanceRequestUpdate = {
			updatedAt: new Date().toISOString()
		}

		// Copy over defined fields
		if (dto.title) updateData.title = dto.title
		if (dto.description) updateData.description = dto.description
		if (dto.category) updateData.category = dto.category
		if (dto.priority) updateData.priority = dto.priority as MaintenanceRequestUpdate['priority']
		if (dto.status) updateData.status = dto.status as MaintenanceRequestUpdate['status']
		if (dto.allowEntry !== undefined) updateData.allowEntry = dto.allowEntry
		if (dto.contactPhone) updateData.contactPhone = dto.contactPhone
		if (dto.actualCost !== undefined) updateData.actualCost = dto.actualCost
		if (dto.estimatedCost !== undefined) updateData.estimatedCost = dto.estimatedCost
		if (dto.assignedTo) updateData.assignedTo = dto.assignedTo
		if (dto.photos) updateData.photos = dto.photos
		if (dto.preferredDate) updateData.preferredDate = new Date(dto.preferredDate).toISOString()

		// Set completion date if status is completed
		if (dto.status === 'COMPLETED') {
			updateData.completedAt = new Date().toISOString()
		}

		const { data, error } = await this.supabase
			.from('MaintenanceRequest')
			.update(updateData)
			.eq('id', id)
			.select(`
				*,
				Unit (
					id,
					unitNumber,
					status,
					Property (
						id,
						name,
						address,
						ownerId
					)
				)
			`)
			.single()

		if (error) {
			this.logger.error('Failed to update maintenance request:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Maintenance request updated: ${id}`)
		return data as MaintenanceRequestWithRelations
	}

	/**
	 * Delete maintenance request
	 */
	async remove(id: string, ownerId: string): Promise<void> {
		// Verify ownership
		await this.findOne(id, ownerId)

		const { error } = await this.supabase
			.from('MaintenanceRequest')
			.delete()
			.eq('id', id)

		if (error) {
			this.logger.error('Failed to delete maintenance request:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Maintenance request deleted: ${id}`)
	}

	/**
	 * Get maintenance request statistics
	 */
	async getStats(ownerId: string): Promise<{
		total: number
		open: number
		inProgress: number
		completed: number
		emergency: number
		high: number
		medium: number
		low: number
	}> {
		const { data: requests, error } = await this.supabase
			.from('MaintenanceRequest')
			.select(`
				status,
				priority,
				Unit!inner (
					Property!inner (
						ownerId
					)
				)
			`)
			.eq('Unit.Property.ownerId', ownerId)

		if (error) {
			this.logger.error('Failed to fetch maintenance request stats:', error)
			throw new BadRequestException(error.message)
		}

		const stats = {
			total: requests?.length || 0,
			open: 0,
			inProgress: 0,
			completed: 0,
			emergency: 0,
			high: 0,
			medium: 0,
			low: 0
		}

		if (requests) {
			for (const request of requests) {
				// Count by status
				switch (request.status) {
					case 'OPEN':
						stats.open++
						break
					case 'IN_PROGRESS':
						stats.inProgress++
						break
					case 'COMPLETED':
						stats.completed++
						break
				}

				// Count by priority
				switch (request.priority) {
					case 'EMERGENCY':
						stats.emergency++
						break
					case 'HIGH':
						stats.high++
						break
					case 'MEDIUM':
						stats.medium++
						break
					case 'LOW':
						stats.low++
						break
				}
			}
		}

		return stats
	}

	/**
	 * Search maintenance requests by text
	 */
	async search(ownerId: string, searchTerm: string): Promise<MaintenanceRequestWithRelations[]> {
		return this.findAll(ownerId, { search: searchTerm })
	}

	/**
	 * Find maintenance requests by unit
	 */
	async findByUnit(
		unitId: string,
		ownerId: string,
		options: MaintenanceRequestQueryOptions = {}
	): Promise<MaintenanceRequestWithRelations[]> {
		return this.findAll(ownerId, { ...options, unitId })
	}
}