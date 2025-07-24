import { z } from 'zod'
import { createRouter, tenantProcedure, protectedProcedure } from '../trpc'
import type { PropertiesService } from '../../properties/properties.service'
import type { StorageService } from '../../storage/storage.service'
import type { AuthenticatedContext } from '@tenantflow/shared'
import { TRPCError } from '@trpc/server'
import {
	createPropertySchema,
	updatePropertySchema,
	propertyQuerySchema,
	propertyIdSchema,
	propertySchema,
	// propertyListSchema,
	propertyStatsSchema,
	uploadImageSchema,
	uploadResultSchema
} from '../schemas/property.schemas'

export const createPropertiesRouter = (
	propertiesService: PropertiesService,
	storageService: StorageService
) => {
	return createRouter({
		list: tenantProcedure
			.input(propertyQuerySchema)
			.output(
				z.object({
					properties: z.array(propertySchema),
					total: z.number()
				})
			)
			.query(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof propertyQuerySchema>
					ctx: AuthenticatedContext
				}) => {
					try {
						const properties =
							await propertiesService.getPropertiesByOwner(
								ctx.user.id,
								input
							)
						return {
							properties,
							total: properties.length
						}
					} catch (error) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to fetch properties',
							cause: error
						})
					}
				}
			),

		stats: protectedProcedure
			.output(propertyStatsSchema)
			.query(async ({ ctx }: { ctx: AuthenticatedContext }) => {
				try {
					const stats = await propertiesService.getPropertyStats(
						ctx.user.id
					)
					return {
						totalProperties: stats.totalProperties,
						totalUnits: stats.totalUnits,
						occupiedUnits: 0,
						vacantUnits: stats.totalUnits,
						totalRent: 0,
						collectedRent: 0,
						pendingRent: 0
					}
				} catch (error) {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'Failed to fetch property statistics',
						cause: error
					})
				}
			}),

		byId: tenantProcedure
			.input(propertyIdSchema)
			.output(propertySchema)
			.query(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof propertyIdSchema>
					ctx: AuthenticatedContext
				}) => {
					try {
						const property =
							await propertiesService.getPropertyById(
								input.id,
								ctx.user.id
							)

						if (!property) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message: 'Property not found'
							})
						}

						return property
					} catch (error) {
						if (error instanceof TRPCError) {
							throw error
						}
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to fetch property',
							cause: error
						})
					}
				}
			),

		add: protectedProcedure
			.input(createPropertySchema)
			.output(propertySchema)
			.mutation(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof createPropertySchema>
					ctx: AuthenticatedContext
				}) => {
					try {
						return await propertiesService.createProperty(
							ctx.user.id,
							input
						)
					} catch (error) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to create property',
							cause: error
						})
					}
				}
			),

		update: tenantProcedure
			.input(updatePropertySchema)
			.output(propertySchema)
			.mutation(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof updatePropertySchema>
					ctx: AuthenticatedContext
				}) => {
					try {
						const { id, ...updateData } = input
						return await propertiesService.updateProperty(
							id,
							ctx.user.id,
							updateData
						)
					} catch (error) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to update property',
							cause: error
						})
					}
				}
			),

		delete: tenantProcedure
			.input(propertyIdSchema)
			.output(propertySchema)
			.mutation(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof propertyIdSchema>
					ctx: AuthenticatedContext
				}) => {
					try {
						return await propertiesService.deleteProperty(
							input.id,
							ctx.user.id
						)
					} catch (error) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to delete property',
							cause: error
						})
					}
				}
			),

		uploadImage: protectedProcedure
			.input(uploadImageSchema)
			.output(uploadResultSchema)
			.mutation(
				async ({
					input,
					ctx
				}: {
					input: z.infer<typeof uploadImageSchema>
					ctx: AuthenticatedContext
				}) => {
					try {
						const { propertyId, file } = input

						// Validate file size (10MB limit)
						const maxSize = 10 * 1024 * 1024
						if (file.size > maxSize) {
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'File size exceeds 10MB limit'
							})
						}

						// Validate MIME type (images only)
						if (!file.mimeType.startsWith('image/')) {
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'Only image files are allowed'
							})
						}

						// Verify property ownership
						const property =
							await propertiesService.getPropertyById(
								propertyId,
								ctx.user.id
							)
						if (!property) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message: 'Property not found'
							})
						}

						// Convert base64 to buffer
						const fileBuffer = Buffer.from(file.data, 'base64')

						// Upload to storage
						const bucket = storageService.getBucket('image')
						const storagePath = storageService.getStoragePath(
							'property',
							propertyId,
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

						// Update property with new image URL
						await propertiesService.updateProperty(
							propertyId,
							ctx.user.id,
							{
								imageUrl: uploadResult.url
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
							message: 'Failed to upload image',
							cause: error
						})
					}
				}
			)
	})
}

// Export factory function for DI
export const propertiesRouter = createPropertiesRouter
