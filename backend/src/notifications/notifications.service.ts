import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import type {
	CreateNotificationDto,
	UpdateNotificationDto,
	NotificationQuery
} from './dto/create-notification.dto'
import type { Notification } from '@prisma/client'

@Injectable()
export class NotificationsService {
	constructor(private prisma: PrismaService) {}

	async create(
		createNotificationDto: CreateNotificationDto
	): Promise<Notification> {
		const { data, ...notificationData } = createNotificationDto
		return this.prisma.notification.create({
			data: {
				...notificationData,
				data: data ? JSON.stringify(data) : null
			}
		})
	}

	async findAll(query: NotificationQuery) {
		const { page = 1, limit = 10, read, type } = query
		const skip = (page - 1) * limit

		const where: Record<string, unknown> = {}

		if (read !== undefined) where.read = read
		if (type) where.type = type

		return this.prisma.notification.findMany({
			where,
			skip,
			take: limit,
			include: {
				Property: true
			},
			orderBy: { createdAt: 'desc' }
		})
	}

	async findOne(id: string) {
		return this.prisma.notification.findUnique({
			where: { id },
			include: {
				Property: true
			}
		})
	}

	async update(
		id: string,
		updateNotificationDto: UpdateNotificationDto
	): Promise<Notification> {
		return this.prisma.notification.update({
			where: { id },
			data: updateNotificationDto
		})
	}

	async markAsRead(id: string): Promise<Notification> {
		return this.prisma.notification.update({
			where: { id },
			data: { read: true }
		})
	}

	async remove(id: string): Promise<Notification> {
		return this.prisma.notification.delete({
			where: { id }
		})
	}

	async getStats() {
		const [total, unread] = await Promise.all([
			this.prisma.notification.count(),
			this.prisma.notification.count({ where: { read: false } })
		])

		return {
			total,
			unread
		}
	}
}
