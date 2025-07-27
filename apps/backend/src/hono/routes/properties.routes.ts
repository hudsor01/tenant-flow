import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import type { PropertiesService } from '../../properties/properties.service'
import type { StorageService } from '../../storage/storage.service'
import { authMiddleware, requireAuth, type Variables } from '../middleware/auth.middleware'
import {
  propertyListQuerySchema,
  createPropertySchema,
  updatePropertySchema,
  propertyIdSchema,
  uploadImageSchema
} from '../schemas/property.schemas'
// ApiError type is handled by handleRouteError function
import { handleRouteError } from '../utils/error-handler'

export const createPropertiesRoutes = (
  propertiesService: PropertiesService,
  storageService: StorageService
) => {
  const app = new Hono<{ Variables: Variables }>()

  // Apply auth middleware to all routes
  app.use('*', authMiddleware)

  // GET /properties - List properties
  app.get(
    '/',
    requireAuth,
    zValidator('query', propertyListQuerySchema),
    async (c) => {
      const user = c.get('user')!
      const query = c.req.valid('query')

      try {
        const result = await propertiesService.findAllByOwner(user.id, {
          status: query.status,
          search: query.search,
          propertyType: query.propertyType,
          limit: query.limit ? parseInt(query.limit) : undefined,
          offset: query.offset ? parseInt(query.offset) : undefined
        })

        return c.json(result)
      } catch (error) {
        return handleRouteError(error, c)
      }
    }
  )

  // GET /properties/stats - Get property stats
  app.get('/stats', requireAuth, async (c) => {
    const user = c.get('user')!

    try {
      const stats = await propertiesService.getStats(user.id)
      return c.json(stats)
    } catch (error) {
      return handleRouteError(error, c)
    }
  })

  // GET /properties/:id - Get property by ID
  app.get(
    '/:id',
    requireAuth,
    zValidator('param', propertyIdSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')

      try {
        const property = await propertiesService.findOne(id, user.id)
        return c.json(property)
      } catch (error) {
        if (error.message === 'Property not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // POST /properties - Create property
  app.post(
    '/',
    requireAuth,
    zValidator('json', createPropertySchema),
    async (c) => {
      const user = c.get('user')!
      const input = c.req.valid('json')

      try {
        const property = await propertiesService.create(input, user.id)
        return c.json(property, 201)
      } catch (error) {
        return handleRouteError(error, c)
      }
    }
  )

  // PUT /properties/:id - Update property
  app.put(
    '/:id',
    requireAuth,
    zValidator('param', propertyIdSchema),
    zValidator('json', updatePropertySchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')

      try {
        const property = await propertiesService.update(id, input, user.id)
        return c.json(property)
      } catch (error) {
        if (error.message === 'Property not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // DELETE /properties/:id - Delete property
  app.delete(
    '/:id',
    requireAuth,
    zValidator('param', propertyIdSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')

      try {
        const property = await propertiesService.remove(id, user.id)
        return c.json(property)
      } catch (error) {
        if (error.message === 'Property not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // POST /properties/:id/image - Upload property image
  app.post(
    '/:id/image',
    requireAuth,
    zValidator('param', propertyIdSchema),
    zValidator('json', uploadImageSchema),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')
      const { file } = c.req.valid('json')

      try {
        // Verify property ownership
        await propertiesService.findOne(id, user.id)

        // Upload image
        const result = await storageService.uploadPropertyImage(
          id,
          file.data,
          file.filename,
          file.mimeType
        )

        // Update property with image URL
        await propertiesService.update(id, { imageUrl: result.url }, user.id)

        return c.json(result)
      } catch (error) {
        if (error.message === 'Property not found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  return app
}