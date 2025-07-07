import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'

export interface Activity {
	id: string
	userId: string
	userName?: string
	action: string
	entityType:
		| 'property'
		| 'tenant'
		| 'maintenance'
		| 'payment'
		| 'lease'
		| 'unit'
	entityId: string
	entityName?: string
	metadata?: Record<string, unknown>
	createdAt: string
	priority?: 'low' | 'medium' | 'high'
}

export interface RealtimeActivity extends Activity {
	isNew?: boolean
	timestamp?: number
}

@Injectable()
export class ActivityService {
	constructor(private prisma: PrismaService) {}

	async getActivityFeed(userId: string, limit = 10): Promise<Activity[]> {
		const activities: Activity[] = []
		const batchLimit = Math.ceil(limit / 5)

		try {
			// Step 1: Get basic data from each table separately (no complex joins)
			const [
				propertiesResult,
				maintenanceResult,
				paymentsResult,
				leasesResult,
				tenantsResult
			] = await Promise.allSettled([
				// Properties - simple query
				this.prisma.property.findMany({
					where: { ownerId: userId },
					select: {
						id: true,
						name: true,
						createdAt: true,
						ownerId: true
					},
					orderBy: { createdAt: 'desc' },
					take: batchLimit
				}),

				// Maintenance requests - will be filtered by RLS or property ownership
				this.prisma.maintenanceRequest.findMany({
					select: {
						id: true,
						title: true,
						priority: true,
						status: true,
						createdAt: true,
						unitId: true
					},
					orderBy: { createdAt: 'desc' },
					take: batchLimit
				}),

				// Payments - will be filtered by RLS or lease ownership
				this.prisma.payment.findMany({
					select: {
						id: true,
						amount: true,
						type: true,
						status: true,
						createdAt: true,
						leaseId: true
					},
					orderBy: { createdAt: 'desc' },
					take: batchLimit
				}),

				// Leases - will be filtered by RLS or unit ownership
				this.prisma.lease.findMany({
					select: {
						id: true,
						status: true,
						startDate: true,
						endDate: true,
						createdAt: true,
						rentAmount: true,
						unitId: true,
						tenantId: true
					},
					orderBy: { createdAt: 'desc' },
					take: batchLimit
				}),

				// Tenants - using invitedBy filter
				this.prisma.tenant.findMany({
					where: { invitedBy: userId },
					select: {
						id: true,
						name: true,
						invitationStatus: true,
						invitedAt: true,
						acceptedAt: true,
						createdAt: true,
						invitedBy: true
					},
					orderBy: { createdAt: 'desc' },
					take: batchLimit
				})
			])

			// Process property activities
			if (propertiesResult.status === 'fulfilled') {
				propertiesResult.value.forEach(property => {
					activities.push({
						id: `property-${property.id}`,
						userId: property.ownerId,
						userName: '',
						action: 'Created property',
						entityType: 'property',
						entityId: property.id,
						entityName: property.name,
						createdAt: property.createdAt.toISOString(),
						priority: 'medium'
					})
				})
			}

			// Process maintenance request activities
			if (maintenanceResult.status === 'fulfilled') {
				// For now, include all maintenance requests (RLS will filter them)
				maintenanceResult.value.forEach(request => {
					const priorityMap: Record<
						string,
						'low' | 'medium' | 'high'
					> = {
						LOW: 'low',
						MEDIUM: 'medium',
						HIGH: 'high',
						EMERGENCY: 'high'
					}

					activities.push({
						id: `maintenance-${request.id}`,
						userId: userId,
						userName: '',
						action: `${request.status === 'COMPLETED' ? 'Completed' : 'Created'} maintenance request`,
						entityType: 'maintenance',
						entityId: request.id,
						entityName: request.title,
						metadata: {
							unitId: request.unitId,
							priority: request.priority,
							status: request.status
						},
						createdAt: request.createdAt.toISOString(),
						priority: priorityMap[request.priority] || 'medium'
					})
				})
			}

			// Process payment activities
			if (paymentsResult.status === 'fulfilled') {
				// For now, include all payments (RLS will filter them)
				paymentsResult.value.forEach(payment => {
					activities.push({
						id: `payment-${payment.id}`,
						userId: userId,
						userName: '',
						action: `${payment.status === 'COMPLETED' ? 'Received' : 'Recorded'} ${payment.type.toLowerCase()} payment`,
						entityType: 'payment',
						entityId: payment.id,
						entityName: `$${payment.amount}`,
						metadata: {
							amount: payment.amount,
							type: payment.type,
							status: payment.status,
							leaseId: payment.leaseId
						},
						createdAt: payment.createdAt.toISOString(),
						priority:
							payment.status === 'FAILED' ? 'high' : 'medium'
					})
				})
			}

			// Process lease activities
			if (leasesResult.status === 'fulfilled') {
				// For now, include all leases (RLS will filter them)
				leasesResult.value.forEach(lease => {
					const isNewLease =
						lease.createdAt.getTime() ===
						new Date(lease.startDate).getTime()

					activities.push({
						id: `lease-${lease.id}`,
						userId: userId,
						userName: '',
						action: isNewLease
							? 'Created lease agreement'
							: `Lease status: ${lease.status.toLowerCase()}`,
						entityType: 'lease',
						entityId: lease.id,
						entityName: `Lease - $${lease.rentAmount}/month`,
						metadata: {
							unitId: lease.unitId,
							tenantId: lease.tenantId,
							status: lease.status,
							startDate: lease.startDate,
							endDate: lease.endDate,
							rentAmount: lease.rentAmount
						},
						createdAt: lease.createdAt.toISOString(),
						priority: lease.status === 'EXPIRED' ? 'high' : 'medium'
					})
				})
			}

			// Process tenant activities
			if (tenantsResult.status === 'fulfilled') {
				tenantsResult.value.forEach(tenant => {
					if (tenant.acceptedAt) {
						activities.push({
							id: `tenant-accepted-${tenant.id}`,
							userId: userId,
							userName: '',
							action: 'Tenant accepted invitation',
							entityType: 'tenant',
							entityId: tenant.id,
							entityName: tenant.name,
							metadata: {
								invitationStatus: tenant.invitationStatus,
								acceptedAt: tenant.acceptedAt
							},
							createdAt: tenant.acceptedAt.toISOString(),
							priority: 'medium'
						})
					} else if (
						tenant.invitedAt &&
						tenant.invitationStatus === 'PENDING'
					) {
						activities.push({
							id: `tenant-invited-${tenant.id}`,
							userId: userId,
							userName: '',
							action: 'Sent tenant invitation',
							entityType: 'tenant',
							entityId: tenant.id,
							entityName: tenant.name,
							metadata: {
								invitationStatus: tenant.invitationStatus,
								invitedAt: tenant.invitedAt
							},
							createdAt: tenant.invitedAt
								? tenant.invitedAt.toISOString()
								: new Date().toISOString(),
							priority: 'low'
						})
					}
				})
			}
		} catch (error) {
			console.error('Error fetching activity feed:', error)
			return []
		}

		// Sort all activities by date (most recent first) and apply limit
		return activities
			.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() -
					new Date(a.createdAt).getTime()
			)
			.slice(0, limit)
	}

	async getRealtimeActivitySummary(
		userId: string,
		limit = 10
	): Promise<{
		data: Activity[]
		isConnected: boolean
		hasNewActivities: boolean
	}> {
		// For now, return the basic activity feed
		// Real-time functionality can be added later with WebSockets or Server-Sent Events
		const data = await this.getActivityFeed(userId, limit)

		return {
			data,
			isConnected: true,
			hasNewActivities: false
		}
	}
}
