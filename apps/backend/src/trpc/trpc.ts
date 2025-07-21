import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import type { Context } from './context/app.context'

// Simple in-memory rate limiter (for production, use Redis)
interface RateLimitEntry {
	count: number
	resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
	const now = Date.now()
	for (const [key, entry] of rateLimitStore.entries()) {
		if (now > entry.resetTime) {
			rateLimitStore.delete(key)
		}
	}
}, 5 * 60 * 1000)

const t = initTRPC.context<Context>().create({
	transformer: superjson,
	errorFormatter: ({ shape, error }) => {
		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.code === 'BAD_REQUEST' &&
					error.cause instanceof ZodError
						? error.cause.flatten()
						: null
			}
		}
	}
})

export const router = t.router
export const createRouter = t.router
export const publicProcedure = t.procedure

// Rate limiting middleware factory
function createRateLimit(options: { max: number; windowMs: number; keyGenerator?: (ctx: Context) => string }) {
	return t.middleware(({ ctx, next }) => {
		const key = options.keyGenerator ? options.keyGenerator(ctx) : ctx.req?.ip || 'anonymous'
		const now = Date.now()
		const resetTime = now + options.windowMs
		
		const entry = rateLimitStore.get(key)
		
		if (!entry || now > entry.resetTime) {
			// New window or expired entry
			rateLimitStore.set(key, { count: 1, resetTime })
		} else {
			// Existing window
			if (entry.count >= options.max) {
				throw new TRPCError({
					code: 'TOO_MANY_REQUESTS',
					message: 'Rate limit exceeded. Please try again later.'
				})
			}
			entry.count++
		}
		
		return next({ ctx })
	})
}

// Different rate limits for different operations
const authRateLimit = createRateLimit({ max: 5, windowMs: 15 * 60 * 1000 }) // 5 requests per 15 minutes
const readRateLimit = createRateLimit({ max: 100, windowMs: 60 * 1000 }) // 100 requests per minute  
const writeRateLimit = createRateLimit({ max: 30, windowMs: 60 * 1000 }) // 30 requests per minute
const fileUploadRateLimit = createRateLimit({ max: 10, windowMs: 60 * 1000 }) // 10 uploads per minute
const userSpecificRateLimit = createRateLimit({ 
	max: 60, 
	windowMs: 60 * 1000,
	keyGenerator: (ctx) => ctx.user?.id || ctx.req?.ip || 'anonymous'
}) // 60 requests per minute per user

// Auth middleware
const isAuthenticated = t.middleware(({ ctx, next }) => {
	if (!ctx.user) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
			message:
				'Authentication required. Please log in to access this resource.'
		})
	}
	return next({
		ctx: {
			...ctx,
			user: ctx.user
		}
	})
})

// Tenant ownership validation middleware - validates actual tenant ownership
const isTenantOwner = t.middleware(async ({ ctx, next, input }) => {
	if (!ctx.user) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
			message: 'Authentication required.'
		})
	}

	// For procedures that include tenantId in input, validate ownership
	if (input && typeof input === 'object' && 'tenantId' in input) {
		const tenantId = (input as { tenantId: string }).tenantId
		
		if (!tenantId || typeof tenantId !== 'string') {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Invalid tenant ID provided.'
			})
		}

		// Validate tenant ownership through database query
		const tenant = await ctx.prisma.tenant.findFirst({
			where: {
				id: tenantId,
				Lease: {
					some: {
						Unit: {
							Property: {
								ownerId: ctx.user.id
							}
						}
					}
				}
			}
		})

		if (!tenant) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'Access denied. Tenant not found or unauthorized.'
			})
		}
	}

	return next({
		ctx: {
			...ctx,
			user: ctx.user
		}
	})
})

// Base procedures with authentication
export const protectedProcedure = publicProcedure.use(isAuthenticated)
export const tenantProcedure = publicProcedure
	.use(isAuthenticated)
	.use(isTenantOwner)

// Rate-limited procedures for different operations
export const authProcedure = publicProcedure.use(authRateLimit)
export const readProcedure = protectedProcedure.use(readRateLimit).use(userSpecificRateLimit)
export const writeProcedure = protectedProcedure.use(writeRateLimit).use(userSpecificRateLimit)
export const fileUploadProcedure = protectedProcedure.use(fileUploadRateLimit).use(userSpecificRateLimit)

// Tenant-specific rate-limited procedures
export const tenantReadProcedure = tenantProcedure.use(readRateLimit).use(userSpecificRateLimit)
export const tenantWriteProcedure = tenantProcedure.use(writeRateLimit).use(userSpecificRateLimit)
