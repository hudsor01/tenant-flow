import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { SupabaseService } from '../stripe/services/supabase.service'
import type {
	CreateMaintenanceDto,
	UpdateMaintenanceDto,
	MaintenanceQuery
} from './dto/create-maintenance.dto'
import type { MaintenanceRequest } from '@prisma/client'

@Injectable()
export class MaintenanceService {
	private readonly logger = new Logger(MaintenanceService.name)

	constructor(
		private prisma: PrismaService,
		private supabaseService: SupabaseService
	) {}

	async create(
		createMaintenanceDto: CreateMaintenanceDto
	): Promise<MaintenanceRequest> {
		const maintenanceRequest = await this.prisma.maintenanceRequest.create({
			data: {
				unitId: createMaintenanceDto.unitId,
				title: createMaintenanceDto.title,
				description: createMaintenanceDto.description,
				category: createMaintenanceDto.category,
				priority: createMaintenanceDto.priority,
				status: createMaintenanceDto.status,
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
		const { page = 1, limit = 10, unitId, status, priority } = query
		const skip = (page - 1) * limit

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
		updateMaintenanceDto: UpdateMaintenanceDto
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

	async getStats() {
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
			throw new Error('Maintenance request not found')
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
				actionUrl: notificationData.actionUrl || `${process.env.FRONTEND_URL}/maintenance/${maintenanceRequest.id}`,
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
			throw new Error(`Failed to send email: ${error.message}`)
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
