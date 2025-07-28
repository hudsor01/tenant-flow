import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import type { MaintenanceService } from '../../maintenance/maintenance.service'
import type { CreateMaintenanceInput } from '@tenantflow/shared/types/api-inputs'
import { authMiddleware, requireAuth, type Variables } from '../middleware/auth.middleware'
import {
  maintenanceListQuerySchema,
  createMaintenanceRequestSchema,
  updateMaintenanceRequestSchema,
  maintenanceIdSchema,
  updateMaintenanceStatusSchema,
  addMaintenanceNoteSchema
} from '../schemas/maintenance.schemas'
import { handleRouteError, type ApiError } from '../utils/error-handler'

export const createMaintenanceRoutes = (
  maintenanceService: MaintenanceService
) => {
  const app = new Hono<{ Variables: Variables }>()

  // Apply auth middleware to all routes
  app.use('*', authMiddleware)

  // GET /maintenance - List maintenance requests
  app.get(
    '/',
    requireAuth,
    zValidator('query', maintenanceListQuerySchema),
    async (c) => {
      const user = c.get('user')!
      const query = c.req.valid('query')

      try {
        const result = await maintenanceService.findAllByOwner(user.id, {
          status: query.status,
          priority: query.priority,
          propertyId: query.propertyId,
          unitId: query.unitId,
          search: query.search,
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
          limit: query.limit ? parseInt(query.limit) : undefined,
          offset: query.offset ? parseInt(query.offset) : undefined
        })

        return c.json(result)
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // GET /maintenance/stats - Get maintenance stats
  app.get('/stats', requireAuth, async (c) => {
    const user = c.get('user')!

    try {
      const stats = await maintenanceService.getStats(user.id)
      return c.json(stats)
    } catch (error) {
      return handleRouteError(error as ApiError, c)
    }
  })

  // GET /maintenance/:id - Get maintenance request by ID
  app.get(
    '/:id',
    requireAuth,
    zValidator('param', maintenanceIdSchema),
    async (c) => {
      const _user = c.get('user')!
      const { id } = c.req.valid('param')

      try {
        const request = await maintenanceService.findOne(id)
        return c.json(request)
      } catch (error) {
        if (error instanceof Error && error.message === 'Maintenance request not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // POST /maintenance - Create maintenance request
  app.post(
    '/',
    requireAuth,
    zValidator('json', createMaintenanceRequestSchema),
    async (c) => {
      const _user = c.get('user')!
      const input = c.req.valid('json')

      try {
        // Validate required fields
        if (!input.unitId) {
          throw new HTTPException(400, { message: 'unitId is required' })
        }

        const request = await maintenanceService.create(input as CreateMaintenanceInput)
        return c.json(request, 201)
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // PUT /maintenance/:id - Update maintenance request
  app.put(
    '/:id',
    requireAuth,
    zValidator('param', maintenanceIdSchema),
    zValidator('json', updateMaintenanceRequestSchema),
    async (c) => {
      const _user = c.get('user')!
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')

      try {
        const request = await maintenanceService.update(id, { ...input, id })
        return c.json(request)
      } catch (error) {
        if (error instanceof Error && error.message === 'Maintenance request not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // DELETE /maintenance/:id - Delete maintenance request
  app.delete(
    '/:id',
    requireAuth,
    zValidator('param', maintenanceIdSchema),
    async (c) => {
      const _user = c.get('user')!
      const { id } = c.req.valid('param')

      try {
        const request = await maintenanceService.remove(id)
        return c.json(request)
      } catch (error) {
        if (error instanceof Error && error.message === 'Maintenance request not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // PATCH /maintenance/:id/status - Update maintenance status
  app.patch(
    '/:id/status',
    requireAuth,
    zValidator('param', maintenanceIdSchema),
    zValidator('json', updateMaintenanceStatusSchema),
    async (c) => {
      const _user = c.get('user')!
      const { id } = c.req.valid('param')
      const { status, assignedTo, completedAt, estimatedCost } = c.req.valid('json')

      try {
        const request = await maintenanceService.update(id, {
          id,
          status,
          assignedTo,
          completedAt,
          estimatedCost
        })
        return c.json(request)
      } catch (error) {
        if (error instanceof Error && error.message === 'Maintenance request not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // POST /maintenance/:id/notes - Add note to maintenance request
  app.post(
    '/:id/notes',
    requireAuth,
    zValidator('param', maintenanceIdSchema),
    zValidator('json', addMaintenanceNoteSchema),
    async (c) => {
      const _user = c.get('user')!
      const { id } = c.req.valid('param')
      const { note: _note, isInternal: _isInternal } = c.req.valid('json')

      try {
        // TODO: Implement addNote functionality in MaintenanceService
        // For now, returning a placeholder response
        const maintenanceRequest = await maintenanceService.findOne(id)
        if (!maintenanceRequest) {
          throw new HTTPException(404, { message: 'Maintenance request not found' })
        }
        
        // Placeholder response - should be replaced with proper note handling
        return c.json({ 
          ...maintenanceRequest,
          message: 'Note functionality not yet implemented'
        })
      } catch (error) {
        if (error instanceof Error && error.message === 'Maintenance request not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  return app
}