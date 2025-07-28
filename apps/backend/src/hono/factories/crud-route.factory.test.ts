import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import {
  createCrudRoutes,
  addBatchRoute,
  addNestedRoute,
  type CrudService,
  type CrudRouteConfig,
  type BaseListQuery,
  type PaginatedResponse
} from './crud-route.factory'

// Mock dependencies
vi.mock('../middleware/auth.middleware', () => ({
  authMiddleware: vi.fn(async (c: Context, next: () => Promise<void>) => {
    // Mock authenticated user
    c.set('user', { id: 'user-123', email: 'test@test.com' })
    await next()
  }),
  requireAuth: vi.fn(async (c: Context, next: () => Promise<void>) => {
    const user = c.get('user')
    if (!user) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }
    await next()
  })
}))

vi.mock('../utils/error-handler', () => ({
  handleRouteError: vi.fn((error: unknown, c: Context) => {
    if (error instanceof HTTPException) {
      return c.json({ error: error.message }, error.status)
    }
    return c.json({ error: 'Internal server error' }, 500)
  })
}))

// Test types
interface TestResource {
  id: string
  name: string
  description?: string
  ownerId: string
  createdAt: string
}

interface TestCreateData {
  name: string
  description?: string
}

interface TestUpdateData {
  name?: string
  description?: string
}

describe('CRUD Route Factory', () => {
  let mockService: CrudService<TestResource, TestCreateData, TestUpdateData>
  let mockSchemas: any
  let testApp: Hono

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock service
    mockService = {
      findAllByOwner: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }

    // Mock schemas
    mockSchemas = {
      list: z.object({
        page: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
        limit: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
        search: z.string().optional()
      }),
      id: z.object({
        id: z.string().uuid()
      }),
      create: z.object({
        name: z.string().min(1),
        description: z.string().optional()
      }),
      update: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional()
      })
    }
  })

  describe('createCrudRoutes', () => {
    it('should create a Hono app with CRUD routes', () => {
      const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
        service: mockService,
        schemas: mockSchemas,
        resourceName: 'TestResource'
      }

      const app = createCrudRoutes(config)

      expect(app).toBeInstanceOf(Hono)
    })

    describe('GET / (list resources)', () => {
      it('should return list of resources for authenticated user', async () => {
        const mockResources: TestResource[] = [
          {
            id: '1',
            name: 'Test 1',
            ownerId: 'user-123',
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            id: '2',
            name: 'Test 2',
            ownerId: 'user-123',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]

        mockService.findAllByOwner = vi.fn().mockResolvedValue(mockResources)

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource'
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/?page=1&limit=10')
        const res = await app.request(req)

        expect(res.status).toBe(200)
        expect(mockService.findAllByOwner).toHaveBeenCalledWith('user-123', {
          page: 1,
          limit: 10
        })

        const data = await res.json()
        expect(data).toEqual(mockResources)
      })

      it('should handle paginated response from service', async () => {
        const mockPaginatedResponse: PaginatedResponse<TestResource> = {
          items: [
            {
              id: '1',
              name: 'Test 1',
              ownerId: 'user-123',
              createdAt: '2024-01-01T00:00:00Z'
            }
          ],
          total: 1
        }

        mockService.findAllByOwner = vi.fn().mockResolvedValue(mockPaginatedResponse)

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource'
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/')
        const res = await app.request(req)

        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data).toEqual(mockPaginatedResponse)
      })

      it('should apply list transformation when provided', async () => {
        const mockResources: TestResource[] = [
          {
            id: '1',
            name: 'Test 1',
            ownerId: 'user-123',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]

        mockService.findAllByOwner = vi.fn().mockResolvedValue(mockResources)

        const listTransform = vi.fn((items: TestResource[]) => ({
          resources: items.map(item => ({ id: item.id, name: item.name })),
          count: items.length
        }))

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource',
          listTransform
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/')
        const res = await app.request(req)

        expect(res.status).toBe(200)
        expect(listTransform).toHaveBeenCalledWith(mockResources)

        const data = await res.json()
        expect(data).toEqual({
          resources: [{ id: '1', name: 'Test 1' }],
          count: 1
        })
      })

      it('should handle query validation errors', async () => {
        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource'
        }

        const app = createCrudRoutes(config)
        // Test with an invalid page value that can't be parsed
        const req = new Request('http://localhost/?page=not-a-number&limit=invalid')
        const res = await app.request(req)

        expect(res.status).toBe(400)
      })

      it('should handle service errors', async () => {
        mockService.findAllByOwner = vi.fn().mockRejectedValue(new Error('Service error'))

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource'
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/')
        const res = await app.request(req)

        expect(res.status).toBe(500)
      })
    })

    describe('GET /:id (get single resource)', () => {
      it('should return single resource for authenticated user', async () => {
        const mockResource: TestResource = {
          id: '1',
          name: 'Test 1',
          ownerId: 'user-123',
          createdAt: '2024-01-01T00:00:00Z'
        }

        mockService.findById = vi.fn().mockResolvedValue(mockResource)

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource'
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/123e4567-e89b-12d3-a456-426614174000')
        const res = await app.request(req)

        expect(res.status).toBe(200)
        expect(mockService.findById).toHaveBeenCalledWith(
          '123e4567-e89b-12d3-a456-426614174000',
          'user-123'
        )

        const data = await res.json()
        expect(data).toEqual(mockResource)
      })

      it('should return 404 when resource not found', async () => {
        mockService.findById = vi.fn().mockResolvedValue(null)

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource'
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/123e4567-e89b-12d3-a456-426614174000')
        const res = await app.request(req)

        expect(res.status).toBe(404)
        const data = await res.json()
        expect(data.error).toBe('TestResource not found')
      })

      it('should apply detail transformation when provided', async () => {
        const mockResource: TestResource = {
          id: '1',
          name: 'Test 1',
          ownerId: 'user-123',
          createdAt: '2024-01-01T00:00:00Z'
        }

        mockService.findById = vi.fn().mockResolvedValue(mockResource)

        const detailTransform = vi.fn((item: TestResource) => ({
          id: item.id,
          name: item.name,
          createdAt: item.createdAt
        }))

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource',
          detailTransform
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/123e4567-e89b-12d3-a456-426614174000')
        const res = await app.request(req)

        expect(res.status).toBe(200)
        expect(detailTransform).toHaveBeenCalledWith(mockResource)

        const data = await res.json()
        expect(data).toEqual({
          id: '1',
          name: 'Test 1',
          createdAt: '2024-01-01T00:00:00Z'
        })
      })

      it('should handle invalid UUID in param', async () => {
        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource'
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/invalid-uuid')
        const res = await app.request(req)

        expect(res.status).toBe(400)
      })
    })

    describe('POST / (create resource)', () => {
      it('should create new resource for authenticated user', async () => {
        const createData: TestCreateData = {
          name: 'New Test',
          description: 'Test description'
        }

        const mockCreatedResource: TestResource = {
          id: '1',
          name: 'New Test',
          description: 'Test description',
          ownerId: 'user-123',
          createdAt: '2024-01-01T00:00:00Z'
        }

        mockService.create = vi.fn().mockResolvedValue(mockCreatedResource)

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource'
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData)
        })
        const res = await app.request(req)

        expect(res.status).toBe(201)
        expect(mockService.create).toHaveBeenCalledWith('user-123', createData)

        const data = await res.json()
        expect(data).toEqual(mockCreatedResource)
      })

      it('should apply detail transformation to created resource', async () => {
        const createData: TestCreateData = {
          name: 'New Test'
        }

        const mockCreatedResource: TestResource = {
          id: '1',
          name: 'New Test',
          ownerId: 'user-123',
          createdAt: '2024-01-01T00:00:00Z'
        }

        mockService.create = vi.fn().mockResolvedValue(mockCreatedResource)

        const detailTransform = vi.fn((item: TestResource) => ({
          id: item.id,
          name: item.name
        }))

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource',
          detailTransform
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData)
        })
        const res = await app.request(req)

        expect(res.status).toBe(201)
        expect(detailTransform).toHaveBeenCalledWith(mockCreatedResource)

        const data = await res.json()
        expect(data).toEqual({ id: '1', name: 'New Test' })
      })

      it('should handle validation errors on create', async () => {
        const invalidData = {
          name: '', // Empty name should fail validation
          description: 'Test'
        }

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource'
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidData)
        })
        const res = await app.request(req)

        expect(res.status).toBe(400)
      })
    })

    describe('PUT /:id (update resource)', () => {
      it('should update existing resource for authenticated user', async () => {
        const updateData: TestUpdateData = {
          name: 'Updated Test',
          description: 'Updated description'
        }

        const mockUpdatedResource: TestResource = {
          id: '1',
          name: 'Updated Test',
          description: 'Updated description',
          ownerId: 'user-123',
          createdAt: '2024-01-01T00:00:00Z'
        }

        mockService.update = vi.fn().mockResolvedValue(mockUpdatedResource)

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource'
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/123e4567-e89b-12d3-a456-426614174000', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
        const res = await app.request(req)

        expect(res.status).toBe(200)
        expect(mockService.update).toHaveBeenCalledWith(
          '123e4567-e89b-12d3-a456-426614174000',
          'user-123',
          updateData
        )

        const data = await res.json()
        expect(data).toEqual(mockUpdatedResource)
      })

      it('should apply detail transformation to updated resource', async () => {
        const updateData: TestUpdateData = {
          name: 'Updated Test'
        }

        const mockUpdatedResource: TestResource = {
          id: '1',
          name: 'Updated Test',
          ownerId: 'user-123',
          createdAt: '2024-01-01T00:00:00Z'
        }

        mockService.update = vi.fn().mockResolvedValue(mockUpdatedResource)

        const detailTransform = vi.fn((item: TestResource) => ({
          id: item.id,
          name: item.name
        }))

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource',
          detailTransform
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/123e4567-e89b-12d3-a456-426614174000', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
        const res = await app.request(req)

        expect(res.status).toBe(200)
        expect(detailTransform).toHaveBeenCalledWith(mockUpdatedResource)

        const data = await res.json()
        expect(data).toEqual({ id: '1', name: 'Updated Test' })
      })

      it('should handle validation errors on update', async () => {
        const invalidData = {
          name: '' // Empty name should fail validation
        }

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource'
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/123e4567-e89b-12d3-a456-426614174000', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidData)
        })
        const res = await app.request(req)

        expect(res.status).toBe(400)
      })
    })

    describe('DELETE /:id (delete resource)', () => {
      it('should delete resource for authenticated user', async () => {
        mockService.delete = vi.fn().mockResolvedValue(undefined)

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource'
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/123e4567-e89b-12d3-a456-426614174000', {
          method: 'DELETE'
        })
        const res = await app.request(req)

        expect(res.status).toBe(204)
        expect(mockService.delete).toHaveBeenCalledWith(
          '123e4567-e89b-12d3-a456-426614174000',
          'user-123'
        )

        const data = await res.json()
        expect(data).toEqual({ success: true })
      })

      it('should handle service errors on delete', async () => {
        mockService.delete = vi.fn().mockRejectedValue(new Error('Delete failed'))

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource'
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/123e4567-e89b-12d3-a456-426614174000', {
          method: 'DELETE'
        })
        const res = await app.request(req)

        expect(res.status).toBe(500)
      })
    })

    describe('Custom middleware', () => {
      it('should apply custom middleware', async () => {
        const customMiddleware = vi.fn(async (c: Context, next: () => Promise<void>) => {
          c.set('customFlag', true)
          await next()
        })

        mockService.findAllByOwner = vi.fn().mockResolvedValue([])

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource',
          middleware: [customMiddleware]
        }

        const app = createCrudRoutes(config)
        const req = new Request('http://localhost/')
        await app.request(req)

        expect(customMiddleware).toHaveBeenCalled()
      })
    })

    describe('Custom routes', () => {
      it('should add custom routes when provided', async () => {
        const customRoutes = vi.fn((app: Hono, service: CrudService<TestResource>) => {
          app.get('/custom', async (c) => {
            return c.json({ custom: true })
          })
        })

        const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
          service: mockService,
          schemas: mockSchemas,
          resourceName: 'TestResource',
          customRoutes
        }

        const app = createCrudRoutes(config)
        
        expect(customRoutes).toHaveBeenCalledWith(app, mockService)

        const req = new Request('http://localhost/custom')
        const res = await app.request(req)

        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data).toEqual({ custom: true })
      })
    })
  })

  describe('addBatchRoute', () => {
    it('should add batch operation route', async () => {
      const app = new Hono()
      
      // Apply auth middleware
      app.use('*', async (c: Context, next: () => Promise<void>) => {
        c.set('user', { id: 'user-123' })
        await next()
      })

      const batchSchema = z.object({
        items: z.array(z.object({
          name: z.string()
        }))
      })

      const batchHandler = vi.fn().mockResolvedValue({ created: 2 })

      addBatchRoute(app, '/batch', batchSchema, batchHandler)

      const batchData = {
        items: [
          { name: 'Item 1' },
          { name: 'Item 2' }
        ]
      }

      const req = new Request('http://localhost/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData)
      })
      const res = await app.request(req)

      expect(res.status).toBe(201)
      expect(batchHandler).toHaveBeenCalledWith('user-123', batchData)

      const data = await res.json()
      expect(data).toEqual({ created: 2 })
    })
  })

  describe('addNestedRoute', () => {
    it('should add nested resource route without query schema', async () => {
      const app = new Hono()
      
      // Apply auth middleware
      app.use('*', async (c: Context, next: () => Promise<void>) => {
        c.set('user', { id: 'user-123' })
        await next()
      })

      const paramSchema = z.object({
        id: z.string().uuid(),
        nestedId: z.string().uuid()
      })

      const nestedHandler = vi.fn().mockResolvedValue({ nested: 'data' })

      addNestedRoute(app, {
        path: '/:id/nested/:nestedId',
        paramSchema,
        handler: nestedHandler
      })

      const req = new Request('http://localhost/123e4567-e89b-12d3-a456-426614174000/nested/123e4567-e89b-12d3-a456-426614174001')
      const res = await app.request(req)

      expect(res.status).toBe(200)
      expect(nestedHandler).toHaveBeenCalledWith(
        'user-123',
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          nestedId: '123e4567-e89b-12d3-a456-426614174001'
        },
        undefined
      )

      const data = await res.json()
      expect(data).toEqual({ nested: 'data' })
    })

    it('should add nested resource route with query schema', async () => {
      const app = new Hono()
      
      // Apply auth middleware
      app.use('*', async (c: Context, next: () => Promise<void>) => {
        c.set('user', { id: 'user-123' })
        await next()
      })

      const paramSchema = z.object({
        id: z.string().uuid()
      })

      const querySchema = z.object({
        filter: z.string().optional()
      })

      const nestedHandler = vi.fn().mockResolvedValue({ nested: 'data' })

      addNestedRoute(app, {
        path: '/:id/nested',
        paramSchema,
        querySchema,
        handler: nestedHandler
      })

      const req = new Request('http://localhost/123e4567-e89b-12d3-a456-426614174000/nested?filter=test')
      const res = await app.request(req)

      expect(res.status).toBe(200)
      expect(nestedHandler).toHaveBeenCalledWith(
        'user-123',
        { id: '123e4567-e89b-12d3-a456-426614174000' },
        { filter: 'test' }
      )
    })

    it('should apply transformation to nested route response', async () => {
      const app = new Hono()
      
      // Apply auth middleware
      app.use('*', async (c: Context, next: () => Promise<void>) => {
        c.set('user', { id: 'user-123' })
        await next()
      })

      const paramSchema = z.object({
        id: z.string().uuid()
      })

      const nestedHandler = vi.fn().mockResolvedValue({
        id: '1',
        sensitive: 'data',
        public: 'info'
      })

      const transform = vi.fn((data: any) => ({
        id: data.id,
        public: data.public
      }))

      addNestedRoute(app, {
        path: '/:id/nested',
        paramSchema,
        handler: nestedHandler,
        transform
      })

      const req = new Request('http://localhost/123e4567-e89b-12d3-a456-426614174000/nested')
      const res = await app.request(req)

      expect(res.status).toBe(200)
      expect(transform).toHaveBeenCalledWith({
        id: '1',
        sensitive: 'data',
        public: 'info'
      })

      const data = await res.json()
      expect(data).toEqual({
        id: '1',
        public: 'info'
      })
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complete CRUD workflow', async () => {
      // Setup complete service mock
      const resources: TestResource[] = []
      let idCounter = 1

      mockService.findAllByOwner = vi.fn().mockImplementation(() => 
        Promise.resolve(resources.filter(r => r.ownerId === 'user-123'))
      )
      
      mockService.findById = vi.fn().mockImplementation((id: string, ownerId: string) => 
        Promise.resolve(resources.find(r => r.id === id && r.ownerId === ownerId) || null)
      )
      
      mockService.create = vi.fn().mockImplementation((ownerId: string, data: TestCreateData) => {
        const newResource: TestResource = {
          id: `123e4567-e89b-12d3-a456-42661417400${idCounter}`,
          name: data.name,
          description: data.description,
          ownerId,
          createdAt: new Date().toISOString()
        }
        resources.push(newResource)
        idCounter++
        return Promise.resolve(newResource)
      })
      
      mockService.update = vi.fn().mockImplementation((id: string, ownerId: string, data: TestUpdateData) => {
        const resource = resources.find(r => r.id === id && r.ownerId === ownerId)
        if (!resource) throw new Error('Not found')
        
        Object.assign(resource, data)
        return Promise.resolve(resource)
      })
      
      mockService.delete = vi.fn().mockImplementation((id: string, ownerId: string) => {
        const index = resources.findIndex(r => r.id === id && r.ownerId === ownerId)
        if (index === -1) throw new Error('Not found')
        
        resources.splice(index, 1)
        return Promise.resolve()
      })

      const config: CrudRouteConfig<TestResource, TestCreateData, TestUpdateData> = {
        service: mockService,
        schemas: mockSchemas,
        resourceName: 'TestResource'
      }

      const app = createCrudRoutes(config)

      // 1. Create resource
      const createReq = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Resource', description: 'Test' })
      })
      const createRes = await app.request(createReq)
      expect(createRes.status).toBe(201)
      
      const created = await createRes.json()
      expect(created.name).toBe('Test Resource')

      // 2. Get resource - use a valid UUID
      const getReq = new Request(`http://localhost/${created.id}`)
      const getRes = await app.request(getReq)
      expect(getRes.status).toBe(200)
      
      const retrieved = await getRes.json()
      expect(retrieved.id).toBe(created.id)

      // 3. Update resource
      const updateReq = new Request(`http://localhost/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Resource' })
      })
      const updateRes = await app.request(updateReq)
      expect(updateRes.status).toBe(200)
      
      const updated = await updateRes.json()
      expect(updated.name).toBe('Updated Resource')

      // 4. List resources
      const listReq = new Request('http://localhost/')
      const listRes = await app.request(listReq)
      expect(listRes.status).toBe(200)
      
      const list = await listRes.json()
      expect(list).toHaveLength(1)
      expect(list[0].name).toBe('Updated Resource')

      // 5. Delete resource
      const deleteReq = new Request(`http://localhost/${created.id}`, {
        method: 'DELETE'
      })
      const deleteRes = await app.request(deleteReq)
      expect(deleteRes.status).toBe(204)

      // 6. Verify deletion
      const listAfterDeleteReq = new Request('http://localhost/')
      const listAfterDeleteRes = await app.request(listAfterDeleteReq)
      const emptyList = await listAfterDeleteRes.json()
      expect(emptyList).toHaveLength(0)
    })
  })
})