import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import type { LeasesService } from '../../leases/leases.service'
import { authMiddleware, requireAuth, type Variables } from '../middleware/auth.middleware'
import {
  leaseListQuerySchema,
  createLeaseSchema,
  updateLeaseSchema,
  leaseIdSchema,
  renewLeaseSchema,
  terminateLeaseSchema
} from '../schemas/lease.schemas'
import { handleRouteError, type ApiError } from '../utils/error-handler'

export const createLeasesRoutes = (
  leasesService: LeasesService
) => {
  const app = new Hono<{ Variables: Variables }>()

  // Apply auth middleware to all routes
  app.use('*', authMiddleware)

  // GET /leases - List leases
  app.get(
    '/',
    requireAuth,
    zValidator('query', leaseListQuerySchema),
    async (c) => {
      const user = c.get('user')!
      const _query = c.req.valid('query')

      try {
        const result = await leasesService.getLeasesByOwner(user.id)

        return c.json(result)
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // GET /leases/expiring - Get expiring leases
  app.get(
    '/expiring',
    requireAuth,
    zValidator('query', leaseListQuerySchema.pick({ expiringDays: true })),
    async (c) => {
      const user = c.get('user')!
      const { expiringDays } = c.req.valid('query')

      try {
        const leases = await leasesService.getExpiringLeases(
          user.id,
          expiringDays ? parseInt(expiringDays) : 30
        )
        return c.json(leases)
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // GET /leases/:id - Get lease by ID
  app.get(
    '/:id',
    requireAuth,
    zValidator('param', leaseIdSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')

      try {
        const lease = await leasesService.getLeaseById(id, user.id)
        return c.json(lease)
      } catch (error) {
        if (error instanceof Error && error.message === 'Lease not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // POST /leases - Create lease
  app.post(
    '/',
    requireAuth,
    zValidator('json', createLeaseSchema),
    async (c) => {
      const user = c.get('user')!
      const input = c.req.valid('json')

      try {
        // Transform monthlyRent to rentAmount for service compatibility
        const leaseData = {
          ...input,
          rentAmount: input.monthlyRent
        }
        const lease = await leasesService.createLease(user.id, leaseData)
        return c.json(lease, 201)
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // PUT /leases/:id - Update lease
  app.put(
    '/:id',
    requireAuth,
    zValidator('param', leaseIdSchema),
    zValidator('json', updateLeaseSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')

      try {
        const lease = await leasesService.updateLease(id, user.id, input)
        return c.json(lease)
      } catch (error) {
        if (error instanceof Error && error.message === 'Lease not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // DELETE /leases/:id - Delete lease
  app.delete(
    '/:id',
    requireAuth,
    zValidator('param', leaseIdSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')

      try {
        const lease = await leasesService.deleteLease(id, user.id)
        return c.json(lease)
      } catch (error) {
        if (error instanceof Error && error.message === 'Lease not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // POST /leases/:id/renew - Renew lease
  app.post(
    '/:id/renew',
    requireAuth,
    zValidator('param', leaseIdSchema),
    zValidator('json', renewLeaseSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')
      const _input = c.req.valid('json')

      try {
        // TODO: Implement renew functionality in LeasesService
        // For now, returning a placeholder response
        const existingLease = await leasesService.getLeaseById(id, user.id)
        if (!existingLease) {
          throw new HTTPException(404, { message: 'Lease not found' })
        }
        
        // Placeholder response - should be replaced with proper renewal logic
        const newLease = {
          ...existingLease,
          message: 'Lease renewal functionality not yet implemented'
        }
        return c.json(newLease)
      } catch (error) {
        if (error instanceof Error && error.message === 'Lease not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // POST /leases/:id/terminate - Terminate lease
  app.post(
    '/:id/terminate',
    requireAuth,
    zValidator('param', leaseIdSchema),
    zValidator('json', terminateLeaseSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')
      const { effectiveDate: _effectiveDate, reason: _reason } = c.req.valid('json')

      try {
        // TODO: Implement terminate functionality in LeasesService
        // For now, returning a placeholder response
        const existingLease = await leasesService.getLeaseById(id, user.id)
        if (!existingLease) {
          throw new HTTPException(404, { message: 'Lease not found' })
        }
        
        // Placeholder response - should be replaced with proper termination logic
        const lease = {
          ...existingLease,
          message: 'Lease termination functionality not yet implemented'
        }
        return c.json(lease)
      } catch (error) {
        if (error instanceof Error && error.message === 'Lease not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  return app
}