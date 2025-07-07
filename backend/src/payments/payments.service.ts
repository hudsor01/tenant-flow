import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import type {
	CreatePaymentDto,
	UpdatePaymentDto,
	PaymentQuery
} from './dto/create-payment.dto'
import type { Payment } from '@prisma/client'

@Injectable()
export class PaymentsService {
	constructor(private prisma: PrismaService) {}

	async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
		return this.prisma.payment.create({
			data: {
				...createPaymentDto,
				date: new Date(createPaymentDto.date)
			}
		})
	}

	async findAll(query: PaymentQuery) {
		const {
			page = 1,
			limit = 10,
			leaseId,
			status,
			startDate,
			endDate
		} = query
		const skip = (page - 1) * limit

		const where: Record<string, unknown> = {}

		if (leaseId) where.leaseId = leaseId
		if (status) where.status = status
		if (startDate && endDate) {
			where.date = {
				gte: new Date(startDate),
				lte: new Date(endDate)
			}
		}

		return this.prisma.payment.findMany({
			where,
			skip,
			take: limit,
			include: {
				Lease: {
					include: {
						Unit: {
							include: {
								Property: true
							}
						},
						Tenant: true
					}
				}
			},
			orderBy: { date: 'desc' }
		})
	}

	async findOne(id: string) {
		return this.prisma.payment.findUnique({
			where: { id },
			include: {
				Lease: {
					include: {
						Unit: {
							include: {
								Property: true
							}
						},
						Tenant: true
					}
				}
			}
		})
	}

	async update(
		id: string,
		updatePaymentDto: UpdatePaymentDto
	): Promise<Payment> {
		const data: Record<string, unknown> = { ...updatePaymentDto }
		if (updatePaymentDto.date) {
			data.date = new Date(updatePaymentDto.date)
		}

		return this.prisma.payment.update({
			where: { id },
			data
		})
	}

	async remove(id: string): Promise<Payment> {
		return this.prisma.payment.delete({
			where: { id }
		})
	}

	async getStats() {
		const [totalPayments, totalAmount, pendingAmount, overdueAmount] =
			await Promise.all([
				this.prisma.payment.count(),
				this.prisma.payment.aggregate({
					_sum: { amount: true },
					where: { status: 'COMPLETED' }
				}),
				this.prisma.payment.aggregate({
					_sum: { amount: true },
					where: { status: 'PENDING' }
				}),
				this.prisma.payment.aggregate({
					_sum: { amount: true },
					where: {
						status: 'PENDING',
						dueDate: { lt: new Date() }
					}
				})
			])

		const collectionRate =
			totalAmount._sum.amount && pendingAmount._sum.amount
				? (totalAmount._sum.amount /
						(totalAmount._sum.amount + pendingAmount._sum.amount)) *
					100
				: 100

		return {
			totalPayments,
			totalAmount: totalAmount._sum.amount || 0,
			pendingAmount: pendingAmount._sum.amount || 0,
			overdueAmount: overdueAmount._sum.amount || 0,
			collectionRate
		}
	}
}
