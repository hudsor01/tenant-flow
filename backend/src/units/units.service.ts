import { Injectable } from '@nestjs/common'
import type { PrismaService } from 'nestjs-prisma'
import { UnitStatus } from '@prisma/client'

@Injectable()
export class UnitsService {
	constructor(private prisma: PrismaService) {}

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
			throw new Error('Property not found or access denied')
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
						},
						Payment: {
							orderBy: {
								date: 'desc'
							},
							take: 10 // Last 10 payments
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
			throw new Error('Property not found or access denied')
		}

		return await this.prisma.unit.create({
			data: {
				unitNumber: unitData.unitNumber,
				propertyId: unitData.propertyId,
				bedrooms: unitData.bedrooms || 1,
				bathrooms: unitData.bathrooms || 1,
				squareFeet: unitData.squareFeet,
				rent: unitData.rent,
				status: (unitData.status as UnitStatus) || UnitStatus.VACANT
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
			throw new Error('Unit not found or access denied')
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
			throw new Error('Unit not found or access denied')
		}

		if (unit.Lease.length > 0) {
			throw new Error('Cannot delete unit with active leases')
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
}
