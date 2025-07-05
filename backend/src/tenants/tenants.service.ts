import { Injectable } from '@nestjs/common'
import type { PrismaService } from 'nestjs-prisma'

@Injectable()
export class TenantsService {
	constructor(private prisma: PrismaService) {}

	async getTenantsByOwner(
		ownerId: string,
		query?: {
			status?: string
			search?: string
			limit?: string
			offset?: string
		}
	) {
		const where: {
			OR?: {
				invitedBy?: string
				Lease?: {
					some: {
						Unit: {
							Property: {
								ownerId: string
							}
						}
					}
				}
			}[]
			AND?: Record<string, unknown>[]
			status?: string
		} = {
			OR: [
				{
					// Tenants invited by this owner
					invitedBy: ownerId
				},
				{
					// Tenants with leases in properties owned by this owner
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
			]
		}

		// Add filtering conditions
		if (query?.status) {
			where.status = query.status
		}

		if (query?.search) {
			where.AND = [
				where.OR ? { OR: where.OR } : {},
				{
					OR: [
						{
							User: {
								name: {
									contains: query.search,
									mode: 'insensitive'
								}
							}
						},
						{
							User: {
								email: {
									contains: query.search,
									mode: 'insensitive'
								}
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
			delete where.OR
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
										address: true
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
		return await this.prisma.tenant.findFirst({
			where: {
				id: id,
				OR: [
					{
						invitedBy: ownerId
					},
					{
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
				]
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
				}
			}
		})
	}

	async createTenant(
		ownerId: string,
		tenantData: {
			name: string
			email: string
			phone?: string
			emergencyContact?: string
		}
	) {
		return await this.prisma.tenant.create({
			data: {
				...tenantData,
				invitedBy: ownerId,
				invitationStatus: 'PENDING',
				invitedAt: new Date(),
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
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
	}

	async updateTenant(
		id: string,
		ownerId: string,
		tenantData: {
			name?: string
			email?: string
			phone?: string
			emergencyContact?: string
		}
	) {
		return await this.prisma.tenant.update({
			where: {
				id: id,
				OR: [
					{
						invitedBy: ownerId
					},
					{
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
				]
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
	}

	async deleteTenant(id: string, ownerId: string) {
		// Check if tenant has active leases before deletion
		const tenant = await this.prisma.tenant.findFirst({
			where: {
				id: id,
				OR: [
					{
						invitedBy: ownerId
					},
					{
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
				]
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
			throw new Error('Tenant not found')
		}

		if (tenant.Lease.length > 0) {
			throw new Error('Cannot delete tenant with active leases')
		}

		return await this.prisma.tenant.delete({
			where: {
				id: id
			}
		})
	}

	async getTenantStats(ownerId: string) {
		const [totalTenants, activeTenants, pendingInvitations] =
			await Promise.all([
				// Total tenants
				this.prisma.tenant.count({
					where: {
						OR: [
							{
								invitedBy: ownerId
							},
							{
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
						]
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
				}),
				// Pending invitations
				this.prisma.tenant.count({
					where: {
						invitedBy: ownerId,
						invitationStatus: 'PENDING'
					}
				})
			])

		return {
			totalTenants,
			activeTenants,
			pendingInvitations
		}
	}

	async acceptInvitation(
		token: string,
		acceptanceData: {
			password: string
			userInfo: {
				id: string
				email: string
				name?: string
			}
		}
	) {
		// 1. Find tenant by invitation token
		const tenant = await this.prisma.tenant.findFirst({
			where: {
				invitationToken: token,
				invitationStatus: 'PENDING'
			}
		})

		if (!tenant) {
			throw new Error('Invalid or expired invitation token')
		}

		// 2. Check if invitation has expired
		if (tenant.expiresAt && new Date(tenant.expiresAt) < new Date()) {
			throw new Error('Invitation has expired')
		}

		// 3. Create or update User record
		const userData = {
			id: acceptanceData.userInfo.id,
			email: acceptanceData.userInfo.email,
			name: acceptanceData.userInfo.name || tenant.name,
			role: 'TENANT' as const
		}

		const user = await this.prisma.user.upsert({
			where: { id: userData.id },
			update: {
				name: userData.name,
				updatedAt: new Date()
			},
			create: userData
		})

		// 4. Update tenant record
		const updatedTenant = await this.prisma.tenant.update({
			where: { id: tenant.id },
			data: {
				userId: user.id,
				invitationStatus: 'ACCEPTED',
				acceptedAt: new Date(),
				invitationToken: null // Clear token for security
			},
			include: {
				User: {
					select: {
						id: true,
						name: true,
						email: true
					}
				}
			}
		})

		// 5. Create notification for property owner
		if (tenant.invitedBy) {
			await this.prisma.notification.create({
				data: {
					userId: tenant.invitedBy,
					title: 'Tenant Accepted Invitation',
					message: `${tenant.name} has accepted the invitation and set up their account.`,
					type: 'TENANT',
					priority: 'HIGH',
					tenantId: tenant.id,
					read: false
				}
			})
		}

		return {
			success: true,
			tenant: updatedTenant,
			user: user
		}
	}

	async verifyInvitation(token: string) {
		const tenant = await this.prisma.tenant.findFirst({
			where: {
				invitationToken: token,
				invitationStatus: 'PENDING'
			}
		})

		if (!tenant) {
			throw new Error('Invalid or expired invitation token')
		}

		// Check if invitation has expired
		if (tenant.expiresAt && new Date(tenant.expiresAt) < new Date()) {
			throw new Error('Invitation has expired')
		}

		// Get property information and inviting user
		const [property, invitingUser] = await Promise.all([
			this.prisma.property.findFirst({
				where: {
					ownerId: tenant.invitedBy || ''
				},
				select: {
					id: true,
					name: true,
					address: true,
					city: true,
					state: true,
					zipCode: true
				}
			}),
			tenant.invitedBy
				? this.prisma.user.findUnique({
						where: { id: tenant.invitedBy },
						select: {
							id: true,
							name: true,
							email: true
						}
					})
				: null
		])

		return {
			tenant: {
				id: tenant.id,
				name: tenant.name,
				email: tenant.email,
				phone: tenant.phone
			},
			property: property || null,
			propertyOwner: invitingUser || {
				id: tenant.invitedBy || '',
				name: 'Unknown',
				email: 'unknown@example.com'
			},
			expiresAt: tenant.expiresAt
		}
	}
}
