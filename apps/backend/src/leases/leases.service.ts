import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import type { LeaseStatus } from '@prisma/client'
import { LEASE_STATUS, type AppError } from '@tenantflow/shared'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'

const sanitizeEmailContent = (content: string): string => {
	if (!content) return ''
	return content
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/javascript:/gi, '')
		.replace(/on\w+\s*=/gi, '')
		.trim()
		.substring(0, 1000)
}

@Injectable()
export class LeasesService {
	private readonly logger = new Logger(LeasesService.name)

	constructor(
		private prisma: PrismaService,
		private errorHandler: ErrorHandlerService
	) {}

	private isEmailServiceConfigured(): boolean {
		const supabaseUrl = process.env.SUPABASE_URL
		const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
		
		return !!(
			supabaseUrl && 
			supabaseKey && 
			supabaseKey.length > 20 && 
			supabaseKey.startsWith('eyJ')
		)
	}

	async getLeasesByOwner(ownerId: string) {
		const leases = await this.prisma.lease.findMany({
			where: {
				Unit: {
					Property: {
						ownerId: ownerId
					}
				}
			},
			include: {
				Tenant: {
					include: {
						User: {
							select: {
								id: true,
								name: true,
								email: true,
								phone: true,
								avatarUrl: true
							}
						}
					}
				},
				Unit: {
					include: {
						Property: {
							select: {
								id: true,
								name: true,
								address: true,
								city: true,
								state: true
							}
						}
					}
				},
				Document: {
					orderBy: {
						createdAt: 'desc'
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		})

		return leases.map(lease => {
			const { Tenant, Unit, Document, ...baseLeaseData } = lease
			return {
				...baseLeaseData,
				tenant: Tenant,
				unit: {
					...Unit,
					property: Unit.Property,
					Property: undefined // Remove capitalized field
				},
				property: Unit.Property,
				documents: Document
			}
		})
	}

	async getLeaseById(id: string, ownerId: string) {
		const lease = await this.prisma.lease.findFirst({
			where: {
				id: id,
				Unit: {
					Property: {
						ownerId: ownerId
					}
				}
			},
			include: {
				Tenant: {
					include: {
						User: {
							select: {
								id: true,
								name: true,
								email: true,
								phone: true,
								avatarUrl: true
							}
						}
					}
				},
				Unit: {
					include: {
						Property: {
							select: {
								id: true,
								name: true,
								address: true,
								city: true,
								state: true,
								zipCode: true
							}
						}
					}
				},
				Document: {
					orderBy: {
						createdAt: 'desc'
					}
				}
			}
		})

		if (!lease) return null

		const { Tenant, Unit, Document, ...baseLeaseData } = lease
		return {
			...baseLeaseData,
			tenant: Tenant,
			unit: {
				...Unit,
				property: Unit.Property,
				Property: undefined // Remove capitalized field
			},
			property: Unit.Property,
			documents: Document
		}
	}

	async createLease(
		ownerId: string,
		leaseData: {
			unitId: string
			tenantId: string
			startDate: string
			endDate: string
			rentAmount: number
			securityDeposit: number
			status?: string
		}
	) {
		// Verify unit ownership
		const unit = await this.prisma.unit.findFirst({
			where: {
				id: leaseData.unitId,
				Property: {
					ownerId: ownerId
				}
			}
		})

		if (!unit) {
			throw this.errorHandler.createNotFoundError('Unit', leaseData.unitId)
		}

		const tenant = await this.prisma.tenant.findFirst({
			where: {
				id: leaseData.tenantId
			}
		})

		if (!tenant) {
			throw this.errorHandler.createNotFoundError('Tenant', leaseData.tenantId)
		}

		const overlappingLease = await this.prisma.lease.findFirst({
			where: {
				unitId: leaseData.unitId,
				status: {
					in: ['ACTIVE', 'DRAFT']
				},
				OR: [
					{
						AND: [
							{ startDate: { lte: new Date(leaseData.endDate) } },
							{ endDate: { gte: new Date(leaseData.startDate) } }
						]
					}
				]
			}
		})

		if (overlappingLease) {
			throw this.errorHandler.createBusinessError(
				ErrorCode.CONFLICT,
				'Unit has overlapping lease for the specified dates',
				{ operation: 'createLease', resource: 'lease', metadata: { unitId: leaseData.unitId } }
			)
		}

		return await this.prisma.lease.create({
			data: {
				unitId: leaseData.unitId,
				tenantId: leaseData.tenantId,
				startDate: new Date(leaseData.startDate),
				endDate: new Date(leaseData.endDate),
				rentAmount: leaseData.rentAmount,
				securityDeposit: leaseData.securityDeposit,
				status: (leaseData.status as LeaseStatus) || LEASE_STATUS.DRAFT
			},
			include: {
				Tenant: {
					include: {
						User: {
							select: {
								id: true,
								name: true,
								email: true
							}
						}
					}
				},
				Unit: {
					include: {
						Property: {
							select: {
								id: true,
								name: true,
								address: true
							}
						}
					}
				}
			}
		})
	}

	async updateLease(
		id: string,
		ownerId: string,
		leaseData: {
			startDate?: string
			endDate?: string
			rentAmount?: number
			securityDeposit?: number
			status?: string
		}
	) {
		// Verify lease ownership
		const existingLease = await this.prisma.lease.findFirst({
			where: {
				id: id,
				Unit: {
					Property: {
						ownerId: ownerId
					}
				}
			}
		})

		if (!existingLease) {
			throw this.errorHandler.createNotFoundError('Lease', id)
		}

		if (leaseData.startDate || leaseData.endDate) {
			const startDate = leaseData.startDate
				? new Date(leaseData.startDate)
				: existingLease.startDate
			const endDate = leaseData.endDate
				? new Date(leaseData.endDate)
				: existingLease.endDate

			const overlappingLease = await this.prisma.lease.findFirst({
				where: {
					unitId: existingLease.unitId,
					id: { not: id }, // Exclude current lease
					status: {
						in: ['ACTIVE', 'DRAFT']
					},
					OR: [
						{
							AND: [
								{ startDate: { lte: endDate } },
								{ endDate: { gte: startDate } }
							]
						}
					]
				}
			})

			if (overlappingLease) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.CONFLICT,
					'Unit has overlapping lease for the specified dates',
					{ operation: 'updateLease', resource: 'lease', metadata: { leaseId: id, unitId: existingLease.unitId } }
				)
			}
		}

		return await this.prisma.lease.update({
			where: {
				id: id
			},
			data: {
				...leaseData,
				startDate: leaseData.startDate
					? new Date(leaseData.startDate)
					: undefined,
				endDate: leaseData.endDate
					? new Date(leaseData.endDate)
					: undefined,
				status: leaseData.status
					? (leaseData.status as LeaseStatus)
					: undefined,
				updatedAt: new Date()
			},
			include: {
				Tenant: {
					include: {
						User: {
							select: {
								id: true,
								name: true,
								email: true
							}
						}
					}
				},
				Unit: {
					include: {
						Property: {
							select: {
								id: true,
								name: true,
								address: true
							}
						}
					}
				}
			}
		})
	}

	async deleteLease(id: string, ownerId: string) {
		const lease = await this.prisma.lease.findFirst({
			where: {
				id: id,
				Unit: {
					Property: {
						ownerId: ownerId
					}
				}
			},
			include: {
				Unit: true,
				Tenant: true
			}
		})

		if (!lease) {
			throw this.errorHandler.createNotFoundError('Lease', id)
		}

		if (lease.status === 'ACTIVE') {
			throw this.errorHandler.createBusinessError(
				ErrorCode.CONFLICT,
				'Cannot delete active lease',
				{ operation: 'deleteLease', resource: 'lease', metadata: { leaseId: id, status: lease.status } }
			)
		}


		return await this.prisma.lease.delete({
			where: {
				id: id
			}
		})
	}

	async getLeaseStats(ownerId: string) {
		const [totalLeases, activeLeases, pendingLeases, expiredLeases] =
			await Promise.all([
				this.prisma.lease.count({
					where: {
						Unit: {
							Property: {
								ownerId: ownerId
							}
						}
					}
				}),
				this.prisma.lease.count({
					where: {
						Unit: {
							Property: {
								ownerId: ownerId
							}
						},
						status: 'ACTIVE'
					}
				}),
				this.prisma.lease.count({
					where: {
						Unit: {
							Property: {
								ownerId: ownerId
							}
						},
						status: 'DRAFT'
					}
				}),
				this.prisma.lease.count({
					where: {
						Unit: {
							Property: {
								ownerId: ownerId
							}
						},
						status: 'EXPIRED'
					}
				})
			])

		const revenueStats = await this.prisma.lease.aggregate({
			where: {
				Unit: {
					Property: {
						ownerId: ownerId
					}
				},
				status: 'ACTIVE'
			},
			_sum: {
				rentAmount: true,
				securityDeposit: true
			},
			_avg: {
				rentAmount: true
			}
		})

		const expiringSoon = await this.prisma.lease.count({
			where: {
				Unit: {
					Property: {
						ownerId: ownerId
					}
				},
				status: 'ACTIVE',
				endDate: {
					lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
					gte: new Date() // Not already expired
				}
			}
		})

		return {
			totalLeases,
			activeLeases,
			pendingLeases,
			expiredLeases,
			expiringSoon,
			MONTHLYRentTotal: revenueStats._sum.rentAmount || 0,
			totalSecurityDeposits: revenueStats._sum.securityDeposit || 0,
			averageRent: revenueStats._avg.rentAmount || 0
		}
	}

	async getExpiringLeases(ownerId: string, days = 30) {
		const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

		const leases = await this.prisma.lease.findMany({
			where: {
				Unit: {
					Property: {
						ownerId: ownerId
					}
				},
				status: 'ACTIVE',
				endDate: {
					lte: futureDate,
					gte: new Date()
				}
			},
			include: {
				Tenant: {
					include: {
						User: {
							select: {
								id: true,
								name: true,
								email: true,
								phone: true
							}
						}
					}
				},
				Unit: {
					include: {
						Property: {
							select: {
								id: true,
								name: true,
								address: true
							}
						}
					}
				},
				Document: {
					orderBy: {
						createdAt: 'desc'
					}
				}
			},
			orderBy: {
				endDate: 'asc'
			}
		})

		return leases.map(lease => {
			const { Tenant, Unit, Document, ...baseLeaseData } = lease
			return {
				...baseLeaseData,
				tenant: Tenant,
				unit: {
					...Unit,
					property: Unit.Property,
					Property: undefined // Remove capitalized field
				},
				property: Unit.Property,
				documents: Document
			}
		})
	}

	async getRentReminders(ownerId: string) {
		const leases = await this.prisma.lease.findMany({
			where: {
				status: 'ACTIVE',
				Unit: {
					Property: {
						ownerId: ownerId
					}
				}
			},
			include: {
				Tenant: {
					include: {
						User: {
							select: {
								id: true,
								name: true,
								email: true
							}
						}
					}
				},
				Unit: {
					include: {
						Property: {
							select: {
								id: true,
								name: true,
								address: true
							}
						}
					}
				}
			}
		})

		const today = new Date()
		const reminders: {
			id: string
			leaseId: string
			tenantId: string
			propertyName: string
			tenantName: string
			tenantEmail: string
			rentAmount: number
			dueDate: string
			reminderType: 'upcoming' | 'due' | 'overdue'
			daysToDue: number
			status: 'pending' | 'sent' | 'paid'
			createdAt: string
		}[] = []

		const userPreferences = await this.prisma.userPreferences.findUnique({
			where: { userId: ownerId }
		})

		const settings = {
			enableReminders: userPreferences?.enableReminders ?? true,
			daysBeforeDue: userPreferences?.daysBeforeDue ?? 3,
			enableOverdueReminders: userPreferences?.enableOverdueReminders ?? true,
			overdueGracePeriod: userPreferences?.overdueGracePeriod ?? 5,
			autoSendReminders: userPreferences?.autoSendReminders ?? false
		}

		leases.forEach(lease => {
			const leaseStart = new Date(lease.startDate)
			const dayOfMonth = leaseStart.getDate()

			let currentDueDate = new Date(
				today.getFullYear(),
				today.getMonth(),
				dayOfMonth
			)

			if (currentDueDate < today) {
				currentDueDate = new Date(
					today.getFullYear(),
					today.getMonth() + 1,
					dayOfMonth
				)
			}

			const daysToDue = Math.ceil(
				(currentDueDate.getTime() - today.getTime()) /
					(1000 * 60 * 60 * 24)
			)

			let reminderType: 'upcoming' | 'due' | 'overdue'
			if (daysToDue < 0) {
				reminderType = 'overdue'
			} else if (daysToDue === 0) {
				reminderType = 'due'
			} else {
				reminderType = 'upcoming'
			}

			const shouldCreateReminder =
				(reminderType === 'upcoming' &&
					daysToDue <= settings.daysBeforeDue) ||
				reminderType === 'due' ||
				(reminderType === 'overdue' &&
					Math.abs(daysToDue) <= settings.overdueGracePeriod)

			if (shouldCreateReminder) {
				reminders.push({
					id: `${lease.id}-${currentDueDate.toISOString().split('T')[0]}`,
					leaseId: lease.id,
					tenantId: lease.tenantId,
					propertyName: lease.Unit.Property.name,
					tenantName: lease.Tenant.User?.name || 'Unknown Tenant',
					tenantEmail: lease.Tenant.User?.email || '',
					rentAmount: lease.rentAmount,
					dueDate: currentDueDate.toISOString(),
					reminderType,
					daysToDue,
					status: 'pending', // TODO: check reminder_log table to see if already sent (GitHub Issue #3)
					createdAt: new Date().toISOString()
				})
			}
		})

		const stats = {
			totalReminders: reminders.length,
			upcomingReminders: reminders.filter(
				r => r.reminderType === 'upcoming'
			).length,
			dueToday: reminders.filter(r => r.reminderType === 'due').length,
			overdue: reminders.filter(r => r.reminderType === 'overdue').length,
			totalRentAmount: reminders.reduce(
				(sum, r) => sum + r.rentAmount,
				0
			),
			overdueAmount: reminders
				.filter(r => r.reminderType === 'overdue')
				.reduce((sum, r) => sum + r.rentAmount, 0)
		}

		return {
			reminders: reminders.sort((a, b) => a.daysToDue - b.daysToDue),
			stats
		}
	}

	async sendRentReminder(reminderId: string, ownerId: string) {
		if (!reminderId || !ownerId) {
			throw this.errorHandler.createValidationError(
				'Invalid parameters: reminderId and ownerId are required',
				{ reminderId: 'Required', ownerId: 'Required' },
				{ operation: 'sendRentReminder', resource: 'lease' }
			)
		}
		
		if (typeof reminderId !== 'string' || typeof ownerId !== 'string') {
			throw this.errorHandler.createValidationError(
				'Invalid parameter types: reminderId and ownerId must be strings',
				{ reminderId: typeof reminderId, ownerId: typeof ownerId },
				{ operation: 'sendRentReminder', resource: 'lease' }
			)
		}

		const reminderResult = await this.getRentReminders(ownerId)
		const reminder = reminderResult.reminders.find(r => r.id === reminderId)

		if (!reminder) {
			throw this.errorHandler.createNotFoundError('Reminder', reminderId)
		}

		if (!this.isEmailServiceConfigured()) {
			return {
				...reminder,
				status: 'failed',
				error: 'Email service not configured'
			}
		}

		try {
			const supabaseUrl = process.env.SUPABASE_URL
			const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

			const response = await fetch(
				`${supabaseUrl}/functions/v1/send-email`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${supabaseKey}`,
						'User-Agent': 'TenantFlow-Backend/1.0'
					},
					body: JSON.stringify({
						to: reminder.tenantEmail,
						template: 'rent-reminder',
						data: {
							tenantName: sanitizeEmailContent(reminder.tenantName),
							propertyName: sanitizeEmailContent(reminder.propertyName),
							rentAmount: new Intl.NumberFormat('en-US', {
								style: 'currency',
								currency: 'USD'
							}).format(reminder.rentAmount),
							dueDate: new Date(
								reminder.dueDate
							).toLocaleDateString(),
							reminderType: reminder.reminderType
						}
					}),
					signal: controller.signal
				}
			)

			clearTimeout(timeoutId)

			if (!response.ok) {
				const errorText = await response
					.text()
					.catch(() => 'Unknown error')
				this.logger.error(`Email API error [${response.status}]`, { error: errorText })
				
				throw this.errorHandler.createBusinessError(
					ErrorCode.EMAIL_ERROR,
					'Failed to send email notification',
					{ operation: 'sendRentReminder', resource: 'lease', metadata: { reminderId, statusCode: response.status } }
				)
			}

			await response.json().catch(() => ({}))

			await this.prisma.reminderLog.create({
				data: {
					leaseId: reminder.leaseId,
					userId: ownerId,
					type: 'RENT_REMINDER',
					status: 'SENT',
					recipientEmail: reminder.tenantEmail,
					recipientName: sanitizeEmailContent(reminder.tenantName),
					subject: `Rent Reminder - ${sanitizeEmailContent(reminder.propertyName)}`,
					sentAt: new Date()
				}
			})

		} catch (error) {
			await this.prisma.reminderLog.create({
				data: {
					leaseId: reminder.leaseId,
					userId: ownerId,
					type: 'RENT_REMINDER',
					status: 'FAILED',
					recipientEmail: reminder.tenantEmail,
					recipientName: sanitizeEmailContent(reminder.tenantName),
					subject: `Rent Reminder - ${sanitizeEmailContent(reminder.propertyName)}`,
					errorMessage: 'Email delivery failed', // Don't log detailed error message
					retryCount: 0
				}
			})

			if ((error as Error).name === 'AbortError') {
				// Request was aborted, likely due to timeout
				this.logger.warn(`Email send aborted for reminder ${reminderId}`)
			} else {
				// Other error occurred
				this.logger.error(`Email send failed for reminder ${reminderId}`, error)
			}
			throw this.errorHandler.handleErrorEnhanced(error as Error | AppError, {
				operation: 'sendRentReminder',
				resource: 'lease',
				metadata: { reminderId }
			})
		}

		return {
			...reminder,
			status: 'sent',
			sentAt: new Date().toISOString()
		}
	}

	async sendBulkRentReminders(reminderIds: string[], ownerId: string) {
		if (!Array.isArray(reminderIds) || !ownerId) {
			throw this.errorHandler.createValidationError(
				'Invalid parameters: reminderIds must be an array and ownerId is required',
				{ reminderIds: 'Must be an array', ownerId: 'Required' },
				{ operation: 'sendBulkRentReminders', resource: 'lease' }
			)
		}
		
		if (reminderIds.length === 0) {
			throw this.errorHandler.createValidationError(
				'No reminder IDs provided',
				{ reminderIds: 'At least one reminder ID required' },
				{ operation: 'sendBulkRentReminders', resource: 'lease' }
			)
		}
		
		if (reminderIds.length > 50) {
			throw this.errorHandler.createValidationError(
				'Too many reminders requested (maximum 50)',
				{ reminderIds: `Received ${reminderIds.length} reminder IDs` },
				{ operation: 'sendBulkRentReminders', resource: 'lease' }
			)
		}
		
		if (typeof ownerId !== 'string') {
			throw this.errorHandler.createValidationError(
				'Invalid owner ID type',
				{ ownerId: typeof ownerId },
				{ operation: 'sendBulkRentReminders', resource: 'lease' }
			)
		}

		const reminderResult = await this.getRentReminders(ownerId)
		const targetReminders = reminderResult.reminders.filter(r =>
			reminderIds.includes(r.id)
		)

		interface ReminderEmailResult {
			id: string
			tenantEmail: string
			tenantName: string
			propertyName: string
			rentAmount: number
			dueDate: string
			reminderType: string
		}

		let results: PromiseSettledResult<ReminderEmailResult>[] = []

		if (!this.isEmailServiceConfigured()) {
			return {
				successful: 0,
				failed: targetReminders.length,
				total: targetReminders.length,
				results: targetReminders.map(reminder => ({
					id: reminder.id,
					status: 'failed',
					error: 'Email service not configured'
				}))
			}
		}

		try {
			const supabaseUrl = process.env.SUPABASE_URL
			const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

			results = await Promise.allSettled(
				targetReminders.map(async reminder => {
					const controller = new AbortController()
					const timeoutId = setTimeout(
						() => controller.abort(),
						15000
					)

					try {
						const response = await fetch(
							`${supabaseUrl}/functions/v1/send-email`,
							{
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
									Authorization: `Bearer ${supabaseKey}`,
									'User-Agent': 'TenantFlow-Backend/1.0'
								},
								body: JSON.stringify({
									to: reminder.tenantEmail,
									template: 'rent-reminder',
									data: {
										tenantName: sanitizeEmailContent(reminder.tenantName),
										propertyName: sanitizeEmailContent(reminder.propertyName),
										rentAmount: new Intl.NumberFormat(
											'en-US',
											{
												style: 'currency',
												currency: 'USD'
											}
										).format(reminder.rentAmount),
										dueDate: new Date(
											reminder.dueDate
										).toLocaleDateString(),
										reminderType: reminder.reminderType
									}
								}),
								signal: controller.signal
							}
						)

						clearTimeout(timeoutId)

						if (!response.ok) {
							const errorText = await response
								.text()
								.catch(() => 'Unknown error')
							this.logger.error(`Bulk email API error [${response.status}]`, { error: errorText })
							
							throw this.errorHandler.createBusinessError(
								ErrorCode.EMAIL_ERROR,
								'Failed to send email notification',
								{ operation: 'sendBulkRentReminders', resource: 'lease', metadata: { reminderId: reminder.id, statusCode: response.status } }
							)
						}

						await response.json().catch(() => ({}))
						return reminder
					} catch (error) {
						clearTimeout(timeoutId)
						throw error
					}
				})
			)

			const successfulReminders = results
				.map((result, index) => ({ result, reminder: targetReminders[index] }))
				.filter(({ result, reminder }) => result.status === 'fulfilled' && reminder)
				.map(({ reminder }) => reminder!)

			if (successfulReminders.length > 0) {
				await this.prisma.reminderLog.createMany({
					data: successfulReminders.map(reminder => ({
						leaseId: reminder.leaseId,
						userId: ownerId,
						type: 'RENT_REMINDER' as const,
						status: 'SENT' as const,
						recipientEmail: reminder.tenantEmail,
						recipientName: reminder.tenantName,
						subject: `Rent Reminder - ${reminder.propertyName}`,
						sentAt: new Date()
					}))
				})
			}

		} catch {
			return {
				successful: 0,
				failed: targetReminders.length,
				total: targetReminders.length,
				results: targetReminders.map(reminder => ({
					id: reminder.id,
					status: 'failed',
					error: 'Bulk email service failed'
				}))
			}
		}

		const finalResults = results.map(
			(
				result: PromiseSettledResult<ReminderEmailResult>,
				index: number
			) => {
				const reminder = targetReminders[index]
				return {
					id: reminder?.id || `unknown-${index}`,
					status: result.status === 'fulfilled' ? 'sent' : 'failed',
					sentAt:
						result.status === 'fulfilled'
							? new Date().toISOString()
							: undefined,
					error:
						result.status === 'rejected'
							? (result as PromiseRejectedResult).reason?.message ||
								'Unknown error'
							: undefined
				}
			}
		)

		const successful = finalResults.filter(
			(r: { status: string }) => r.status === 'sent'
		).length

		return {
			successful,
			failed: targetReminders.length - successful,
			total: targetReminders.length,
			results: finalResults
		}
	}
}
