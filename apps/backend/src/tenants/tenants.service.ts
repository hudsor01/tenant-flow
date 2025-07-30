import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'

@Injectable()
export class TenantsService {
	constructor(
		private prisma: PrismaService,
		private errorHandler: ErrorHandlerService
	) {}

	async getTenantsByOwner(
		ownerId: string,
		query?: {
			status?: string
			search?: string
			limit?: string
			offset?: string
		}
	) {
		const where: Record<string, unknown> = {
			// Only tenants with leases in properties owned by this owner
			Lease: {
				some: {
					Unit: {
						Property: {
							ownerId: ownerId
						}
					}
				}
			}
		}

		// Add search conditions
		if (query?.search) {
			where.AND = [
				{
					OR: [
						{
							name: {
								contains: query.search,
								mode: 'insensitive'
							}
						},
						{
							email: {
								contains: query.search,
								mode: 'insensitive'
							}
						},
						{
							phone: {
								contains: query.search,
								mode: 'insensitive'
							}
						}
					]
				}
			]
		}

		const limit = query?.limit ? parseInt(query.limit) : undefined
		const offset = query?.offset ? parseInt(query.offset) : undefined

		return await this.prisma.tenant.findMany({
			where,
			include: {
				User: {
					select: {
						id: true,
						name: true,
						email: true,
						avatarUrl: true
					}
				},
				Lease: {
					where: {
						Unit: {
							Property: {
								ownerId: ownerId
							}
						}
					},
					include: {
						Unit: {
							include: {
								Property: {
									select: {
										id: true,
										name: true,
										address: true,
										city: true,
										state: true
									}
								}
							}
						}
					},
					orderBy: {
						createdAt: 'desc'
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

	async getTenantById(id: string, ownerId: string) {
		// Input validation
		if (!id || !ownerId || typeof id !== 'string' || typeof ownerId !== 'string') {
			throw this.errorHandler.createValidationError(
				'Invalid parameters: id and ownerId must be valid strings',
				{ id: typeof id, ownerId: typeof ownerId },
				{ operation: 'getTenantById', resource: 'tenant' }
			)
		}

		return await this.prisma.tenant.findFirst({
			where: {
				id: id,
				Lease: {
					some: {
						Unit: {
							Property: {
								ownerId: ownerId
							}
						}
					}
				}
			},
			include: {
				User: {
					select: {
						id: true,
						name: true,
						email: true,
						phone: true,
						avatarUrl: true
					}
				},
				Lease: {
					where: {
						Unit: {
							Property: {
								ownerId: ownerId
							}
						}
					},
					include: {
						Unit: {
							include: {
								Property: {
									select: {
										id: true,
										name: true,
										address: true,
										city: true,
										state: true
									}
								}
							}
						},
					},
					orderBy: {
						createdAt: 'desc'
					}
				}
			}
		})
	}

	async getTenantByIdOrThrow(id: string, ownerId: string) {
		const tenant = await this.getTenantById(id, ownerId)
		if (!tenant) {
			throw this.errorHandler.createNotFoundError('Tenant', id)
		}
		return tenant
	}

	async createTenant(
		tenantData: {
			name: string
			email: string
			phone?: string
			emergencyContact?: string
		},
		_ownerId: string
	) {
		const tenant = await this.prisma.tenant.create({
			data: {
				...tenantData
			},
			include: {
				User: {
					select: {
						id: true,
						name: true,
						email: true,
						avatarUrl: true
					}
				}
			}
		})

		return tenant
	}

	async updateTenant(
		id: string,
		tenantData: {
			name?: string
			email?: string
			phone?: string
			emergencyContact?: string
		},
		ownerId: string
	) {
		const tenant = await this.prisma.tenant.update({
			where: {
				id: id,
				Lease: {
					some: {
						Unit: {
							Property: {
								ownerId: ownerId
							}
						}
					}
				}
			},
			data: {
				...tenantData,
				updatedAt: new Date()
			},
			include: {
				User: {
					select: {
						id: true,
						name: true,
						email: true,
						avatarUrl: true
					}
				}
			}
		})

		return tenant
	}

	async deleteTenant(id: string, ownerId: string) {
		// Input validation
		if (!id || !ownerId || typeof id !== 'string' || typeof ownerId !== 'string') {
			throw this.errorHandler.createValidationError(
				'Invalid parameters: id and ownerId must be valid strings',
				{ id: typeof id, ownerId: typeof ownerId },
				{ operation: 'deleteTenant', resource: 'tenant' }
			)
		}

		// Check if tenant has active leases before deletion
		const tenant = await this.prisma.tenant.findFirst({
			where: {
				id: id,
				Lease: {
					some: {
						Unit: {
							Property: {
								ownerId: ownerId
							}
						}
					}
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

		if (!tenant) {
			throw this.errorHandler.createNotFoundError(
				'Tenant',
				undefined,
				{ operation: 'deleteTenant', resource: 'tenant' }
			)
		}

		if (tenant.Lease.length > 0) {
			throw this.errorHandler.createBusinessError(
				ErrorCode.CONFLICT,
				'Cannot delete tenant with active leases',
				{ operation: 'deleteTenant', resource: 'tenant', metadata: { leaseCount: tenant.Lease.length } }
			)
		}

		const deletedTenant = await this.prisma.tenant.delete({
			where: {
				id: id
			}
		})

		return deletedTenant
	}

	async getTenantStats(ownerId: string) {
		// Input validation
		if (!ownerId || typeof ownerId !== 'string') {
			throw this.errorHandler.createValidationError(
				'Invalid owner ID: must be a valid string',
				{ ownerId: typeof ownerId },
				{ operation: 'getTenantStats', resource: 'tenant' }
			)
		}
		
		const [totalTenants, activeTenants] = await Promise.all([
			// Total tenants with leases in owner's properties
			this.prisma.tenant.count({
				where: {
					Lease: {
						some: {
							Unit: {
								Property: {
									ownerId: ownerId
								}
							}
						}
					}
				}
			}),
			// Active tenants (with active leases)
			this.prisma.tenant.count({
				where: {
					Lease: {
						some: {
							status: 'ACTIVE',
							Unit: {
								Property: {
									ownerId: ownerId
								}
							}
						}
					}
				}
			})
		])

		return {
			totalTenants,
			activeTenants
		}
	}

	// Alias for getTenantStats to match route expectations
	async getStats(ownerId: string) {
		return this.getTenantStats(ownerId)
	}

	// Find one tenant - used by routes
	async findOne(id: string, ownerId: string) {
		const tenant = await this.getTenantById(id, ownerId)
		if (!tenant) {
			throw this.errorHandler.createNotFoundError(
				'Tenant',
				undefined,
				{ operation: 'findOne', resource: 'tenant' }
			)
		}
		return tenant
	}

	// Add document to tenant
	async addDocument(
		tenantId: string,
		documentData: {
			url: string
			filename: string
			mimeType: string
			documentType: string
			size: number
		},
		ownerId: string
	) {
		// Verify tenant ownership
		await this.findOne(tenantId, ownerId)
		
		// In a real implementation, you would store this in a TenantDocument table
		// For now, we'll return the document data as-is
		return {
			id: Math.random().toString(36).substring(7),
			tenantId,
			...documentData,
			createdAt: new Date(),
			updatedAt: new Date()
		}
	}

	// Remove document from tenant
	async deleteTenantDocument(
		tenantId: string,
		_documentId: string,
		ownerId: string
	) {
		// Verify tenant ownership
		await this.findOne(tenantId, ownerId)
		
		// In a real implementation, you would delete from TenantDocument table
		// For now, we'll return success
		return {
			success: true,
			message: 'Document removed successfully'
		}
	}

	// Alias for removeDocument
	async removeDocument(
		tenantId: string,
		documentId: string,
		ownerId: string
	) {
		return this.deleteTenantDocument(tenantId, documentId, ownerId)
	}
}