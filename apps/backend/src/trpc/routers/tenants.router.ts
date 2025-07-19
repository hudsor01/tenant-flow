import { z } from 'zod'
import {
	createRouter,
	tenantProcedure,
	protectedProcedure,
	publicProcedure
} from '../trpc'
import type { TenantsService } from '../../tenants/tenants.service'
import type { StorageService } from '../../storage/storage.service'
import type { AuthenticatedContext } from '../types/common'
import { TRPCError } from '@trpc/server'
import {
	createTenantSchema,
	updateTenantSchema,
	tenantQuerySchema,
	tenantIdSchema,
	acceptInvitationSchema,
	verifyInvitationSchema,
	tenantSchema,
	// tenantListSchema,
	tenantStatsSchema,
	invitationVerificationSchema,
	invitationAcceptanceSchema,
	uploadDocumentSchema,
	uploadResultSchema
} from '../schemas/tenant.schemas'

export const createTenantsRouter = (
	tenantsService: TenantsService,
	storageService?: StorageService
) => {
	return createRouter({
		list: tenantProcedure
			.input(tenantQuerySchema)
			.output(
				z.object({
					tenants: z.array(tenantSchema),
					total: z.number()
				})
			)
			.query(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof tenantQuerySchema>
					ctx: AuthenticatedContext
				}) => {
					try {
						const tenants = await tenantsService.getTenantsByOwner(
							ctx.user.id,
							input
						)

						// Transform dates to ISO strings for TRPC
						const transformedTenants = tenants.map(tenant => ({
							...tenant,
							invitedAt: tenant.invitedAt?.toISOString() || null,
							acceptedAt:
								tenant.acceptedAt?.toISOString() || null,
							expiresAt: tenant.expiresAt?.toISOString() || null,
							createdAt: tenant.createdAt.toISOString(),
							updatedAt: tenant.updatedAt.toISOString(),
							Lease: tenant.Lease?.map(lease => ({
								id: lease.id,
								status: lease.status,
								startDate: lease.startDate.toISOString(),
								endDate: lease.endDate.toISOString(),
								rentAmount: lease.rentAmount,
								Unit: {
									id: lease.Unit.id,
									unitNumber: lease.Unit.unitNumber,
									Property: {
										id: lease.Unit.Property.id,
										name: lease.Unit.Property.name,
										address: lease.Unit.Property.address,
										city: lease.Unit.Property.city,
										state: lease.Unit.Property.state
									}
								}
							}))
						}))

						return {
							tenants: transformedTenants,
							total: tenants.length
						}
					} catch (error) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to fetch tenants',
							cause: error
						})
					}
				}
			),

		stats: protectedProcedure
			.output(tenantStatsSchema)
			.query(async ({ ctx }: { ctx: AuthenticatedContext }) => {
				try {
					return await tenantsService.getTenantStats(ctx.user.id)
				} catch (error) {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'Failed to fetch tenant statistics',
						cause: error
					})
				}
			}),

		byId: tenantProcedure
			.input(tenantIdSchema)
			.output(tenantSchema)
			.query(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof tenantIdSchema>
					ctx: AuthenticatedContext
				}) => {
					try {
						const tenant = await tenantsService.getTenantById(
							input.id,
							ctx.user.id
						)

						if (!tenant) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message: 'Tenant not found'
							})
						}

						// Transform dates to ISO strings for TRPC
						return {
							...tenant,
							invitedAt: tenant.invitedAt?.toISOString() || null,
							acceptedAt:
								tenant.acceptedAt?.toISOString() || null,
							expiresAt: tenant.expiresAt?.toISOString() || null,
							createdAt: tenant.createdAt.toISOString(),
							updatedAt: tenant.updatedAt.toISOString(),
							Lease: tenant.Lease?.map(lease => ({
								id: lease.id,
								status: lease.status,
								startDate: lease.startDate.toISOString(),
								endDate: lease.endDate.toISOString(),
								rentAmount: lease.rentAmount,
								Unit: {
									id: lease.Unit.id,
									unitNumber: lease.Unit.unitNumber,
									Property: {
										id: lease.Unit.Property.id,
										name: lease.Unit.Property.name,
										address: lease.Unit.Property.address,
										city: lease.Unit.Property.city,
										state: lease.Unit.Property.state
									}
								}
							}))
						}
					} catch (error) {
						if (error instanceof TRPCError) {
							throw error
						}
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to fetch tenant',
							cause: error
						})
					}
				}
			),

		invite: protectedProcedure
			.input(createTenantSchema)
			.output(tenantSchema)
			.mutation(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof createTenantSchema>
					ctx: AuthenticatedContext
				}) => {
					try {
						const tenant = await tenantsService.createTenant(
							ctx.user.id,
							input
						)

						// Transform dates to ISO strings for TRPC
						return {
							...tenant,
							invitedAt: tenant.invitedAt?.toISOString() || null,
							acceptedAt:
								tenant.acceptedAt?.toISOString() || null,
							expiresAt: tenant.expiresAt?.toISOString() || null,
							createdAt: tenant.createdAt.toISOString(),
							updatedAt: tenant.updatedAt.toISOString(),
							// Note: createTenant doesn't include Lease relations
							User: tenant.User || null
						}
					} catch (error) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to send tenant invitation',
							cause: error
						})
					}
				}
			),

		update: tenantProcedure
			.input(updateTenantSchema)
			.output(tenantSchema)
			.mutation(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof updateTenantSchema>
					ctx: AuthenticatedContext
				}) => {
					try {
						const { id, ...updateData } = input
						const tenant = await tenantsService.updateTenant(
							id,
							ctx.user.id,
							updateData
						)

						// Transform dates to ISO strings for TRPC
						return {
							...tenant,
							invitedAt: tenant.invitedAt?.toISOString() || null,
							acceptedAt:
								tenant.acceptedAt?.toISOString() || null,
							expiresAt: tenant.expiresAt?.toISOString() || null,
							createdAt: tenant.createdAt.toISOString(),
							updatedAt: tenant.updatedAt.toISOString(),
							// Note: updateTenant doesn't include Lease relations
							User: tenant.User || null
						}
					} catch (error) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to update tenant',
							cause: error
						})
					}
				}
			),

		delete: tenantProcedure
			.input(tenantIdSchema)
			.output(tenantSchema)
			.mutation(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof tenantIdSchema>
					ctx: AuthenticatedContext
				}) => {
					try {
						const tenant = await tenantsService.deleteTenant(
							input.id,
							ctx.user.id
						)

						// Transform dates to ISO strings for TRPC
						return {
							...tenant,
							invitedAt: tenant.invitedAt?.toISOString() || null,
							acceptedAt:
								tenant.acceptedAt?.toISOString() || null,
							expiresAt: tenant.expiresAt?.toISOString() || null,
							createdAt: tenant.createdAt.toISOString(),
							updatedAt: tenant.updatedAt.toISOString(),
							// Note: deleteTenant doesn't include full relations
							User: null
						}
					} catch (error) {
						if (
							error instanceof Error &&
							error.message === 'Tenant not found'
						) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message: 'Tenant not found'
							})
						}
						if (
							error instanceof Error &&
							error.message ===
								'Cannot delete tenant with active leases'
						) {
							throw new TRPCError({
								code: 'CONFLICT',
								message:
									'Cannot delete tenant with active leases'
							})
						}
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to delete tenant',
							cause: error
						})
					}
				}
			),

		// Public endpoints for invitation flow
		verifyInvitation: publicProcedure
			.input(verifyInvitationSchema)
			.output(invitationVerificationSchema)
			.query(
				async ({
					input
				}: {
					input: z.infer<typeof verifyInvitationSchema>
				}) => {
					try {
						return await tenantsService.verifyInvitation(
							input.token
						)
					} catch (error) {
						if (
							error instanceof Error &&
							(error.message.includes('Invalid') ||
								error.message.includes('expired'))
						) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message:
									error instanceof Error
										? error.message
										: 'Unknown error'
							})
						}
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to verify invitation',
							cause: error
						})
					}
				}
			),

		acceptInvitation: publicProcedure
			.input(acceptInvitationSchema)
			.output(invitationAcceptanceSchema)
			.mutation(
				async ({
					input
				}: {
					input: z.infer<typeof acceptInvitationSchema>
				}) => {
					try {
						const result = await tenantsService.acceptInvitation(
							input.token,
							{
								password: input.password,
								userInfo: input.userInfo
							}
						)

						// Transform dates to ISO strings for TRPC
						return {
							...result,
							tenant: {
								...result.tenant,
								invitedAt:
									result.tenant.invitedAt?.toISOString() ||
									null,
								acceptedAt:
									result.tenant.acceptedAt?.toISOString() ||
									null,
								expiresAt:
									result.tenant.expiresAt?.toISOString() ||
									null,
								createdAt:
									result.tenant.createdAt.toISOString(),
								updatedAt:
									result.tenant.updatedAt.toISOString(),
								// Note: acceptInvitation doesn't include Lease relations
								User: result.tenant.User
									? {
											...result.tenant.User,
											avatarUrl: null // avatarUrl not included in service response
										}
									: null
							},
							user: {
								...result.user,
								avatarUrl: null // avatarUrl not included in service response
							}
						}
					} catch (error) {
						if (
							error instanceof Error &&
							(error.message.includes('Invalid') ||
								error.message.includes('expired'))
						) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message:
									error instanceof Error
										? error.message
										: 'Unknown error'
							})
						}
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to accept invitation',
							cause: error
						})
					}
				}
			),

		uploadDocument: protectedProcedure
			.input(uploadDocumentSchema)
			.output(uploadResultSchema)
			.mutation(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof uploadDocumentSchema>
					ctx: AuthenticatedContext
				}) => {
					if (!storageService) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Storage service not available'
						})
					}

					try {
						const { tenantId, file } = input

						// Validate file size (10MB limit)
						const maxSize = 10 * 1024 * 1024
						if (file.size > maxSize) {
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'File size exceeds 10MB limit'
							})
						}

						// Validate MIME types (documents and images)
						const allowedTypes = [
							'application/pdf',
							'image/',
							'text/'
						]
						if (
							!allowedTypes.some(type =>
								file.mimeType.startsWith(type)
							)
						) {
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message:
									'Only PDF, image, and text files are allowed'
							})
						}

						// Verify tenant access
						const tenant = await tenantsService.getTenantById(
							tenantId,
							ctx.user.id
						)
						if (!tenant) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message: 'Tenant not found'
							})
						}

						// Convert base64 to buffer
						const fileBuffer = Buffer.from(file.data, 'base64')

						// Upload to storage
						const bucket = storageService.getBucket('document')
						const storagePath = storageService.getStoragePath(
							'tenant',
							tenantId,
							file.filename
						)

						const uploadResult = await storageService.uploadFile(
							bucket,
							storagePath,
							fileBuffer,
							{
								contentType: file.mimeType,
								upsert: false
							}
						)

						return {
							url: uploadResult.url,
							path: uploadResult.path,
							filename: uploadResult.filename,
							size: uploadResult.size,
							mimeType: uploadResult.mimeType
						}
					} catch (error) {
						if (error instanceof TRPCError) {
							throw error
						}
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to upload document',
							cause: error
						})
					}
				}
			),

		resendInvitation: protectedProcedure
			.input(tenantIdSchema)
			.output(z.object({ success: z.boolean(), message: z.string() }))
			.mutation(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof tenantIdSchema>
					ctx: AuthenticatedContext
				}) => {
					try {
						await tenantsService.resendInvitation(
							input.id,
							ctx.user.id
						)
						return {
							success: true,
							message: 'Invitation resent successfully'
						}
					} catch (error) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to resend invitation',
							cause: error
						})
					}
				}
			),

		deletePendingInvitation: protectedProcedure
			.input(tenantIdSchema)
			.output(z.object({ success: z.boolean(), message: z.string() }))
			.mutation(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof tenantIdSchema>
					ctx: AuthenticatedContext
				}) => {
					try {
						await tenantsService.deletePendingInvitation(
							input.id,
							ctx.user.id
						)
						return {
							success: true,
							message: 'Pending invitation deleted successfully'
						}
					} catch (error) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to delete pending invitation',
							cause: error
						})
					}
				}
			)
	})
}

// Export factory function for DI
export const tenantsRouter = createTenantsRouter
