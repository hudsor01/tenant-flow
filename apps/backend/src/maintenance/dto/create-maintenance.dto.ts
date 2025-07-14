import type { Priority, RequestStatus } from '@prisma/client'

export class CreateMaintenanceDto {
	unitId!: string
	title!: string
	description!: string
	priority?: Priority
	status?: RequestStatus
}

export class UpdateMaintenanceDto {
title?: string
	description?: string
	priority?: Priority
	status?: RequestStatus
	assignedTo?: string
	estimatedCost?: number
	actualCost?: number
	completedAt?: string
}

export interface MaintenanceQuery {
	page?: number
	limit?: number
	unitId?: string
	status?: RequestStatus
	priority?: Priority
}
