import { Injectable, Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import {
	MaintenanceRequestQueryOptions,
	MaintenanceRequestSupabaseRepository,
	MaintenanceRequestWithRelations
} from './maintenance-request-supabase.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { ValidationException } from '../common/exceptions/base.exception'
import {
	CreateMaintenanceRequestDto,
	UpdateMaintenanceRequestDto
} from './dto'
import { SupabaseService } from '../common/supabase/supabase.service'

type MaintenanceRequestInsert =
	Database['public']['Tables']['MaintenanceRequest']['Insert']
type MaintenanceRequestUpdate =
	Database['public']['Tables']['MaintenanceRequest']['Update']

// Types for notification
interface NotificationData {
	type: 'new_request' | 'status_update' | 'emergency_alert'
	maintenanceRequestId: string
	recipientEmail: string
	recipientName: string
	recipientRole: 'owner' | 'tenant' | 'manager'
	actionUrl?: string
}

/**
 * Maintenance service using Supabase
 * Handles maintenance request management with property ownership validation through units
 */
@Injectable()
export class MaintenanceService {
	private readonly logger = new Logger(MaintenanceService.name)

	constructor(
		private readonly repository: MaintenanceRequestSupabaseRepository,
		private readonly errorHandler: ErrorHandlerService,
		private readonly supabaseService: SupabaseService
	) {}

	/**
	 * Create a new maintenance request with validation
	 */
	async create(
		data: CreateMaintenanceRequestDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations> {
		try {
			// Validate required fields
			if (!data.unitId || !data.title || !data.description) {
				throw new ValidationException(
					'Unit ID, title, and description are required'
				)
			}

			const requestData: MaintenanceRequestInsert = {
				unitId: data.unitId,
				title: data.title,
				description: data.description,
				category: data.category || 'GENERAL',
				priority: (data.priority || 'MEDIUM') as MaintenanceRequestInsert['priority'],
				status: (data.status || 'OPEN') as MaintenanceRequestInsert['status'],
				contactPhone: data.contactPhone,
				requestedBy: data.requestedBy,
				allowEntry: data.allowEntry,
				photos: data.photos || [],
				notes: data.notes,
				preferredDate: data.preferredDate
					? new Date(data.preferredDate).toISOString()
					: undefined,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			const maintenanceRequest =
				await this.repository.createWithValidation(
					requestData,
					ownerId,
					userId,
					userToken
				)

			this.logger.log('Maintenance request created successfully', {
				requestId: maintenanceRequest.id,
				unitId: data.unitId,
				priority: data.priority,
				ownerId
			})

			return maintenanceRequest
		} catch (error) {
			this.logger.error('Failed to create maintenance request:', error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'create',
				resource: 'maintenance-request',
				metadata: { unitId: data.unitId, title: data.title, ownerId }
			})
		}
	}

	/**
	 * Find maintenance request by ID
	 */
	async findById(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations> {
		try {
			const request = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				true,
				userId,
				userToken
			)

			if (!request) {
				throw new Error('Maintenance request not found')
			}

			return request
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findById',
				resource: 'maintenance-request',
				metadata: { requestId: id, ownerId }
			})
		}
	}

	/**
	 * Get all maintenance requests for an owner
	 */
	async findByOwner(
		ownerId: string,
		options: MaintenanceRequestQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations[]> {
		try {
			if (
				!ownerId ||
				typeof ownerId !== 'string' ||
				ownerId.trim().length === 0
			) {
				throw new ValidationException('Owner ID is required', 'ownerId')
			}

			return await this.repository.findByOwnerWithDetails(
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findByOwner',
				resource: 'maintenance-request',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Alias for findByOwner to match controller expectations
	 */
	async getByOwner(
		ownerId: string,
		options: MaintenanceRequestQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations[]> {
		return this.findByOwner(ownerId, options, userId, userToken)
	}

	/**
	 * Alias for findByUnit to match controller expectations
	 */
	async getByUnit(
		unitId: string,
		ownerId: string,
		options: MaintenanceRequestQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations[]> {
		return this.findByUnit(unitId, ownerId, options, userId, userToken)
	}

	/**
	 * Update maintenance request
	 */
	async update(
		id: string,
		data: UpdateMaintenanceRequestDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations> {
		try {
			// Get existing request for validation
			const existing = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				true,
				userId,
				userToken
			)

			if (!existing) {
				throw new Error('Maintenance request not found')
			}

			const updateData: MaintenanceRequestUpdate = {
				updatedAt: new Date().toISOString()
			}

			// Copy over the fields that are defined
			if (data.title) {updateData.title = data.title}
			if (data.description) {updateData.description = data.description}
			if (data.category) {updateData.category = data.category}
			if (data.priority) {updateData.priority = data.priority as MaintenanceRequestUpdate['priority']}
			if (data.status) {updateData.status = data.status as MaintenanceRequestUpdate['status']}
			if (data.allowEntry !== undefined) {updateData.allowEntry = data.allowEntry}
			if (data.contactPhone) {updateData.contactPhone = data.contactPhone}
			if (data.actualCost !== undefined) {updateData.actualCost = data.actualCost}
			if (data.estimatedCost !== undefined) {updateData.estimatedCost = data.estimatedCost}
			if (data.assignedTo) {updateData.assignedTo = data.assignedTo}
			if (data.photos) {updateData.photos = data.photos}

			// Convert dates if provided
			if (data.preferredDate) {
				updateData.preferredDate = new Date(
					data.preferredDate
				).toISOString()
			}

			// Set completion date if status is completed
			if (
				data.status === 'COMPLETED' &&
				existing.status !== 'COMPLETED'
			) {
				updateData.completedAt = new Date().toISOString()
			}

			const updated = await this.repository.update(
				id,
				updateData,
				userId,
				userToken
			)

			this.logger.log('Maintenance request updated successfully', {
				requestId: id,
				ownerId
			})

			return updated
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'update',
				resource: 'maintenance-request',
				metadata: { requestId: id, ownerId }
			})
		}
	}

	/**
	 * Delete maintenance request
	 */
	async delete(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<void> {
		try {
			// Verify ownership first
			const existing = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				false,
				userId,
				userToken
			)

			if (!existing) {
				throw new Error('Maintenance request not found')
			}

			await this.repository.delete(id, userId, userToken)

			this.logger.log('Maintenance request deleted successfully', {
				requestId: id,
				ownerId
			})
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'delete',
				resource: 'maintenance-request',
				metadata: { requestId: id, ownerId }
			})
		}
	}

	/**
	 * Get maintenance request statistics for owner
	 */
	async getStats(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<{
		total: number
		open: number
		inProgress: number
		completed: number
		emergency: number
		high: number
		medium: number
		low: number
	}> {
		try {
			return await this.repository.getStatsByOwner(
				ownerId,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getStats',
				resource: 'maintenance-request',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Find maintenance requests by unit
	 */
	async findByUnit(
		unitId: string,
		ownerId: string,
		options: MaintenanceRequestQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations[]> {
		try {
			if (!unitId || !ownerId) {
				throw new ValidationException(
					'Unit ID and Owner ID are required'
				)
			}

			return await this.repository.findByUnit(
				unitId,
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findByUnit',
				resource: 'maintenance-request',
				metadata: { unitId, ownerId }
			})
		}
	}

	/**
	 * Search maintenance requests by text
	 */
	async search(
		ownerId: string,
		searchTerm: string,
		options: MaintenanceRequestQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations[]> {
		try {
			const searchOptions = {
				...options,
				search: searchTerm
			}

			return await this.repository.findByOwnerWithDetails(
				ownerId,
				searchOptions,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'search',
				resource: 'maintenance-request',
				metadata: { ownerId, searchTerm }
			})
		}
	}

	/**
	 * Find emergency maintenance requests
	 */
	async findEmergencyRequests(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations[]> {
		try {
			return await this.repository.findEmergencyRequests(
				ownerId,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findEmergencyRequests',
				resource: 'maintenance-request',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Find overdue maintenance requests
	 */
	async findOverdueRequests(
		ownerId: string,
		days = 7,
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations[]> {
		try {
			return await this.repository.findOverdueRequests(
				ownerId,
				days,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findOverdueRequests',
				resource: 'maintenance-request',
				metadata: { ownerId, days }
			})
		}
	}

	/**
	 * Update maintenance request status
	 */
	async updateStatus(
		id: string,
		status: string,
		ownerId: string,
		notes?: string,
		userId?: string,
		userToken?: string
	): Promise<MaintenanceRequestWithRelations> {
		try {
			// Validate status
			const validStatuses = [
				'OPEN',
				'IN_PROGRESS',
				'COMPLETED',
				'CANCELLED'
			]
			if (!validStatuses.includes(status)) {
				throw new ValidationException(`Invalid status: ${status}`)
			}

			return await this.repository.updateStatus(
				id,
				status,
				ownerId,
				notes,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'updateStatus',
				resource: 'maintenance-request',
				metadata: { requestId: id, status, ownerId }
			})
		}
	}

	/**
	 * Send notification for maintenance request
	 */
	async sendNotification(
		notificationData: NotificationData,
		userId: string
	): Promise<{
		emailId: string
		sentAt: string
		type: string
	}> {
		try {
			// Find the maintenance request with related data
			const maintenanceRequest = await this.repository.findByIdAndOwner(
				notificationData.maintenanceRequestId,
				userId, // Assuming userId is ownerId for this context
				true
			)

			if (!maintenanceRequest) {
				throw new Error(
					`Maintenance request not found: ${notificationData.maintenanceRequestId}`
				)
			}

			// Set default action URL if not provided
			const actionUrl =
				notificationData.actionUrl ||
				`https://app.tenantflow.com/maintenance/${notificationData.maintenanceRequestId}`

			// Prepare email data based on notification type
			let subject = ''
			let isEmergency = false

			const unitNumber = maintenanceRequest.Unit?.unitNumber || ''
			const propertyName = maintenanceRequest.Unit?.Property?.name || ''

			switch (notificationData.type) {
				case 'new_request':
					subject = `New Maintenance Request: ${maintenanceRequest.title} - Unit ${unitNumber}`
					break
				case 'emergency_alert':
					subject = `🚨 EMERGENCY: ${maintenanceRequest.title} - Unit ${unitNumber}, ${propertyName}`
					isEmergency = true
					break
				case 'status_update':
					subject = `Maintenance Update: ${maintenanceRequest.title} - ${maintenanceRequest.status}`
					break
			}

			const emailData = {
				to: notificationData.recipientEmail,
				subject,
				template: 'maintenance-notification',
				data: {
					recipientName: notificationData.recipientName,
					notificationType: notificationData.type,
					maintenanceRequest: {
						id: maintenanceRequest.id,
						title: maintenanceRequest.title,
						description: maintenanceRequest.description,
						priority: maintenanceRequest.priority,
						status: maintenanceRequest.status,
						createdAt: maintenanceRequest.createdAt
					},
					actionUrl,
					propertyName: propertyName || '',
					unitNumber: unitNumber || '',
					isEmergency
				}
			}

			// Send notification via Supabase Edge Function
			const supabaseClient = this.supabaseService.getAdminClient()
			const { data, error } = await supabaseClient.functions.invoke(
				'send-maintenance-notification',
				{ body: emailData }
			)

			if (error) {
				throw new Error(
					`Failed to send notification email: ${error.message}`
				)
			}

			this.logger.log(
				`Notification sent successfully for maintenance request: ${notificationData.maintenanceRequestId}`
			)

			return {
				emailId: data?.id || `email-${Date.now()}`,
				sentAt: new Date().toISOString(),
				type: notificationData.type
			}
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'sendNotification',
				resource: 'maintenance-request',
				metadata: {
					notificationType: notificationData.type,
					maintenanceRequestId: notificationData.maintenanceRequestId,
					recipientEmail: notificationData.recipientEmail,
					recipientRole: notificationData.recipientRole,
					userId
				}
			})
		}
	}

	/**
	 * Log notification for audit purposes
	 */
	async logNotification(
		logData: Record<string, unknown>,
		userId: string
	): Promise<{
		id: string
		type: unknown
		recipientEmail: unknown
		recipientName: unknown
		subject: unknown
		maintenanceRequestId: unknown
		notificationType: unknown
		sentAt: string
		status: unknown
	}> {
		try {
			// Generate a unique log ID
			const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

			const result = {
				id: logId,
				type: logData.type,
				recipientEmail: logData.recipientEmail,
				recipientName: logData.recipientName,
				subject: logData.subject,
				maintenanceRequestId: logData.maintenanceRequestId,
				notificationType: logData.notificationType,
				sentAt: new Date().toISOString(),
				status: logData.status
			}

			this.logger.log(
				`Notification logged: ${logId} for maintenance request: ${logData.maintenanceRequestId}`
			)

			return result
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'logNotification',
				resource: 'maintenance-request',
				metadata: {
					logType: String(logData.type || ''),
					maintenanceRequestId: String(
						logData.maintenanceRequestId || ''
					),
					userId
				}
			})
		}
	}
}