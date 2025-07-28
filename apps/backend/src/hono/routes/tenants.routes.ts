import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import type { TenantsService } from '../../tenants/tenants.service'
import type { StorageService } from '../../storage/storage.service'
import { requireAuth } from '../middleware/auth.middleware'
import {
  tenantSchemas,
  uploadDocumentSchema,
  tenantDocumentIdSchema
} from '../schemas/tenant.schemas'
import { handleRouteError } from '../utils/error-handler'
import { createCrudRoutes, type CrudService } from '../factories/crud-route.factory'
import type { CreateTenantInput, UpdateTenantInput } from '@tenantflow/shared/types/api-inputs'
import type { TenantQuery } from '@tenantflow/shared/types/queries'



// Adapter to make TenantsService compatible with CrudService interface  
class TenantsServiceAdapter implements CrudService<any, CreateTenantInput, UpdateTenantInput> {
  constructor(private service: TenantsService) {}

  async findAllByOwner(ownerId: string, query?: TenantQuery) {
    const transformedQuery = query ? {
      search: query.search,
      leaseStatus: query.leaseStatus,
      propertyId: query.propertyId,
      unitId: query.unitId,
      limit: query.limit?.toString(),
      offset: query.offset?.toString()
    } : undefined
    const results = await this.service.getTenantsByOwner(ownerId, transformedQuery)
    return results.map((tenant: any) => ({
      ...tenant,
      invitationStatus: 'PENDING' as const
    }))
  }

  async findById(id: string, ownerId: string) {
    const result = await this.service.getTenantById(id, ownerId)
    if (!result) return null
    return {
      ...result,
      invitationStatus: 'PENDING' as const
    }
  }

  async create(ownerId: string, data: CreateTenantInput) {
    // TenantsService expects (data, ownerId) but CrudService provides (ownerId, data)
    const result = await this.service.createTenant(data, ownerId)
    return {
      ...result,
      invitationStatus: 'PENDING' as const
    }
  }

  async update(id: string, ownerId: string, data: UpdateTenantInput) {
    // TenantsService expects (id, data, ownerId) but CrudService provides (id, ownerId, data)
    const result = await this.service.updateTenant(id, data, ownerId)
    return {
      ...result,
      invitationStatus: 'PENDING' as const
    }
  }

  async delete(id: string, ownerId: string) {
    const result = await this.service.deleteTenant(id, ownerId)
    return {
      ...result,
      invitationStatus: 'PENDING' as const
    }
  }
}

export const createTenantsRoutes = (
  tenantsService: TenantsService,
  storageService: StorageService
) => {
  const adapter = new TenantsServiceAdapter(tenantsService)

  return createCrudRoutes({
    service: adapter,
    schemas: tenantSchemas,
    resourceName: 'Tenant',
    customRoutes: (app, _service) => {
      // GET /tenants/stats - Get tenant stats
      app.get('/stats', requireAuth, async (c) => {
        const user = c.get('user')!

        try {
          const stats = await tenantsService.getStats(user.id)
          return c.json(stats)
        } catch (error) {
          return handleRouteError(error as any, c)
        }
      })

      // POST /tenants/:id/documents - Upload tenant document
      app.post(
        '/:id/documents',
        requireAuth,
        zValidator('param', tenantSchemas.id),
        zValidator('json', uploadDocumentSchema),
        async (c) => {
          const user = c.get('user')!
          const { id } = c.req.valid('param')
          const { file, filename, mimeType, size, documentType } = c.req.valid('json')

          try {
            // Verify tenant ownership
            await tenantsService.getTenantById(id, user.id)

            // Convert base64 to buffer
            const fileBuffer = Buffer.from(file, 'base64')

            // Upload document
            const result = await storageService.uploadTenantDocument(
              id,
              fileBuffer,
              filename,
              mimeType,
              documentType
            )

            // Store document record
            const document = await tenantsService.addDocument(id, {
              url: result.url,
              filename,
              mimeType,
              documentType,
              size
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
    }
  })
}