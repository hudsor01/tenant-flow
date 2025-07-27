import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import type { UnitsService } from '../../units/units.service'
import { authMiddleware, requireAuth, type Variables } from '../middleware/auth.middleware'
import {
  unitListQuerySchema,
  createUnitSchema,
  updateUnitSchema,
  unitIdSchema,
  assignTenantSchema,
  unitPropertyIdSchema
} from '../schemas/unit.schemas'
// ApiError type is handled by handleRouteError function
import { handleRouteError } from '../utils/error-handler'

export const createUnitsRoutes = (
  unitsService: UnitsService
) => {
  const app = new Hono<{ Variables: Variables }>()

  // Apply auth middleware to all routes
  app.use('*', authMiddleware)

  // GET /units - List units
  app.get(
    '/',
    requireAuth,
    zValidator('query', unitListQuerySchema),
    async (c) => {
      const user = c.get('user')!
      const query = c.req.valid('query')

      try {
        const result = await unitsService.findAllByOwner(user.id, {
          propertyId: query.propertyId,
          status: query.status,
          search: query.search,
          limit: query.limit ? parseInt(query.limit) : undefined,
          offset: query.offset ? parseInt(query.offset) : undefined
        })

        return c.json(result)
      } catch (error) {
        return handleRouteError(error, c)
      }
    }
  )

  // GET /units/by-property/:propertyId - Get units by property
  app.get(
    '/by-property/:propertyId',
    requireAuth,
    zValidator('param', unitPropertyIdSchema),
    async (c) => {
      const user = c.get('user')!
      const { propertyId } = c.req.valid('param')

      try {
        const units = await unitsService.findByProperty(propertyId, user.id)
        return c.json(units)
      } catch (error) {
        return handleRouteError(error, c)
      }
    }
  )

  // GET /units/:id - Get unit by ID
  app.get(
    '/:id',
    requireAuth,
    zValidator('param', unitIdSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')

      try {
        const unit = await unitsService.findOne(id, user.id)
        return c.json(unit)
      } catch (error) {
        if (error instanceof Error && error.message === 'Unit not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // POST /units - Create unit
  app.post(
    '/',
    requireAuth,
    zValidator('json', createUnitSchema),
    async (c) => {
      const user = c.get('user')!
      const input = c.req.valid('json')

      try {
        const unit = await unitsService.create(input, user.id)
        return c.json(unit, 201)
      } catch (error) {
        return handleRouteError(error, c)
      }
    }
  )

  // PUT /units/:id - Update unit
  app.put(
    '/:id',
    requireAuth,
    zValidator('param', unitIdSchema),
    zValidator('json', updateUnitSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')

      try {
        const unit = await unitsService.update(id, input, user.id)
        return c.json(unit)
      } catch (error) {
        if (error instanceof Error && error.message === 'Unit not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // DELETE /units/:id - Delete unit
  app.delete(
    '/:id',
    requireAuth,
    zValidator('param', unitIdSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')

      try {
        const unit = await unitsService.remove(id, user.id)
        return c.json(unit)
      } catch (error) {
        if (error instanceof Error && error.message === 'Unit not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // POST /units/:id/assign-tenant - Assign tenant to unit
  app.post(
    '/:id/assign-tenant',
    requireAuth,
    zValidator('param', unitIdSchema),
    zValidator('json', assignTenantSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')
      const { tenantId } = c.req.valid('json')

      try {
        const unit = await unitsService.assignTenant(id, tenantId, user.id)
        return c.json(unit)
      } catch (error) {
        if (error instanceof Error && (error.message === 'Unit not found' || error.message === 'Tenant not found')) {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // POST /units/:id/remove-tenant - Remove tenant from unit
  app.post(
    '/:id/remove-tenant',
    requireAuth,
    zValidator('param', unitIdSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')

      try {
        const unit = await unitsService.removeTenant(id, user.id)
        return c.json(unit)
      } catch (error) {
        if (error instanceof Error && error.message === 'Unit not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  return app
}