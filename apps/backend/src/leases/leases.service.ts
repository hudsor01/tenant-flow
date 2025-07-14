import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { LeaseStatus } from '@prisma/client'

@Injectable()
export class LeasesService {
	constructor(private prisma: PrismaService) {}

	async getLeasesByOwner(ownerId: string) {
		return await this.prisma.lease.findMany({
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
				Payment: {
					orderBy: {
						date: 'desc'
					},
					take: 3 // Last 3 payments for summary
				},
				_count: {
					select: {
						Payment: true,
						Document: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		})
	}

	async getLeaseById(id: string, ownerId: string) {
		return await this.prisma.lease.findFirst({
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
				Payment: {
					orderBy: {
						date: 'desc'
					}
				},
				Document: {
					orderBy: {
						createdAt: 'desc'
					}
				}
			}
		})
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
			throw new Error('Unit not found or access denied')
		}

		// Verify tenant belongs to owner (either invited by owner or has lease in owner's property)
		const tenant = await this.prisma.tenant.findFirst({
			where: {
				id: leaseData.tenantId,
				OR: [
					{
						invitedBy: ownerId
					},
					{
						Lease: {
							some: {
								Unit: {
									Property: {
										ownerId: ownerId
									}
								}
							}
						}
					}
				]
			}
		})

		if (!tenant) {
			throw new Error('Tenant not found or access denied')
		}

		// Check for overlapping active leases on the same unit
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
			throw new Error(
				'Unit has overlapping lease for the specified dates'
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
				status: (leaseData.status as LeaseStatus) || LeaseStatus.DRAFT
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
			throw new Error('Lease not found or access denied')
		}

		// If updating dates, check for overlapping leases
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
				throw new Error(
					'Unit has overlapping lease for the specified dates'
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
		// Verify lease ownership
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
				Payment: true
			}
		})

		if (!lease) {
			throw new Error('Lease not found or access denied')
		}

		if (lease.status === 'ACTIVE') {
			throw new Error('Cannot delete active lease')
		}

		if (lease.Payment.length > 0) {
			throw new Error('Cannot delete lease with payment history')
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
				// Total leases
				this.prisma.lease.count({
					where: {
						Unit: {
							Property: {
								ownerId: ownerId
							}
						}
					}
				}),
				// Active leases
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
				// Pending leases
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
				// Expired leases
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

		// Calculate lease revenue
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

		// Get leases expiring soon (within 30 days)
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
			monthlyRentTotal: revenueStats._sum.rentAmount || 0,
			totalSecurityDeposits: revenueStats._sum.securityDeposit || 0,
			averageRent: revenueStats._avg.rentAmount || 0
		}
	}

	async getExpiringLeases(ownerId: string, days = 30) {
		const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

		return await this.prisma.lease.findMany({
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
				}
			},
			orderBy: {
				endDate: 'asc'
			}
		})
	}

	async getRentReminders(ownerId: string) {
		// Get all active leases with tenant and property information
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

		// Default settings - in production this would be retrieved from user preferences table
		const settings = {
			enableReminders: true,
			daysBeforeDue: 3,
			enableOverdueReminders: true,
			overdueGracePeriod: 5,
			autoSendReminders: false
		}

		leases.forEach(lease => {
			// Calculate next rent due date (assuming monthly rent on the same day each month)
			const leaseStart = new Date(lease.startDate)
			const dayOfMonth = leaseStart.getDate()

			// Get current month's due date
			let currentDueDate = new Date(
				today.getFullYear(),
				today.getMonth(),
				dayOfMonth
			)

			// If this month's due date has passed, calculate next month
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

			// Only create reminders for upcoming (within threshold) or overdue rents
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
					status: 'pending', // In production, check reminder_log table to see if already sent
					createdAt: new Date().toISOString()
				})
			}
		})

		// Calculate statistics
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
		// Get reminder details first
		const reminderResult = await this.getRentReminders(ownerId)
		const reminder = reminderResult.reminders.find(r => r.id === reminderId)

		if (!reminder) {
			throw new Error('Reminder not found')
		}

		try {
			// Send email via Supabase Edge Function
			const supabaseUrl = process.env.SUPABASE_URL
			const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
			
			if (!supabaseUrl || !supabaseKey) {
				console.warn('Email service not configured - skipping rent reminder')
				return {
					...reminder,
					status: 'failed',
					error: 'Email service not configured'
				}
			}

			// Enhanced fetch with timeout and better error handling
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

			const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${supabaseKey}`,
					'User-Agent': 'TenantFlow-Backend/1.0'
				},
				body: JSON.stringify({
					to: reminder.tenantEmail,
					template: 'rent-reminder',
					data: {
						tenantName: reminder.tenantName,
						propertyName: reminder.propertyName,
						rentAmount: new Intl.NumberFormat('en-US', {
							style: 'currency',
							currency: 'USD'
						}).format(reminder.rentAmount),
						dueDate: new Date(reminder.dueDate).toLocaleDateString(),
						reminderType: reminder.reminderType
					}
				}),
				signal: controller.signal
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				const errorText = await response.text().catch(() => 'Unknown error')
				throw new Error(`Email API returned ${response.status}: ${errorText}`)
			}

			const result = await response.json().catch(() => ({}))

			// Log to reminder_log table (commented out until table is created)
			// await this.prisma.reminderLog.create({
			//   data: {
			//     leaseId: reminder.leaseId,
			//     type: 'RENT_REMINDER',
			//     sentAt: new Date(),
			//     status: 'SENT'
			//   }
			// })

			console.log('Rent reminder sent successfully to:', reminder.tenantEmail, result)
		} catch (error) {
			if (error.name === 'AbortError') {
				console.error('Rent reminder timeout for:', reminder.tenantEmail)
			} else {
				console.error('Failed to send rent reminder:', error)
			}
			throw new Error('Failed to send rent reminder')
		}

		return {
			...reminder,
			status: 'sent',
			sentAt: new Date().toISOString()
		}
	}

async sendBulkRentReminders(reminderIds: string[], ownerId: string) {
const reminderResult = await this.getRentReminders(ownerId)
const targetReminders = reminderResult.reminders.filter(r =>
reminderIds.includes(r.id)
)

// Declare results outside try-catch to ensure proper scope
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

try {
// Send bulk emails via Supabase Edge Function
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
console.warn('Email service not configured - skipping bulk rent reminders')
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

results = await Promise.allSettled(
targetReminders.map(async reminder => {
// Enhanced fetch with timeout and better error handling for bulk operations
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout for bulk

try {
const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${supabaseKey}`,
'User-Agent': 'TenantFlow-Backend/1.0'
},
body: JSON.stringify({
to: reminder.tenantEmail,
template: 'rent-reminder',
data: {
tenantName: reminder.tenantName,
propertyName: reminder.propertyName,
rentAmount: new Intl.NumberFormat('en-US', {
style: 'currency',
currency: 'USD'
}).format(reminder.rentAmount),
dueDate: new Date(reminder.dueDate).toLocaleDateString(),
reminderType: reminder.reminderType
}
}),
signal: controller.signal
})

clearTimeout(timeoutId)

if (!response.ok) {
const errorText = await response.text().catch(() => 'Unknown error')
throw new Error(`Email API returned ${response.status}: ${errorText}`)
}

const result = await response.json().catch(() => ({}))
return reminder
} catch (error) {
clearTimeout(timeoutId)
throw error
}
})
)

// Log successful sends to reminder_log table (commented out until table is created)
const successfulReminders = results
.filter((result, _index) => result.status === 'fulfilled')
.map((_result, index) => targetReminders[index])

// if (successfulReminders.length > 0) {
//   await this.prisma.reminderLog.createMany({
//     data: successfulReminders.map(reminder => ({
//       leaseId: reminder.leaseId,
//       type: 'RENT_REMINDER',
//       sentAt: new Date(),
//       status: 'SENT'
//     }))
//   })
// }

console.log(`Bulk rent reminders sent: ${successfulReminders.length}/${targetReminders.length}`)
} catch (error) {
console.error('Failed to send bulk rent reminders:', error)
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

const finalResults = results.map((result: PromiseSettledResult<ReminderEmailResult>, index: number) => ({
id: targetReminders[index]?.id || `unknown-${index}`,
status: result.status === 'fulfilled' ? 'sent' : 'failed',
sentAt: result.status === 'fulfilled' ? new Date().toISOString() : undefined,
error: result.status === 'rejected' ? (result as PromiseRejectedResult).reason?.message || 'Unknown error' : undefined
}))

const successful = finalResults.filter((r: { status: string }) => r.status === 'sent').length

return {
successful,
failed: targetReminders.length - successful,
total: targetReminders.length,
results: finalResults
}
}
}
