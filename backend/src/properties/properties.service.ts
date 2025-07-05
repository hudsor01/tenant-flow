import { Injectable } from '@nestjs/common'
import type { PrismaService } from 'nestjs-prisma'
import type { Prisma } from '@prisma/client'
import { PropertyType } from '@prisma/client'

@Injectable()
export class PropertiesService {
	constructor(private prisma: PrismaService) {}

	async getPropertiesByOwner(
		ownerId: string,
		query?: {
			propertyType?: PropertyType
			search?: string
			limit?: string
			offset?: string
		}
	) {
		const where: Prisma.PropertyWhereInput = {
			ownerId: ownerId
		}

		// Add filtering conditions
		if (query?.propertyType) {
			where.propertyType = query.propertyType
		}

		if (query?.search) {
			where.OR = [
				{ name: { contains: query.search, mode: 'insensitive' } },
				{ address: { contains: query.search, mode: 'insensitive' } },
				{ city: { contains: query.search, mode: 'insensitive' } }
			]
		}

		const limit = query?.limit ? parseInt(query.limit) : undefined
		const offset = query?.offset ? parseInt(query.offset) : undefined

		return await this.prisma.property.findMany({
			where,
			include: {
				Unit: {
					select: {
						id: true,
						unitNumber: true,
						status: true,
						rent: true
					}
				},
				_count: {
					select: {
						Unit: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			},
			...(limit && { take: limit }),
			...(offset && { skip: offset })
		})
	}

	async getPropertyStats(ownerId: string) {
		// Get property count and unit count with aggregations
		const [propertyCount, unitCount] = await Promise.all([
			this.prisma.property.count({
				where: {
					ownerId: ownerId
				}
			}),
			this.prisma.unit.count({
				where: {
					Property: {
						ownerId: ownerId
					}
				}
			})
		])

		return {
			totalProperties: propertyCount,
			totalUnits: unitCount
		}
	}

	async getPropertyById(id: string, ownerId: string) {
		return await this.prisma.property.findFirst({
			where: {
				id: id,
				ownerId: ownerId
			},
			include: {
				Unit: {
					include: {
						Lease: {
							where: {
								status: 'ACTIVE'
							},
							include: {
								Tenant: true
							}
						},
						MaintenanceRequest: {
							where: {
								status: {
									not: 'COMPLETED'
								}
							},
							orderBy: {
								createdAt: 'desc'
							}
						}
					}
				},
				_count: {
					select: {
						Unit: true,
						Expense: true,
						Inspection: true
					}
				}
			}
		})
	}

	async createProperty(
		ownerId: string,
		propertyData: {
			name: string
			address: string
			city: string
			state: string
			zipCode: string
			description?: string
			propertyType?: PropertyType
		}
	) {
		return await this.prisma.property.create({
			data: {
				...propertyData,
				ownerId: ownerId,
				propertyType:
					propertyData.propertyType || PropertyType.SINGLE_FAMILY
			},
			include: {
				_count: {
					select: {
						Unit: true
					}
				}
			}
		})
	}

	async updateProperty(
		id: string,
		ownerId: string,
		propertyData: {
			name?: string
			address?: string
			city?: string
			state?: string
			zipCode?: string
			description?: string
			propertyType?: PropertyType
			imageUrl?: string
		}
	) {
		return await this.prisma.property.update({
			where: {
				id: id,
				ownerId: ownerId
			},
			data: {
				...propertyData,
				propertyType: propertyData.propertyType,
				updatedAt: new Date()
			},
			include: {
				_count: {
					select: {
						Unit: true
					}
				}
			}
		})
	}

	async deleteProperty(id: string, ownerId: string) {
		return await this.prisma.property.delete({
			where: {
				id: id,
				ownerId: ownerId
			}
		})
	}
}
