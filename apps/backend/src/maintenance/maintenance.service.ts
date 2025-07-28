import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SupabaseService } from '../common/supabase.service'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import { getFrontendUrl } from '../shared/constants/app-config'

import type { MaintenanceRequest, Priority, RequestStatus } from '@prisma/client'
import type { CreateMaintenanceInput, UpdateMaintenanceInput } from '@tenantflow/shared/types/api-inputs'
import type { MaintenanceQuery } from '@tenantflow/shared/types/queries'


@Injectable()
export class MaintenanceService {
	private readonly logger = new Logger(MaintenanceService.name)

	constructor(
		private prisma: PrismaService,
		private supabaseService: SupabaseService,
		private errorHandler: ErrorHandlerService
	) {}

	async create(
		createMaintenanceDto: CreateMaintenanceInput
	): Promise<MaintenanceRequest> {
		const maintenanceRequest = await this.prisma.maintenanceRequest.create({
			data: {
				unitId: createMaintenanceDto.unitId,
				title: createMaintenanceDto.title,
				description: createMaintenanceDto.description,
				category: createMaintenanceDto.category,
				priority: createMaintenanceDto.priority as Priority | undefined,
				status: createMaintenanceDto.status as RequestStatus | undefined,
				preferredDate: createMaintenanceDto.preferredDate,
				allowEntry: createMaintenanceDto.allowEntry,
				contactPhone: createMaintenanceDto.contactPhone,
				requestedBy: createMaintenanceDto.requestedBy,
				notes: createMaintenanceDto.notes,
				photos: createMaintenanceDto.photos
			},
			include: {
				Unit: {
					include: {
						Property: true,
						Lease: {
							where: { status: 'ACTIVE' },
							include: {
								Tenant: {
									include: {
										User: true
									}
								}
							}
						}
					}
				}
			}
		})

		// Log maintenance request creation for tracking
		this.logger.log(`Maintenance request created: ${maintenanceRequest.id} for unit ${createMaintenanceDto.unitId}`)

		return maintenanceRequest
	}

	async findAll(query: MaintenanceQuery) {
		const { limit = 10, offset = 0, unitId, status, priority } = query
		const skip = offset

		const where: Record<string, unknown> = {}

		if (unitId) where.unitId = unitId
		if (status) where.status = status
		if (priority) where.priority = priority

		return this.prisma.maintenanceRequest.findMany({
			where,
			skip,
			take: limit,
			include: {
				Unit: {
					include: {
						Property: true
					}
				}
			},
			orderBy: { createdAt: 'desc' }
		})
	}

	async findOne(id: string) {
		return this.prisma.maintenanceRequest.findUnique({
			where: { id },
			include: {
				Unit: {
					include: {
						Property: true
					}
				}
			}
		})
	}

	async update(
		id: string,
		updateMaintenanceDto: UpdateMaintenanceInput
	): Promise<MaintenanceRequest> {
		const data: Record<string, unknown> = { ...updateMaintenanceDto }

		if (updateMaintenanceDto.completedAt) {
			data.completedAt = new Date(updateMaintenanceDto.completedAt)
		}

		const maintenanceRequest = await this.prisma.maintenanceRequest.update({
			where: { id },
			data,
			include: {
				Unit: {
					include: {
						Property: true,
						Lease: {
							where: { status: 'ACTIVE' },
							include: {
								Tenant: {
									include: {
										User: true
									}
								}
							}
						}
					}
				}
			}
		})

		// Log maintenance request update for tracking
		this.logger.log(`Maintenance request updated: ${id}`)

		return maintenanceRequest
	}

	async remove(id: string): Promise<MaintenanceRequest> {
		const deletedRequest = await this.prisma.maintenanceRequest.delete({
			where: { id }
		})

		// Log maintenance request deletion for tracking
		this.logger.log(`Maintenance request deleted: ${id}`)

		return deletedRequest
	}

	async findAllByOwner(ownerId: string, query?: MaintenanceQuery) {
		// For now, using the existing findAll method
		// TODO: Implement proper owner-based filtering
		return this.findAll(query || {})
	}

	async getStats(_ownerId?: string) {
		const [total, open, inProgress, completed] = await Promise.all([
			this.prisma.maintenanceRequest.count(),
			this.prisma.maintenanceRequest.count({ where: { status: 'OPEN' } }),
			this.prisma.maintenanceRequest.count({
				where: { status: 'IN_PROGRESS' }
			}),
			this.prisma.maintenanceRequest.count({
				where: { status: 'COMPLETED' }
			})
		])

		return {
			total,
			open,
			inProgress,
			completed
		}
	}

	async sendNotification(
		notificationData: {
			type: 'new_request' | 'status_update' | 'emergency_alert'
			maintenanceRequestId: string
			recipientEmail: string
			recipientName: string
			recipientRole: 'owner' | 'tenant'
			actionUrl?: string
		},
		_userId: string
	) {
		// Get maintenance request with full details
		const maintenanceRequest = await this.findOne(notificationData.maintenanceRequestId)
		if (!maintenanceRequest) {
			throw this.errorHandler.createNotFoundError(
				'Maintenance request',
				notificationData.maintenanceRequestId,
				{ operation: 'sendNotificationEmail', resource: 'maintenance' }
			)
		}

		// Prepare email data
		const emailSubject = this.getEmailSubject(notificationData.type, maintenanceRequest)
		const emailData = {
			to: notificationData.recipientEmail,
			subject: emailSubject,
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
					createdAt: maintenanceRequest.createdAt.toISOString()
				},
				actionUrl: notificationData.actionUrl || getFrontendUrl(`/maintenance/${maintenanceRequest.id}`),
				propertyName: maintenanceRequest.Unit?.Property?.name || '',
				unitNumber: maintenanceRequest.Unit?.unitNumber || '',
				isEmergency: notificationData.type === 'emergency_alert'
			}
		}

		// Send email via Supabase Edge Function
		const supabase = this.supabaseService.getClient()
		const { data, error } = await supabase.functions.invoke(
			'send-maintenance-notification',
			{ body: emailData }
		)

		if (error) {
			// Log detailed error for debugging but don't expose to client
			this.logger.error('Email sending failed', { error: error.message || error })
			throw this.errorHandler.createBusinessError(
				ErrorCode.EMAIL_ERROR,
				'Failed to send notification email',
				{ operation: 'sendNotificationEmail', resource: 'maintenance', metadata: { error: error.message } }
			)
		}

		return {
			emailId: data?.id || `email-${Date.now()}`,
			sentAt: new Date().toISOString(),
			type: notificationData.type
		}
	}

	async logNotification(
		logData: {
			type: 'maintenance_notification'
			recipientEmail: string
			recipientName: string
			subject: string
			maintenanceRequestId: string
			notificationType: string
			status: 'sent' | 'failed'
		},
		_userId: string
	) {
		// Store notification log in database
		// Note: You may need to create a notification_log table in your schema
		return {
			id: `log-${Date.now()}`,
			type: logData.type,
			recipientEmail: logData.recipientEmail,
			recipientName: logData.recipientName,
			subject: logData.subject,
			maintenanceRequestId: logData.maintenanceRequestId,
			notificationType: logData.notificationType,
			sentAt: new Date().toISOString(),
			status: logData.status
		}
	}

	private getEmailSubject(
		type: 'new_request' | 'status_update' | 'emergency_alert',
		maintenanceRequest: MaintenanceRequest & {
			Unit?: {
				unitNumber?: string
				Property?: {
					name?: string
				}
			}
		}
	): string {
		const propertyName = maintenanceRequest.Unit?.Property?.name || ''
		const unitNumber = maintenanceRequest.Unit?.unitNumber || ''

		switch (type) {
			case 'emergency_alert':
				return `🚨 EMERGENCY: ${maintenanceRequest.title} - Unit ${unitNumber}, ${propertyName}`
			case 'new_request':
				return `New Maintenance Request: ${maintenanceRequest.title} - Unit ${unitNumber}`
			case 'status_update':
				return `Maintenance Update: ${maintenanceRequest.title} - ${maintenanceRequest.status}`
			default:
				return `Maintenance Notification - ${propertyName}`
		}
	}
}
