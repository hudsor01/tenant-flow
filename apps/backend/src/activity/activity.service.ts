import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'

export interface CreateActivityInput {
	userId: string
	action: string
	entityType: 'property' | 'tenant' | 'maintenance' | 'payment' | 'lease' | 'unit'
	entityId: string
	entityName?: string
}

@Injectable()
export class ActivityService {
	constructor(private prisma: PrismaService) {}

	async create(input: CreateActivityInput) {
		return this.prisma.activity.create({ data: input })
	}

	async findByUser(userId: string, limit = 10) {
		return this.prisma.activity.findMany({
			where: { userId },
			take: limit,
			orderBy: { createdAt: 'desc' }
		})
	}

	async delete(id: string) {
		return this.prisma.activity.delete({ where: { id } })
	}
}
