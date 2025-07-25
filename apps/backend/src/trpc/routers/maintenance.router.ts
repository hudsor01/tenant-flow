import { z } from 'zod'
import { createRouter, tenantProcedure, protectedProcedure } from '../trpc'
import type { MaintenanceService } from '../../maintenance/maintenance.service'
import { TRPCError } from '@trpc/server'
import {
	createMaintenanceSchema,
	updateMaintenanceSchema,
	maintenanceQuerySchema,
	maintenanceIdSchema,
	assignMaintenanceSchema,
	completeMaintenanceSchema,
	maintenanceRequestSchema,
	// maintenanceListSchema,
	maintenanceStatsSchema,
	maintenanceWorkOrderSchema
} from '../schemas/maintenance.schemas'
import type { Priority } from '@prisma/client'


export const createMaintenanceRouter = (
	maintenanceService: MaintenanceService
) => {
	return createRouter({
		list: tenantProcedure
			.input(maintenanceQuerySchema)
			.output(
				z.object({
					requests: z.array(maintenanceRequestSchema),
					total: z.number(),
					totalCost: z.number()
				})
			)
			.query(async ({ input, ctx }) => {
					try {
						// Add owner filter to query
						const ownerQuery = {
							...input,
							page: input.offset
								? Math.floor(
										parseInt(input.offset) /
											parseInt(input.limit || '10')
									) + 1
								: 1,
							limit: input.limit ? parseInt(input.limit) : 10
						}

						const requests =
							await maintenanceService.findAll(ownerQuery)

						// Filter requests by owner's properties
						const filteredRequests = requests.filter(
							request =>
								request.Unit?.Property?.ownerId === ctx.user.id
						)

						const totalCost = filteredRequests.reduce(
							(sum, request) =>
								sum +
								(request.actualCost ||
									request.estimatedCost ||
									0),
							0
						)

						// Transform dates to ISO strings for TRPC
						const transformedRequests = filteredRequests.map(
							request => ({
								...request,
								preferredDate:
									request.preferredDate?.toISOString() ||
									null,
								completedAt:
									request.completedAt?.toISOString() || null,
								createdAt: request.createdAt.toISOString(),
								updatedAt: request.updatedAt.toISOString()
							})
						)

						return {
							requests: transformedRequests,
							total: filteredRequests.length,
							totalCost
						}
					} catch (error) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to fetch maintenance requests',
							cause: error
						})
					}
				}
			),

		stats: protectedProcedure
			.output(maintenanceStatsSchema)
			.query(async ({ ctx: _ctx }) => {
				try {
					// TODO: Implement comprehensive maintenance stats
					const stats = await maintenanceService.getStats()
					return {
						totalRequests: stats.total || 0,
						openRequests: stats.open || 0,
						inProgressRequests: stats.inProgress || 0,
						completedRequests: stats.completed || 0,
						urgentRequests: 0,
						totalEstimatedCost: 0,
						totalActualCost: 0,
						averageCompletionTime: 0,
						categoryBreakdown: []
					}
				} catch (error) {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'Failed to fetch maintenance statistics',
						cause: error
					})
				}
			}),

		byId: tenantProcedure
			.input(maintenanceIdSchema)
			.output(maintenanceRequestSchema)
			.query(async ({ input, ctx }) => {
					try {
						const request = await maintenanceService.findOne(
							input.id
						)

						if (!request) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message: 'Maintenance request not found'
							})
						}

						// Verify owner access
						if (request.Unit?.Property?.ownerId !== ctx.user.id) {
							throw new TRPCError({
								code: 'FORBIDDEN',
								message: 'Access denied'
							})
						}

						// Transform dates to ISO strings for TRPC
						return {
							...request,
							preferredDate:
								request.preferredDate?.toISOString() || null,
							completedAt:
								request.completedAt?.toISOString() || null,
							createdAt: request.createdAt.toISOString(),
							updatedAt: request.updatedAt.toISOString()
						}
					} catch (error) {
						if (error instanceof TRPCError) {
							throw error
						}
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to fetch maintenance request',
							cause: error
						})
					}
				}
			),

		add: protectedProcedure
			.input(createMaintenanceSchema)
			.output(maintenanceRequestSchema)
			.mutation(async ({ input, ctx }) => {
					try {
						// TODO: Unit verification and access control handled in maintenance service create method
						const request = await maintenanceService.create({
							unitId: input.unitId,
							title: input.title,
							description: input.description,
							category: input.category,
							priority: input.priority as Priority,
							preferredDate: input.preferredDate
								? new Date(input.preferredDate)
								: undefined,
							allowEntry: input.allowEntry ?? true,
							contactPhone: input.contactPhone ?? undefined,
							photos: input.photos,
							status: 'OPEN',
							requestedBy: ctx.user.id
						})

						// Transform dates to ISO strings for TRPC
						return {
							...request,
							preferredDate:
								request.preferredDate?.toISOString() || null,
							completedAt:
								request.completedAt?.toISOString() || null,
							createdAt: request.createdAt.toISOString(),
							updatedAt: request.updatedAt.toISOString()
						}
					} catch (error) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to create maintenance request',
							cause: error
						})
					}
				}
			),

		update: tenantProcedure
			.input(updateMaintenanceSchema)
			.output(maintenanceRequestSchema)
			.mutation(async ({ input, ctx }) => {
					try {
						const { id, ...updateData } = input

						// First verify request exists and owner has access
						const existingRequest =
							await maintenanceService.findOne(id)
						if (!existingRequest) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message: 'Maintenance request not found'
							})
						}

						if (
							existingRequest.Unit?.Property?.ownerId !==
							ctx.user.id
						) {
							throw new TRPCError({
								code: 'FORBIDDEN',
								message: 'Access denied'
							})
						}

						const updateDataWithDate = {
							...updateData,
							preferredDate: updateData.preferredDate
								? new Date(updateData.preferredDate)
								: undefined
							// completedAt is already a string in UpdateMaintenanceDto
						}

						const updated = await maintenanceService.update(
							id,
							updateDataWithDate
						)

						// Transform dates to ISO strings for TRPC
						return {
							...updated,
							preferredDate:
								updated.preferredDate?.toISOString() || null,
							completedAt:
								updated.completedAt?.toISOString() || null,
							createdAt: updated.createdAt.toISOString(),
							updatedAt: updated.updatedAt.toISOString()
						}
					} catch (error) {
						if (error instanceof TRPCError) {
							throw error
						}
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to update maintenance request',
							cause: error
						})
					}
				}
			),

		delete: tenantProcedure
			.input(maintenanceIdSchema)
			.output(maintenanceRequestSchema)
			.mutation(async ({ input, ctx }) => {
					try {
						// First verify request exists and owner has access
						const existingRequest =
							await maintenanceService.findOne(input.id)
						if (!existingRequest) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message: 'Maintenance request not found'
							})
						}

						if (
							existingRequest.Unit?.Property?.ownerId !==
							ctx.user.id
						) {
							throw new TRPCError({
								code: 'FORBIDDEN',
								message: 'Access denied'
							})
						}

						const removed = await maintenanceService.remove(
							input.id
						)

						// Transform dates to ISO strings for TRPC
						return {
							...removed,
							preferredDate:
								removed.preferredDate?.toISOString() || null,
							completedAt:
								removed.completedAt?.toISOString() || null,
							createdAt: removed.createdAt.toISOString(),
							updatedAt: removed.updatedAt.toISOString()
						}
					} catch (error) {
						if (error instanceof TRPCError) {
							throw error
						}
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to delete maintenance request',
							cause: error
						})
					}
				}
			),

		assign: tenantProcedure
			.input(assignMaintenanceSchema)
			.output(maintenanceRequestSchema)
			.mutation(async ({ input, ctx }) => {
					try {
						const { id, assignedTo, estimatedCost, notes } = input

						// First verify request exists and owner has access
						const existingRequest =
							await maintenanceService.findOne(id)
						if (!existingRequest) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message: 'Maintenance request not found'
							})
						}

						if (
							existingRequest.Unit?.Property?.ownerId !==
							ctx.user.id
						) {
							throw new TRPCError({
								code: 'FORBIDDEN',
								message: 'Access denied'
							})
						}

						const updated = await maintenanceService.update(id, {
							assignedTo,
							estimatedCost,
							notes,
							status: 'IN_PROGRESS'
						})

						// Transform dates to ISO strings for TRPC
						return {
							...updated,
							preferredDate:
								updated.preferredDate?.toISOString() || null,
							completedAt:
								updated.completedAt?.toISOString() || null,
							createdAt: updated.createdAt.toISOString(),
							updatedAt: updated.updatedAt.toISOString()
						}
					} catch (error) {
						if (error instanceof TRPCError) {
							throw error
						}
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to assign maintenance request',
							cause: error
						})
					}
				}
			),

		complete: tenantProcedure
			.input(completeMaintenanceSchema)
			.output(maintenanceRequestSchema)
			.mutation(async ({ input, ctx }) => {
					try {
						const { id, actualCost, notes, photos } = input

						// First verify request exists and owner has access
						const existingRequest =
							await maintenanceService.findOne(id)
						if (!existingRequest) {
							throw new TRPCError({
								code: 'NOT_FOUND',
								message: 'Maintenance request not found'
							})
						}

						if (
							existingRequest.Unit?.Property?.ownerId !==
							ctx.user.id
						) {
							throw new TRPCError({
								code: 'FORBIDDEN',
								message: 'Access denied'
							})
						}

						const updated = await maintenanceService.update(id, {
							actualCost,
							notes,
							photos,
							status: 'COMPLETED',
							completedAt: new Date().toISOString()
						})

						// Transform dates to ISO strings for TRPC
						return {
							...updated,
							preferredDate:
								updated.preferredDate?.toISOString() || null,
							completedAt:
								updated.completedAt?.toISOString() || null,
							createdAt: updated.createdAt.toISOString(),
							updatedAt: updated.updatedAt.toISOString()
						}
					} catch (error) {
						if (error instanceof TRPCError) {
							throw error
						}
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to complete maintenance request',
							cause: error
						})
					}
				}
			),

		createWorkOrder: tenantProcedure
			.input(
				z.object({
					maintenanceRequestId: z.string().uuid(),
					assignedTo: z.string().uuid(),
					scheduledDate: z.string().datetime(),
					estimatedHours: z.number().positive(),
					instructions: z.string().optional()
				})
			)
			.output(maintenanceWorkOrderSchema)
			.mutation(async ({ input: _input, ctx: _ctx }) => {
				try {
					throw new TRPCError({
						code: 'NOT_IMPLEMENTED',
						message: 'Work order creation not yet implemented'
					})
				} catch (error) {
					if (error instanceof TRPCError) {
						throw error
					}
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'Failed to create work order',
						cause: error
					})
				}
			})
	})
}

// Export factory function for DI
export const maintenanceRouter = createMaintenanceRouter
