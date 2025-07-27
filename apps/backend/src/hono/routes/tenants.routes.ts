import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import type { TenantsService } from '../../tenants/tenants.service'
import type { StorageService } from '../../storage/storage.service'
import { authMiddleware, requireAuth, type Variables } from '../middleware/auth.middleware'
import {
  tenantListQuerySchema,
  createTenantSchema,
  updateTenantSchema,
  tenantIdSchema,
  uploadDocumentSchema,
  tenantDocumentIdSchema
} from '../schemas/tenant.schemas'
// ApiError type is handled by handleRouteError function
import { handleRouteError } from '../utils/error-handler'

export const createTenantsRoutes = (
  tenantsService: TenantsService,
  storageService: StorageService
) => {
  const app = new Hono<{ Variables: Variables }>()

  // Apply auth middleware to all routes
  app.use('*', authMiddleware)

  // GET /tenants - List tenants
  app.get(
    '/',
    requireAuth,
    zValidator('query', tenantListQuerySchema),
    async (c) => {
      const user = c.get('user')!
      const query = c.req.valid('query')

      try {
        const result = await tenantsService.findAllByOwner(user.id, {
          status: query.status,
          search: query.search,
          propertyId: query.propertyId,
          unitId: query.unitId,
          limit: query.limit ? parseInt(query.limit) : undefined,
          offset: query.offset ? parseInt(query.offset) : undefined
        })

        return c.json(result)
      } catch (error) {
        return handleRouteError(error, c)
      }
    }
  )

  // GET /tenants/stats - Get tenant stats
  app.get('/stats', requireAuth, async (c) => {
    const user = c.get('user')!

    try {
      const stats = await tenantsService.getStats(user.id)
      return c.json(stats)
    } catch (error) {
      return handleRouteError(error, c)
    }
  })

  // GET /tenants/:id - Get tenant by ID
  app.get(
    '/:id',
    requireAuth,
    zValidator('param', tenantIdSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')

      try {
        const tenant = await tenantsService.findOne(id, user.id)
        return c.json(tenant)
      } catch (error) {
        if (error instanceof Error && error.message === 'Tenant not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // POST /tenants - Create tenant
  app.post(
    '/',
    requireAuth,
    zValidator('json', createTenantSchema),
    async (c) => {
      const user = c.get('user')!
      const input = c.req.valid('json')

      try {
        const tenant = await tenantsService.create(input, user.id)
        return c.json(tenant, 201)
      } catch (error) {
        return handleRouteError(error, c)
      }
    }
  )

  // PUT /tenants/:id - Update tenant
  app.put(
    '/:id',
    requireAuth,
    zValidator('param', tenantIdSchema),
    zValidator('json', updateTenantSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')

      try {
        const tenant = await tenantsService.update(id, input, user.id)
        return c.json(tenant)
      } catch (error) {
        if (error instanceof Error && error.message === 'Tenant not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // DELETE /tenants/:id - Delete tenant
  app.delete(
    '/:id',
    requireAuth,
    zValidator('param', tenantIdSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')

      try {
        const tenant = await tenantsService.remove(id, user.id)
        return c.json(tenant)
      } catch (error) {
        if (error instanceof Error && error.message === 'Tenant not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // POST /tenants/:id/documents - Upload tenant document
  app.post(
    '/:id/documents',
    requireAuth,
    zValidator('param', tenantIdSchema),
    zValidator('json', uploadDocumentSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')
      const { file, documentType } = c.req.valid('json')

      try {
        // Verify tenant ownership
        await tenantsService.findOne(id, user.id)

        // Upload document
        const result = await storageService.uploadTenantDocument(
          id,
          file.data,
          file.filename,
          file.mimeType,
          documentType
        )

        // Store document record
        const document = await tenantsService.addDocument(id, {
          url: result.url,
          filename: file.filename,
          mimeType: file.mimeType,
          documentType,
          size: file.data.length
        }, user.id)

        return c.json(document)
      } catch (error) {
        if (error instanceof Error && error.message === 'Tenant not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // DELETE /tenants/:id/documents/:documentId - Delete tenant document
  app.delete(
    '/:id/documents/:documentId',
    requireAuth,
    zValidator('param', tenantDocumentIdSchema),
    async (c) => {
      const user = c.get('user')!
      const { id, documentId } = c.req.valid('param')

      try {
        const result = await tenantsService.removeDocument(id, documentId, user.id)
        return c.json(result)
      } catch (error) {
        if (error instanceof Error && (error.message === 'Tenant not found' || error.message === 'Document not found')) {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  return app
}