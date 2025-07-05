import { Injectable } from '@nestjs/common'
import type { PrismaService } from 'nestjs-prisma'
import type {
	CreateMaintenanceDto,
	UpdateMaintenanceDto,
	MaintenanceQuery
} from './dto/create-maintenance.dto'
import type { MaintenanceRequest } from '@prisma/client'

@Injectable()
export class MaintenanceService {
	constructor(private prisma: PrismaService) {}

	async create(
		createMaintenanceDto: CreateMaintenanceDto
	): Promise<MaintenanceRequest> {
		return this.prisma.maintenanceRequest.create({
			data: createMaintenanceDto
		})
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

		return this.prisma.maintenanceRequest.update({
			where: { id },
			data
		})
	}

	async remove(id: string): Promise<MaintenanceRequest> {
		return this.prisma.maintenanceRequest.delete({
			where: { id }
		})
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
}
