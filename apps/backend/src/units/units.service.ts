import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import type { UnitStatus } from '@prisma/client'

import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import { UNIT_STATUS } from '@tenantflow/shared/constants/properties'


@Injectable()
export class UnitsService {
	constructor(
		private prisma: PrismaService,
		private errorHandler: ErrorHandlerService
	) {}

	async getUnitsByOwner(ownerId: string) {
		return await this.prisma.unit.findMany({
			where: {
				Property: {
					ownerId: ownerId
				}
			},
			include: {
				Property: {
					select: {
						id: true,
						name: true,
						address: true,
						city: true,
						state: true
					}
				},
				Lease: {
					where: {
						status: 'ACTIVE'
					},
					include: {
						Tenant: {
							select: {
								id: true,
								name: true,
								email: true
							}
						}
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
					},
					take: 5 // Latest 5 open maintenance requests
				},
				_count: {
					select: {
						Lease: true,
						MaintenanceRequest: true
					}
				}
			},
			orderBy: [
				{
					Property: {
						name: 'asc'
					}
				},
				{
					unitNumber: 'asc'
				}
			]
		})
	}

	async getUnitsByProperty(propertyId: string, ownerId: string) {
		// Verify property ownership first
		const property = await this.prisma.property.findFirst({
			where: {
				id: propertyId,
				ownerId: ownerId
			}
		})

		if (!property) {
			throw this.errorHandler.createPermissionError(
				'access property',
				'property',
				{ operation: 'getUnitsByProperty', metadata: { propertyId, ownerId } }
			)
		}

		return await this.prisma.unit.findMany({
			where: {
				propertyId: propertyId
			},
			include: {
				Lease: {
					where: {
						status: 'ACTIVE'
					},
					include: {
						Tenant: {
							select: {
								id: true,
								name: true,
								email: true
							}
						}
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
				},
				_count: {
					select: {
						Lease: true,
						MaintenanceRequest: true
					}
				}
			},
			orderBy: {
				unitNumber: 'asc'
			}
		})
	}

	async getUnitById(id: string, ownerId: string) {
		return await this.prisma.unit.findFirst({
			where: {
				id: id,
				Property: {
					ownerId: ownerId
				}
			},
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
				},
				Lease: {
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
						}
					},
					orderBy: {
						createdAt: 'desc'
					}
				},
				MaintenanceRequest: {
					orderBy: {
						createdAt: 'desc'
					},
					include: {
						Expense: true
					}
				},
				Inspection: {
					orderBy: {
						scheduledDate: 'desc'
					},
					take: 5 // Last 5 inspections
				}
			}
		})
	}

	async createUnit(
		ownerId: string,
		unitData: {
			unitNumber: string
			propertyId: string
			bedrooms?: number
			bathrooms?: number
			squareFeet?: number
			rent: number
			status?: string
		}
	) {
		// Verify property ownership
		const property = await this.prisma.property.findFirst({
			where: {
				id: unitData.propertyId,
				ownerId: ownerId
			}
		})

		if (!property) {
			throw this.errorHandler.createPermissionError(
				'create unit in property',
				'property',
				{ operation: 'createUnit', metadata: { propertyId: unitData.propertyId, ownerId } }
			)
		}

		return await this.prisma.unit.create({
			data: {
				unitNumber: unitData.unitNumber,
				propertyId: unitData.propertyId,
				bedrooms: unitData.bedrooms || 1,
				bathrooms: unitData.bathrooms || 1,
				squareFeet: unitData.squareFeet,
				rent: unitData.rent,
				status: (unitData.status as UnitStatus) || UNIT_STATUS.VACANT
			},
			include: {
				Property: {
					select: {
						id: true,
						name: true,
						address: true
					}
				},
				_count: {
					select: {
						Lease: true,
						MaintenanceRequest: true
					}
				}
			}
		})
	}

	async updateUnit(
		id: string,
		ownerId: string,
		unitData: {
			unitNumber?: string
			bedrooms?: number
			bathrooms?: number
			squareFeet?: number
			rent?: number
			status?: string
			lastInspectionDate?: Date
		}
	) {
		// Verify unit ownership through property
		const existingUnit = await this.prisma.unit.findFirst({
			where: {
				id: id,
				Property: {
					ownerId: ownerId
				}
			}
		})

		if (!existingUnit) {
			throw this.errorHandler.createPermissionError(
				'update unit',
				'unit',
				{ operation: 'updateUnit', metadata: { unitId: id, ownerId } }
			)
		}

		return await this.prisma.unit.update({
			where: {
				id: id
			},
			data: {
				...unitData,
				status: unitData.status
					? (unitData.status as UnitStatus)
					: undefined,
				updatedAt: new Date()
			},
			include: {
				Property: {
					select: {
						id: true,
						name: true,
						address: true
					}
				},
				_count: {
					select: {
						Lease: true,
						MaintenanceRequest: true
					}
				}
			}
		})
	}

	async deleteUnit(id: string, ownerId: string) {
		// Verify unit ownership and check for active leases
		const unit = await this.prisma.unit.findFirst({
			where: {
				id: id,
				Property: {
					ownerId: ownerId
				}
			},
			include: {
				Lease: {
					where: {
						status: 'ACTIVE'
					}
				}
			}
		})

		if (!unit) {
			throw this.errorHandler.createPermissionError(
				'delete unit',
				'unit',
				{ operation: 'deleteUnit', metadata: { unitId: id, ownerId } }
			)
		}

		if (unit.Lease.length > 0) {
			throw this.errorHandler.createBusinessError(
				ErrorCode.CONFLICT,
				'Cannot delete unit with active leases',
				{ operation: 'deleteUnit', resource: 'unit', metadata: { unitId: id, activeLeases: unit.Lease.length } }
			)
		}

		return await this.prisma.unit.delete({
			where: {
				id: id
			}
		})
	}

	async getUnitStats(ownerId: string) {
		const [totalUnits, occupiedUnits, vacantUnits, maintenanceUnits] =
			await Promise.all([
				// Total units
				this.prisma.unit.count({
					where: {
						Property: {
							ownerId: ownerId
						}
					}
				}),
				// Occupied units (with active leases)
				this.prisma.unit.count({
					where: {
						Property: {
							ownerId: ownerId
						},
						Lease: {
							some: {
								status: 'ACTIVE'
							}
						}
					}
				}),
				// Vacant units
				this.prisma.unit.count({
					where: {
						Property: {
							ownerId: ownerId
						},
						status: 'VACANT'
					}
				}),
				// Units under maintenance
				this.prisma.unit.count({
					where: {
						Property: {
							ownerId: ownerId
						},
						status: 'MAINTENANCE'
					}
				})
			])

		// Calculate average rent
		const rentStats = await this.prisma.unit.aggregate({
			where: {
				Property: {
					ownerId: ownerId
				}
			},
			_avg: {
				rent: true
			},
			_sum: {
				rent: true
			}
		})

		return {
			totalUnits,
			occupiedUnits,
			vacantUnits,
			maintenanceUnits,
			averageRent: rentStats._avg.rent || 0,
			totalRentPotential: rentStats._sum.rent || 0,
			occupancyRate:
				totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
		}
	}

	// Alias methods to match route expectations
	async findAllByOwner(ownerId: string, _query?: Record<string, unknown>) {
		return this.getUnitsByOwner(ownerId)
	}

	async findById(id: string, ownerId: string) {
		return this.getUnitById(id, ownerId)
	}

	async create(ownerId: string, data: {
		unitNumber: string
		propertyId: string
		bedrooms?: number
		bathrooms?: number
		squareFeet?: number
		rent: number
		status?: string
	}) {
		return this.createUnit(ownerId, data)
	}

	async update(id: string, ownerId: string, data: {
		unitNumber?: string
		bedrooms?: number
		bathrooms?: number
		squareFeet?: number
		rent?: number
		status?: string
		lastInspectionDate?: Date
	}) {
		return this.updateUnit(id, ownerId, data)
	}

	async delete(id: string, ownerId: string) {
		return this.deleteUnit(id, ownerId)
	}

	async getStats(ownerId: string) {
		return this.getUnitStats(ownerId)
	}
}
