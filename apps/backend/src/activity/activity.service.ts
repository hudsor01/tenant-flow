import { ActivityEntityType } from './../../../../node_modules/.prisma/client/index.d';
import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import type { CreateActivityInput } from '@tenantflow/shared/types/activity'



// Extended input type that includes userId for internal use
export interface CreateActivityInputWithUser extends CreateActivityInput {
	userId: string
}

@Injectable()
export class ActivityService {
	constructor(private prisma: PrismaService) {}

	async create(input: CreateActivityInputWithUser) {
		const { userId, entityType, ...rest } = input
		return this.prisma.activity.create({ 
			data: {
				...rest,
				entityType: entityType as ActivityEntityType,
				User: {
					connect: { id: userId }
				}
			}
		})
	}

	async findByUser(userId: string, limit = 10): Promise<import('@prisma/client').Activity[]> {
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
