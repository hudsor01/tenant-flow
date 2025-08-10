/**
 * API Test Helpers
 * Utilities for testing API endpoints
 */

import { Test, type TestingModule } from '@nestjs/testing'
import type { INestApplication, ModuleMetadata } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import request from 'supertest'
import { PrismaService } from '@/prisma/prisma.service'
import { mockPrismaService } from './setup'
import type { TestUser } from './test-users'

export interface ApiTestResponse<T = unknown> {
  status: number
  body: T
  headers: Record<string, string>
}

export class ApiTestClient {
  private app: INestApplication
  private baseUrl = '/api'

  constructor(app: INestApplication) {
    this.app = app
  }

  // Authentication helpers
  private getAuthHeaders(user?: TestUser) {
    if (!user) return {}
    return {
      Authorization: `Bearer ${user.accessToken}`
    }
  }

  // Generic HTTP methods
  async get<T = unknown>(path: string, user?: TestUser): Promise<ApiTestResponse<T>> {
    const response = await request(this.app.getHttpServer())
      .get(`${this.baseUrl}${path}`)
      .set(this.getAuthHeaders(user))
    
    return {
      status: response.status,
      body: response.body,
      headers: response.headers
    }
  }

  async post<T = unknown>(path: string, data: Record<string, unknown> = {}, user?: TestUser): Promise<ApiTestResponse<T>> {
    const response = await request(this.app.getHttpServer())
      .post(`${this.baseUrl}${path}`)
      .set(this.getAuthHeaders(user))
      .send(data)
    
    return {
      status: response.status,
      body: response.body,
      headers: response.headers
    }
  }

  async put<T = unknown>(path: string, data: Record<string, unknown> = {}, user?: TestUser): Promise<ApiTestResponse<T>> {
    const response = await request(this.app.getHttpServer())
      .put(`${this.baseUrl}${path}`)
      .set(this.getAuthHeaders(user))
      .send(data)
    
    return {
      status: response.status,
      body: response.body,
      headers: response.headers
    }
  }

  async patch<T = unknown>(path: string, data: Record<string, unknown> = {}, user?: TestUser): Promise<ApiTestResponse<T>> {
    const response = await request(this.app.getHttpServer())
      .patch(`${this.baseUrl}${path}`)
      .set(this.getAuthHeaders(user))
      .send(data)
    
    return {
      status: response.status,
      body: response.body,
      headers: response.headers
    }
  }

  async delete<T = unknown>(path: string, user?: TestUser): Promise<ApiTestResponse<T>> {
    const response = await request(this.app.getHttpServer())
      .delete(`${this.baseUrl}${path}`)
      .set(this.getAuthHeaders(user))
    
    return {
      status: response.status,
      body: response.body,
      headers: response.headers
    }
  }

  // File upload helper
  async uploadFile(path: string, fieldName: string, filePath: string, user?: TestUser): Promise<ApiTestResponse> {
    const response = await request(this.app.getHttpServer())
      .post(`${this.baseUrl}${path}`)
      .set(this.getAuthHeaders(user))
      .attach(fieldName, filePath)
    
    return {
      status: response.status,
      body: response.body,
      headers: response.headers
    }
  }

  // Bulk operations helper
  async bulkRequest(requests: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    path: string
    data?: Record<string, unknown>
    user?: TestUser
  }[]): Promise<ApiTestResponse[]> {
    const results = []
    
    for (const req of requests) {
      let response: ApiTestResponse
      
      switch (req.method) {
        case 'GET':
          response = await this.get(req.path, req.user)
          break
        case 'POST':
          response = await this.post(req.path, req.data, req.user)
          break
        case 'PUT':
          response = await this.put(req.path, req.data, req.user)
          break
        case 'PATCH':
          response = await this.patch(req.path, req.data, req.user)
          break
        case 'DELETE':
          response = await this.delete(req.path, req.user)
          break
      }
      
      results.push(response)
    }
    
    return results
  }
}

// Test module builder
export class TestModuleBuilder {
  private imports: NonNullable<ModuleMetadata['imports']> = []
  private providers: NonNullable<ModuleMetadata['providers']> = []
  private controllers: NonNullable<ModuleMetadata['controllers']> = []

  addImport(moduleImport: NonNullable<ModuleMetadata['imports']>[number]): this {
    this.imports.push(moduleImport)
    return this
  }

  addProvider(provider: NonNullable<ModuleMetadata['providers']>[number]): this {
    this.providers.push(provider)
    return this
  }

  addController(controller: NonNullable<ModuleMetadata['controllers']>[number]): this {
    this.controllers.push(controller)
    return this
  }

  async build(): Promise<TestingModule> {
    return await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test'
        }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' }
        }),
        ...this.imports
      ],
      controllers: this.controllers,
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService
        },
        ...this.providers
      ]
    }).compile()
  }
}

// Application factory
export const createTestApp = async (module: TestingModule): Promise<INestApplication> => {
  const app = module.createNestApplication()
  
  // Configure test app
  app.setGlobalPrefix('api')
  
  // Add any global pipes, interceptors, filters here
  
  await app.init()
  return app
}

// API client factory
export const createApiClient = (app: INestApplication): ApiTestClient => {
  return new ApiTestClient(app)
}

// Response assertion helpers
export const expectSuccess = (response: ApiTestResponse, expectedStatus = 200) => {
  expect(response.status).toBe(expectedStatus)
  expect(response.body).toBeDefined()
}

export const expectError = (response: ApiTestResponse, expectedStatus: number, expectedMessage?: string) => {
  expect(response.status).toBe(expectedStatus)
  expect(response.body).toHaveProperty('error')
  if (expectedMessage) {
    expect((response.body as { message: string }).message).toContain(expectedMessage)
  }
}

export const expectValidationError = (response: ApiTestResponse, field?: string) => {
  expectError(response, 400)
  expect(response.body).toHaveProperty('validation')
  if (field) {
    expect((response.body as { validation: Record<string, unknown> }).validation).toHaveProperty(field)
  }
}

export const expectUnauthorized = (response: ApiTestResponse) => {
  expectError(response, 401, 'Unauthorized')
}

export const expectForbidden = (response: ApiTestResponse) => {
  expectError(response, 403, 'Forbidden')
}

export const expectNotFound = (response: ApiTestResponse) => {
  expectError(response, 404, 'Not Found')
}

// Mock data generators for API tests
export const generatePropertyData = () => ({
  name: 'Test Property',
  address: '123 Test St',
  city: 'Test City',
  state: 'TX',
  zipCode: '12345',
  propertyType: 'single_family',
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 1500,
  rentAmount: 2000
})

export const generateTenantData = () => ({
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '555-0123',
  emergencyContact: 'Jane Doe - 555-0124'
})

export const generateLeaseData = (propertyId: string, tenantId: string) => ({
  propertyId,
  tenantId,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  monthlyRent: 2000,
  securityDeposit: 4000,
  leaseTerms: {
    petsAllowed: false,
    smokingAllowed: false,
    utilitiesIncluded: ['water'],
    parkingSpaces: 1
  }
})

export const generateMaintenanceRequestData = (propertyId: string) => ({
  propertyId,
  title: 'Leaky faucet',
  description: 'The kitchen faucet is leaking',
  priority: 'medium',
  category: 'plumbing'
})

export const generatePaymentData = (tenantId: string, leaseId: string) => ({
  tenantId,
  leaseId,
  amount: 2000,
  dueDate: '2024-01-01',
  paymentMethod: 'bank_transfer'
})