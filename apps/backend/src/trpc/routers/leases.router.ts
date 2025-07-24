import { z } from 'zod'
import { createRouter, protectedProcedure } from '../trpc'
import type { LeasesService } from '../../leases/leases.service'
import type { AuthenticatedContext } from '@tenantflow/shared'
import { TRPCError } from '@trpc/server'

// Define schemas for type safety
const leaseListInputSchema = z
	.object({
		propertyId: z.string().optional(),
		tenantId: z.string().optional(),
		status: z
			.enum(['ACTIVE', 'PENDING', 'EXPIRED', 'TERMINATED'])
			.optional()
	})
	.optional()

const leaseByIdInputSchema = z.object({ id: z.string() })

const leaseCreateInputSchema = z.object({
	propertyId: z.string(),
	unitId: z.string(),
	tenantId: z.string(),
	startDate: z.string().datetime(),
	endDate: z.string().datetime(),
	MONTHLYRent: z.number().min(0),
	securityDeposit: z.number().min(0).optional(),
	terms: z.string().optional(),
	leaseDocument: z.string().optional()
})

const leaseUpdateInputSchema = z.object({
	id: z.string(),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
	MONTHLYRent: z.number().min(0).optional(),
	securityDeposit: z.number().min(0).optional(),
	terms: z.string().optional(),
	leaseDocument: z.string().optional(),
	status: z.enum(['ACTIVE', 'PENDING', 'EXPIRED', 'TERMINATED']).optional()
})

const leaseTerminateInputSchema = z.object({
	id: z.string(),
	terminationDate: z.string().datetime(),
	reason: z.string().optional()
})

const upcomingExpirationsInputSchema = z
	.object({
		days: z.number().int().min(1).max(365).default(30)
	})
	.optional()

export const createLeasesRouter = (leasesService: LeasesService) =>
	createRouter({
		list: protectedProcedure
			.input(leaseListInputSchema)
			.query(async ({ ctx }: { ctx: AuthenticatedContext }) => {
				try {
					return await leasesService.getLeasesByOwner(ctx.user.id)
				} catch {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'Failed to fetch leases'
					})
				}
			}),

		byId: protectedProcedure
			.input(leaseByIdInputSchema)
			.query(
				async ({
					ctx,
					input
				}: {
					ctx: AuthenticatedContext
					input: z.infer<typeof leaseByIdInputSchema>
				}) => {
					try {
						return await leasesService.getLeaseById(
							input.id,
							ctx.user.id
						)
					} catch {
						throw new TRPCError({
							code: 'NOT_FOUND',
							message: 'Lease not found'
						})
					}
				}
			),

		add: protectedProcedure
			.input(leaseCreateInputSchema)
			.mutation(
				async ({
					ctx,
					input
				}: {
					ctx: AuthenticatedContext
					input: z.infer<typeof leaseCreateInputSchema>
				}) => {
					try {
						return await leasesService.createLease(ctx.user.id, {
							unitId: input.unitId,
							tenantId: input.tenantId,
							startDate: input.startDate,
							endDate: input.endDate,
							rentAmount: input.MONTHLYRent,
							securityDeposit: input.securityDeposit || 0
						})
					} catch {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to create lease'
						})
					}
				}
			),

		update: protectedProcedure
			.input(leaseUpdateInputSchema)
			.mutation(
				async ({
					ctx,
					input
				}: {
					ctx: AuthenticatedContext
					input: z.infer<typeof leaseUpdateInputSchema>
				}) => {
					try {
						const {
							id,
							startDate,
							endDate,
							MONTHLYRent,
							...updateData
						} = input
						const processedData = {
							...updateData,
							...(startDate && {
								startDate: new Date(startDate).toISOString()
							}),
							...(endDate && {
								endDate: new Date(endDate).toISOString()
							}),
							...(MONTHLYRent && { rentAmount: MONTHLYRent })
						}
						return await leasesService.updateLease(
							id,
							ctx.user.id,
							processedData
						)
					} catch {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to update lease'
						})
					}
				}
			),

		delete: protectedProcedure
			.input(leaseByIdInputSchema)
			.mutation(
				async ({
					ctx,
					input
				}: {
					ctx: AuthenticatedContext
					input: z.infer<typeof leaseByIdInputSchema>
				}) => {
					try {
						await leasesService.deleteLease(input.id, ctx.user.id)
						return { success: true }
					} catch {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to delete lease'
						})
					}
				}
			),

		terminate: protectedProcedure
			.input(leaseTerminateInputSchema)
			.mutation(
				async ({
					ctx,
					input
				}: {
					ctx: AuthenticatedContext
					input: z.infer<typeof leaseTerminateInputSchema>
				}) => {
					try {
						// Terminate by updating status to 'TERMINATED'
						return await leasesService.updateLease(
							input.id,
							ctx.user.id,
							{
								status: 'TERMINATED',
								endDate: input.terminationDate
							}
						)
					} catch {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to terminate lease'
						})
					}
				}
			),

		upcomingExpirations: protectedProcedure
			.input(upcomingExpirationsInputSchema)
			.query(
				async ({
					ctx,
					input
				}: {
					ctx: AuthenticatedContext
					input: z.infer<typeof upcomingExpirationsInputSchema>
				}) => {
					try {
						return await leasesService.getExpiringLeases(
							ctx.user.id,
							input?.days || 30
						)
					} catch {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to fetch upcoming expirations'
						})
					}
				}
			)
	})

export type LeasesRouter = ReturnType<typeof createLeasesRouter>
