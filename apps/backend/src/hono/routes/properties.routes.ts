import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import type { PropertiesService } from '../../properties/properties.service'
import type { StorageService } from '../../storage/storage.service'
import { requireAuth } from '../middleware/auth.middleware'
import { propertySchemas, uploadImageSchema } from '../schemas/property.schemas'
import { handleRouteError, type ApiError } from '../utils/error-handler'
import { createCrudRoutes, type CrudService, type BaseListQuery } from '../factories/crud-route.factory'


import type { PropertyType as PrismaPropertyType } from '@prisma/client'
import type { Property } from '@tenantflow/shared/types/properties'
import type { CreatePropertyInput, UpdatePropertyInput } from '@tenantflow/shared/types/api-inputs'


// Adapter to make PropertiesService compatible with CrudService interface
class PropertiesServiceAdapter implements CrudService<Property, CreatePropertyInput, UpdatePropertyInput> {
  constructor(private service: PropertiesService) {}

  async findAllByOwner(ownerId: string, query?: BaseListQuery): Promise<Property[]> {
    return this.service.findAllByOwner(ownerId, query) as Promise<Property[]>
  }

  async findById(id: string, ownerId: string): Promise<Property | null> {
    try {
      return await this.service.getPropertyById(id, ownerId) as Property
    } catch (error) {
      if ((error as Error).message?.includes('not found')) {
        return null
      }
      throw error
    }
  }

  async create(ownerId: string, data: CreatePropertyInput): Promise<Property> {
    // Convert shared PropertyType to Prisma PropertyType
    const propertyData = {
      ...data,
      propertyType: data.propertyType as PrismaPropertyType
    }
    return this.service.createProperty(propertyData, ownerId) as Promise<Property>
  }

  async update(id: string, ownerId: string, data: UpdatePropertyInput): Promise<Property> {
    // Convert shared PropertyType to Prisma PropertyType
    const propertyData = {
      ...data,
      propertyType: data.propertyType as PrismaPropertyType
    }
    return this.service.updateProperty(id, propertyData, ownerId) as Promise<Property>
  }

  async delete(id: string, ownerId: string): Promise<void> {
    await this.service.deleteProperty(id, ownerId)
  }
}

export const createPropertiesRoutes = (
  propertiesService: PropertiesService,
  storageService: StorageService,
  _authMiddleware?: unknown
) => {
  const adapter = new PropertiesServiceAdapter(propertiesService)

  return createCrudRoutes({
    service: adapter,
    schemas: propertySchemas,
    resourceName: 'Property',
    customRoutes: (app, _service) => {
      // GET /properties/stats - Get property stats
      app.get('/stats', requireAuth, async (c) => {
        const user = c.get('user')!

        try {
          const stats = await propertiesService.getStats(user.id)
          return c.json(stats)
        } catch (error) {
          return handleRouteError(error as ApiError, c)
        }
      })

      // POST /properties/:id/image - Upload property image
      app.post(
        '/:id/image',
        requireAuth,
        zValidator('param', propertySchemas.id),
        zValidator('json', uploadImageSchema),
        async (c) => {
          const user = c.get('user')!
          const { id } = c.req.valid('param')
          const { file, filename, mimeType } = c.req.valid('json')

          try {
            // Verify property ownership
            await propertiesService.findById(id, user.id)

            // Prepare file data for upload
            const fileData = Buffer.from(file, 'base64')
            const bucket = storageService.getBucket('image')
            const filePath = storageService.getStoragePath('property', id, filename)

            // Upload image
            const result = await storageService.uploadFile(bucket, filePath, fileData, {
              contentType: mimeType
            })

            // Update property with image URL
            await propertiesService.update(id, user.id, { imageUrl: result.url })

            return c.json(result)
          } catch (error) {
            const err = error as Error
            if (err.message === 'Property not found') {
              throw new HTTPException(404, { message: err.message })
            }
            if (error instanceof HTTPException) throw error
            throw new HTTPException(500, { message: err.message || "Unknown error" })
          }
        }
      )
    }
  })
}