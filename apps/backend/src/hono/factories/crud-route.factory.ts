import { Hono } from 'hono'
import type { Context } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import type { z } from 'zod'
import { requireAuth, type Variables } from '../middleware/auth.middleware'
import { handleRouteError, type ApiError } from '../utils/error-handler'
import type { CrudSchemas } from '../schemas/common.schemas'

// Base query type for list operations
export interface BaseListQuery {
  page?: number
  limit?: number
  offset?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: unknown // Allow additional filter properties
}

// Paginated response type
export interface PaginatedResponse<T> {
  items: T[]
  total: number
}

/**
 * Base service interface that all services must implement
 * to be compatible with the CRUD route factory
 */
export interface CrudService<T, TCreateData, TUpdateData> {
  findAllByOwner(ownerId: string, query?: BaseListQuery): Promise<T[] | PaginatedResponse<T>>
  findById(id: string, ownerId: string): Promise<T | null>
  create(ownerId: string, data: TCreateData): Promise<T>
  update(id: string, ownerId: string, data: TUpdateData): Promise<T>
  delete(id: string, ownerId: string): Promise<T | void>
}

/**
 * Configuration for CRUD route factory
 */
export interface CrudRouteConfig<T, TCreateData = unknown, TUpdateData = unknown> {
  service: CrudService<T, TCreateData, TUpdateData>
  schemas: CrudSchemas<z.ZodObject<z.ZodRawShape>, z.ZodObject<z.ZodRawShape>, z.ZodObject<z.ZodRawShape>>
  resourceName: string
  middleware?: ((c: Context, next: () => Promise<void>) => Promise<void>)[]
  customRoutes?: (app: Hono<{ Variables: Variables }>, service: CrudService<T, TCreateData, TUpdateData>) => void
  listTransform?: (items: T[]) => unknown
  detailTransform?: (item: T) => unknown
}

/**
 * Factory function to create standard CRUD routes
 * Reduces boilerplate and ensures consistency across all resources
 */
export function createCrudRoutes<T, TCreateData = unknown, TUpdateData = unknown>(
  config: CrudRouteConfig<T, TCreateData, TUpdateData>
) {
  const {
    service,
    schemas,
    resourceName,
    middleware = [],
    customRoutes,
    listTransform,
    detailTransform
  } = config

  const app = new Hono<{ Variables: Variables }>()

  // Auth middleware will be applied per route via requireAuth

  // Apply any additional middleware
  if (middleware.length > 0) {
    app.use('*', ...middleware)
  }

  // GET / - List resources
  app.get(
    '/',
    requireAuth,
    zValidator('query', schemas.list),
    async (c) => {
      const user = c.get('user')!
      const query = c.req.valid('query')

      try {
        const result = await service.findAllByOwner(user.id, query)
        
        // Apply transformation if provided
        if (listTransform) {
          const transformed = listTransform(Array.isArray(result) ? result : result.items);
          return c.json(transformed as any);
        }
        
        return c.json(result as any);
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // GET /:id - Get single resource
  app.get(
    '/:id',
    requireAuth,
    zValidator('param', schemas.id),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')

      try {
        const resource = await service.findById(id, user.id)
        
        if (!resource) {
          throw new HTTPException(404, {
            message: `${resourceName} not found`
          })
        }
        
        // Apply transformation if provided
        if (detailTransform) {
          const transformed = detailTransform(resource);
          return c.json(transformed as any);
        }
        
        return c.json(resource as any);
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // POST / - Create resource
  app.post(
    '/',
    requireAuth,
    zValidator('json', schemas.create),
    async (c) => {
      const user = c.get('user')!
      const data = c.req.valid('json')

      try {
        const resource = await service.create(user.id, data as TCreateData)
        
        // Apply transformation if provided
        if (detailTransform) {
          const transformed = detailTransform(resource);
          return c.json(transformed as any, 201);
        }
        
        return c.json(resource as any, 201);
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // PUT /:id - Update resource
  app.put(
    '/:id',
    requireAuth,
    zValidator('param', schemas.id),
    zValidator('json', schemas.update),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')
      const data = c.req.valid('json')

      try {
        const resource = await service.update(id, user.id, data as TUpdateData)
        
        // Apply transformation if provided
        if (detailTransform) {
          const transformed = detailTransform(resource);
          return c.json(transformed as any);
        }
        
        return c.json(resource as any);
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // DELETE /:id - Delete resource
  app.delete(
    '/:id',
    requireAuth,
    zValidator('param', schemas.id),
    async (c) => {
      const user = c.get('user')!
      const { id } = c.req.valid('param')

      try {
        await service.delete(id, user.id)
        // 204 No Content should not have a body
        return c.body(null, 204)
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // Add custom routes if provided
  if (customRoutes) {
    customRoutes(app, service)
  }

  return app
}

/**
 * Helper to create a batch operation route
 */
export function addBatchRoute<T, TBatchData = unknown>(
  app: Hono<{ Variables: Variables }>,
  path: string,
  schema: z.ZodSchema<TBatchData>,
  handler: (userId: string, data: TBatchData) => Promise<T>
) {
  app.post(
    path,
    requireAuth,
    zValidator('json', schema),
    async (c) => {
      const user = c.get('user')!
      const data = c.req.valid('json')

      try {
        const result = await handler(user.id, data)
        return c.json(result as any, 201)
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )
}

/**
 * Helper to create a nested resource route
 */
export function addNestedRoute<T, TParams = unknown, TQuery = unknown>(
  app: Hono<{ Variables: Variables }>,
  config: {
    path: string
    paramSchema: z.ZodSchema<TParams>
    querySchema?: z.ZodSchema<TQuery>
    handler: (userId: string, params: TParams, query?: TQuery) => Promise<T>
    transform?: (data: T) => unknown
  }
) {
  const validators: any[] = [
    requireAuth,
    zValidator('param', config.paramSchema)
  ]
  
  if (config.querySchema) {
    validators.push(zValidator('query', config.querySchema))
  }

  app.get(config.path, ...validators, async (c) => {
    const user = c.get('user')!
    const params = c.req.valid('param' as never)
    const query = config.querySchema ? c.req.valid('query' as never) : undefined

    try {
      const result = await config.handler(user.id, params as TParams, query as TQuery)
      
      if (config.transform) {
        const transformed = config.transform(result);
        return c.json(transformed as any);
      }
      
      return c.json(result as any);
    } catch (error) {
      return handleRouteError(error as ApiError, c)
    }
  })
}