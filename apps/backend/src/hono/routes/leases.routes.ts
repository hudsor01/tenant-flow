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
// ApiError type is handled by handleRouteError function
import { handleRouteError } from '../utils/error-handler'

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
      const query = c.req.valid('query')

      try {
        const result = await leasesService.findAllByOwner(user.id, {
          status: query.status,
          propertyId: query.propertyId,
          unitId: query.unitId,
          tenantId: query.tenantId,
          expiringDays: query.expiringDays ? parseInt(query.expiringDays) : undefined,
          limit: query.limit ? parseInt(query.limit) : undefined,
          offset: query.offset ? parseInt(query.offset) : undefined
        })

        return c.json(result)
      } catch (error) {
        return handleRouteError(error, c)
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
        const leases = await leasesService.findExpiring(
          user.id,
          expiringDays ? parseInt(expiringDays) : 30
        )
        return c.json(leases)
      } catch (error) {
        return handleRouteError(error, c)
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
        const lease = await leasesService.findOne(id, user.id)
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
        const lease = await leasesService.create(input, user.id)
        return c.json(lease, 201)
      } catch (error) {
        return handleRouteError(error, c)
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
        const lease = await leasesService.update(id, input, user.id)
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
        const lease = await leasesService.remove(id, user.id)
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
      const input = c.req.valid('json')

      try {
        const newLease = await leasesService.renew(
          id,
          {
            startDate: new Date(input.startDate),
            endDate: new Date(input.endDate),
            monthlyRent: input.monthlyRent,
            securityDeposit: input.securityDeposit,
            terms: input.terms
          },
          user.id
        )
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
      const { terminationDate, reason } = c.req.valid('json')

      try {
        const lease = await leasesService.terminate(
          id,
          {
            terminationDate: new Date(terminationDate),
            reason
          },
          user.id
        )
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