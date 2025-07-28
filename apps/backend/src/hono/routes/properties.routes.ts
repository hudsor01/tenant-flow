import { HTTPException } from 'hono/http-exception'
import type { PropertiesService } from '../../properties/properties.service'
import type { StorageService } from '../../storage/storage.service'
import { requireAuth } from '../middleware/auth.middleware'
import { propertySchemas, uploadImageSchema } from '../schemas/property.schemas'
import { handleRouteError, type ApiError } from '../utils/error-handler'
import { createCrudRoutes, type CrudService, type BaseListQuery } from '../factories/crud-route.factory'
import { safeValidator, safeParamValidator } from '../utils/safe-validator'


import { PropertyType as PrismaPropertyType } from '@prisma/client'
import type { Property, PropertyType as SharedPropertyType } from '@tenantflow/shared/types/properties'
import type { CreatePropertyInput, UpdatePropertyInput } from '@tenantflow/shared/types/api-inputs'
import { PROPERTY_TYPE } from '@tenantflow/shared/constants/properties'

import { z } from 'zod';

// Zod schema for Property
const propertySchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  description: z.string().nullable(),
  propertyType: z.enum(['SINGLE_FAMILY', 'MULTI_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'CONDO', 'TOWNHOUSE', 'COMMERCIAL'] as const),
  createdAt: z.date(),
  updatedAt: z.date(),
  imageUrl: z.string().nullable(),
});

// Zod schema for an array of Properties
const propertiesSchema = z.array(propertySchema);

// Adapter to make PropertiesService compatible with CrudService interface
class PropertiesServiceAdapter implements CrudService<Property, CreatePropertyInput, UpdatePropertyInput> {
  constructor(private service: PropertiesService) {}

  async findAllByOwner(ownerId: string, query?: BaseListQuery): Promise<Property[]> {
    const properties = await this.service.findAllByOwner(ownerId, query);
    return propertiesSchema.parse(properties);
  }

  async findById(id: string, ownerId: string): Promise<Property | null> {
    try {
      const property = await this.service.getPropertyById(id, ownerId);
      if (!property) return null;
      return propertySchema.parse(property);
    } catch (error) {
      if (error instanceof Error && error.message?.includes('not found')) {
        return null
      }
      throw error
    }
  }

  async create(ownerId: string, data: CreatePropertyInput): Promise<Property> {
    // Map shared PropertyType to Prisma PropertyType if needed
    const propertyData = {
      ...data,
      propertyType: data.propertyType ? this.mapToPrismaPropertyType(data.propertyType) : undefined
    }
    const property = await this.service.createProperty(propertyData, ownerId);
    return propertySchema.parse(property);
  }

  async update(id: string, ownerId: string, data: UpdatePropertyInput): Promise<Property> {
    // Map shared PropertyType to Prisma PropertyType if needed
    const { propertyType, ...restData } = data
    const updateData = {
      ...restData,
      ...(propertyType && { propertyType: this.mapToPrismaPropertyType(propertyType) })
    }
    const property = await this.service.updateProperty(id, updateData, ownerId);
    return propertySchema.parse(property);
  }

  private mapToPrismaPropertyType(sharedType: SharedPropertyType): PrismaPropertyType {
    // Map shared types to Prisma types
    const typeMap: Record<SharedPropertyType, PrismaPropertyType> = {
      'SINGLE_FAMILY': PrismaPropertyType.SINGLE_FAMILY,
      'MULTI_FAMILY': PrismaPropertyType.MULTI_UNIT, // Map MULTI_FAMILY to MULTI_UNIT
      'MULTI_UNIT': PrismaPropertyType.MULTI_UNIT,
      'APARTMENT': PrismaPropertyType.APARTMENT,
      'CONDO': PrismaPropertyType.APARTMENT, // Map CONDO to APARTMENT
      'TOWNHOUSE': PrismaPropertyType.SINGLE_FAMILY, // Map TOWNHOUSE to SINGLE_FAMILY
      'COMMERCIAL': PrismaPropertyType.COMMERCIAL
    }
    return typeMap[sharedType] || PrismaPropertyType.SINGLE_FAMILY
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
          return handleRouteError(
            error instanceof Error ? error : new Error('Unknown error'), 
            c,
            {
              operation: 'getPropertyStats',
              resource: 'properties',
              userId: user.id
            }
          )
        }
      })

      // POST /properties/:id/image - Upload property image
      app.post(
        '/:id/image',
        requireAuth,
        safeParamValidator(propertySchemas.id),
        safeValidator(uploadImageSchema),
        async (c) => {
          const user = c.get('user')!
          const paramData = c.req.valid('param' as never) as { id: string }
          const jsonData = c.req.valid('json' as never) as { file: string; filename: string; mimeType: string }
          const { id } = paramData
          const { file, filename, mimeType } = jsonData

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
            if (error instanceof Error && error.message === 'Property not found') {
              throw new HTTPException(404, { message: error.message })
            }
            if (error instanceof HTTPException) throw error
            throw new HTTPException(500, { 
              message: `Failed to upload image for property ${id}: ${error instanceof Error ? error.message : "Unknown error"}`,
              cause: {
                operation: 'uploadPropertyImage',
                propertyId: id,
                userId: user.id,
                timestamp: new Date().toISOString()
              }
            })
          }
        }
      )
    }
  })
}