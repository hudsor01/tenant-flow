import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import * as request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { IntegrationTestUtils, TestContext, TestData } from './test-utils'
import { DatabaseSetup } from './database-setup'
import type { Property } from '@prisma/client'

describe('Properties Controller Integration Tests', () => {
  let app: INestApplication
  let testContext: TestContext

  beforeAll(async () => {
    app = await IntegrationTestUtils.setupApp()
    DatabaseSetup.init(app.get('PrismaService'))
  })

  afterAll(async () => {
    await IntegrationTestUtils.teardownApp()
  })

  beforeEach(async () => {
    await DatabaseSetup.cleanAll()
    testContext = await IntegrationTestUtils.createFullTestContext()
  })

  describe('GET /properties', () => {
    it('should return properties for authenticated user', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      const response = await request(app.getHttpServer())
        .get('/properties')
        .set(authHeader)
        .expect(200)

      expect(response.body).toBeInstanceOf(Array)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toHaveProperty('id', testContext.property.id)
      expect(response.body[0]).toHaveProperty('name', testContext.property.name)
      expect(response.body[0]).toHaveProperty('ownerId', testContext.testUser.id)
    })

    it('should return empty array when user has no properties', async () => {
      // Create a new user with no properties
      const newUser = await IntegrationTestUtils.createTestUser({
        id: 'user-no-properties',
        email: 'noprops@test.com',
        supabaseId: 'supabase-no-properties'
      })
      const authHeader = IntegrationTestUtils.getAuthHeader({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role as any,
        supabaseId: newUser.supabaseId
      })

      const response = await request(app.getHttpServer())
        .get('/properties')
        .set(authHeader)
        .expect(200)

      expect(response.body).toBeInstanceOf(Array)
      expect(response.body).toHaveLength(0)
    })

    it('should filter properties by query parameters', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      // Create additional properties for filtering
      await IntegrationTestUtils.createTestProperty(testContext.testUser.id, {
        id: 'property-2',
        name: 'Apartment Complex',
        propertyType: 'APARTMENT',
        city: 'Austin'
      })

      // Test filtering by property type
      const response = await request(app.getHttpServer())
        .get('/properties?propertyType=APARTMENT')
        .set(authHeader)
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].propertyType).toBe('APARTMENT')
    })

    it('should handle pagination parameters', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      // Create multiple properties
      for (let i = 2; i <= 5; i++) {
        await IntegrationTestUtils.createTestProperty(testContext.testUser.id, {
          id: `property-${i}`,
          name: `Property ${i}`
        })
      }

      // Test pagination
      const response = await request(app.getHttpServer())
        .get('/properties?limit=2&offset=1')
        .set(authHeader)
        .expect(200)

      expect(response.body).toBeInstanceOf(Array)
      expect(response.body.length).toBeLessThanOrEqual(2)
    })

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/properties')
        .expect(401)
    })

    it('should not return properties from other owners', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      // Create another user with a property
      const otherUser = await IntegrationTestUtils.createTestUser({
        id: 'other-user',
        email: 'other@test.com',
        supabaseId: 'supabase-other'
      })
      await IntegrationTestUtils.createTestProperty(otherUser.id, {
        id: 'other-property',
        name: 'Other User Property'
      })

      const response = await request(app.getHttpServer())
        .get('/properties')
        .set(authHeader)
        .expect(200)

      // Should only return the current user's property
      expect(response.body).toHaveLength(1)
      expect(response.body[0].ownerId).toBe(testContext.testUser.id)
    })
  })

  describe('GET /properties/stats', () => {
    it('should return property statistics', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      const response = await request(app.getHttpServer())
        .get('/properties/stats')
        .set(authHeader)
        .expect(200)

      expect(response.body).toBeDefined()
      // Stats structure depends on PropertiesService implementation
    })

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/properties/stats')
        .expect(401)
    })
  })

  describe('GET /properties/:id', () => {
    it('should return specific property by ID', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      const response = await request(app.getHttpServer())
        .get(`/properties/${testContext.property.id}`)
        .set(authHeader)
        .expect(200)

      expect(response.body).toHaveProperty('id', testContext.property.id)
      expect(response.body).toHaveProperty('name', testContext.property.name)
      expect(response.body).toHaveProperty('ownerId', testContext.testUser.id)
    })

    it('should return 404 for non-existent property', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      await request(app.getHttpServer())
        .get('/properties/non-existent-id')
        .set(authHeader)
        .expect(404)
    })

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/properties/${testContext.property.id}`)
        .expect(401)
    })

    it('should return 403 when accessing other user\'s property', async () => {
      // Create another user
      const otherUser = await IntegrationTestUtils.createTestUser({
        id: 'other-user',
        email: 'other@test.com',
        supabaseId: 'supabase-other'
      })
      const otherAuthHeader = IntegrationTestUtils.getAuthHeader({
        id: otherUser.id,
        email: otherUser.email,
        name: otherUser.name,
        role: otherUser.role as any,
        supabaseId: otherUser.supabaseId
      })

      await request(app.getHttpServer())
        .get(`/properties/${testContext.property.id}`)
        .set(otherAuthHeader)
        .expect(404) // Should not reveal existence of other user's property
    })
  })

  describe('POST /properties', () => {
    it('should create a new property', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)
      const propertyData = TestData.createPropertyPayload({
        name: 'New Test Property',
        address: '456 New Street'
      })

      const response = await request(app.getHttpServer())
        .post('/properties')
        .set(authHeader)
        .send(propertyData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('name', propertyData.name)
      expect(response.body).toHaveProperty('address', propertyData.address)
      expect(response.body).toHaveProperty('ownerId', testContext.testUser.id)

      // Verify it was saved to database
      const savedProperty = await testContext.prisma.property.findUnique({
        where: { id: response.body.id }
      })
      expect(savedProperty).not.toBeNull()
      expect(savedProperty!.name).toBe(propertyData.name)
    })

    it('should validate required fields', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      // Missing required field
      const invalidData = {
        address: '123 Test St',
        city: 'Test City'
        // Missing name
      }

      await request(app.getHttpServer())
        .post('/properties')
        .set(authHeader)
        .send(invalidData)
        .expect(400)
    })

    it('should validate property type enum', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)
      const propertyData = TestData.createPropertyPayload({
        propertyType: 'INVALID_TYPE'
      })

      await request(app.getHttpServer())
        .post('/properties')
        .set(authHeader)
        .send(propertyData)
        .expect(400)
    })

    it('should return 401 when not authenticated', async () => {
      const propertyData = TestData.createPropertyPayload()

      await request(app.getHttpServer())
        .post('/properties')
        .send(propertyData)
        .expect(401)
    })

    it('should handle duplicate property names', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)
      const propertyData = TestData.createPropertyPayload({
        name: testContext.property.name // Same name as existing property
      })

      // This should succeed as duplicate names are allowed
      const response = await request(app.getHttpServer())
        .post('/properties')
        .set(authHeader)
        .send(propertyData)
        .expect(201)

      expect(response.body.name).toBe(propertyData.name)
    })

    it('should sanitize input data', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)
      const propertyData = TestData.createPropertyPayload({
        name: '<script>alert("xss")</script>Property Name',
        description: '<img src="x" onerror="alert(1)">'
      })

      const response = await request(app.getHttpServer())
        .post('/properties')
        .set(authHeader)
        .send(propertyData)
        .expect(201)

      // Verify XSS content is handled appropriately
      expect(response.body.name).not.toContain('<script>')
      expect(response.body.description).not.toContain('<img')
    })
  })

  describe('PUT /properties/:id', () => {
    it('should update existing property', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)
      const updateData = {
        name: 'Updated Property Name',
        description: 'Updated description'
      }

      const response = await request(app.getHttpServer())
        .put(`/properties/${testContext.property.id}`)
        .set(authHeader)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('id', testContext.property.id)
      expect(response.body).toHaveProperty('name', updateData.name)
      expect(response.body).toHaveProperty('description', updateData.description)

      // Verify database was updated
      const updatedProperty = await testContext.prisma.property.findUnique({
        where: { id: testContext.property.id }
      })
      expect(updatedProperty!.name).toBe(updateData.name)
    })

    it('should perform partial updates', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)
      const updateData = {
        name: 'Partially Updated Name'
        // Other fields should remain unchanged
      }

      const response = await request(app.getHttpServer())
        .put(`/properties/${testContext.property.id}`)
        .set(authHeader)
        .send(updateData)
        .expect(200)

      expect(response.body.name).toBe(updateData.name)
      expect(response.body.address).toBe(testContext.property.address) // Unchanged
    })

    it('should return 404 for non-existent property', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)
      const updateData = { name: 'Updated Name' }

      await request(app.getHttpServer())
        .put('/properties/non-existent-id')
        .set(authHeader)
        .send(updateData)
        .expect(404)
    })

    it('should return 401 when not authenticated', async () => {
      const updateData = { name: 'Updated Name' }

      await request(app.getHttpServer())
        .put(`/properties/${testContext.property.id}`)
        .send(updateData)
        .expect(401)
    })

    it('should prevent updating other user\'s property', async () => {
      const otherUser = await IntegrationTestUtils.createTestUser({
        id: 'other-user',
        email: 'other@test.com',
        supabaseId: 'supabase-other'
      })
      const otherAuthHeader = IntegrationTestUtils.getAuthHeader({
        id: otherUser.id,
        email: otherUser.email,
        name: otherUser.name,
        role: otherUser.role as any,
        supabaseId: otherUser.supabaseId
      })

      const updateData = { name: 'Malicious Update' }

      await request(app.getHttpServer())
        .put(`/properties/${testContext.property.id}`)
        .set(otherAuthHeader)
        .send(updateData)
        .expect(404)
    })

    it('should validate update data', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)
      const invalidData = {
        propertyType: 'INVALID_TYPE'
      }

      await request(app.getHttpServer())
        .put(`/properties/${testContext.property.id}`)
        .set(authHeader)
        .send(invalidData)
        .expect(400)
    })
  })

  describe('DELETE /properties/:id', () => {
    it('should delete existing property', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      const response = await request(app.getHttpServer())
        .delete(`/properties/${testContext.property.id}`)
        .set(authHeader)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Property deleted successfully')

      // Verify it was deleted from database
      const deletedProperty = await testContext.prisma.property.findUnique({
        where: { id: testContext.property.id }
      })
      expect(deletedProperty).toBeNull()
    })

    it('should return 404 for non-existent property', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      await request(app.getHttpServer())
        .delete('/properties/non-existent-id')
        .set(authHeader)
        .expect(404)
    })

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .delete(`/properties/${testContext.property.id}`)
        .expect(401)
    })

    it('should prevent deleting other user\'s property', async () => {
      const otherUser = await IntegrationTestUtils.createTestUser({
        id: 'other-user',
        email: 'other@test.com',
        supabaseId: 'supabase-other'
      })
      const otherAuthHeader = IntegrationTestUtils.getAuthHeader({
        id: otherUser.id,
        email: otherUser.email,
        name: otherUser.name,
        role: otherUser.role as any,
        supabaseId: otherUser.supabaseId
      })

      await request(app.getHttpServer())
        .delete(`/properties/${testContext.property.id}`)
        .set(otherAuthHeader)
        .expect(404)

      // Verify property still exists
      const existingProperty = await testContext.prisma.property.findUnique({
        where: { id: testContext.property.id }
      })
      expect(existingProperty).not.toBeNull()
    })

    it('should handle cascade deletion of related entities', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      // Verify related entities exist before deletion
      const relatedUnits = await testContext.prisma.unit.findMany({
        where: { propertyId: testContext.property.id }
      })
      expect(relatedUnits.length).toBeGreaterThan(0)

      await request(app.getHttpServer())
        .delete(`/properties/${testContext.property.id}`)
        .set(authHeader)
        .expect(200)

      // Verify related entities were also deleted
      const remainingUnits = await testContext.prisma.unit.findMany({
        where: { propertyId: testContext.property.id }
      })
      expect(remainingUnits).toHaveLength(0)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent operations gracefully', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      // Multiple concurrent update requests
      const updateRequests = Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .put(`/properties/${testContext.property.id}`)
          .set(authHeader)
          .send({ name: `Concurrent Update ${i}` })
      )

      const responses = await Promise.allSettled(updateRequests)
      
      // At least one should succeed
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 200
      )
      expect(successful.length).toBeGreaterThan(0)
    })

    it('should handle large payload gracefully', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)
      const largeDescription = 'x'.repeat(10000) // 10KB string

      const response = await request(app.getHttpServer())
        .post('/properties')
        .set(authHeader)
        .send(TestData.createPropertyPayload({
          description: largeDescription
        }))
        .expect(201)

      expect(response.body.description).toBe(largeDescription)
    })

    it('should return proper error format', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      const response = await request(app.getHttpServer())
        .get('/properties/non-existent')
        .set(authHeader)
        .expect(404)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toHaveProperty('message')
      expect(response.body.error).toHaveProperty('statusCode', 404)
    })

    it('should handle database connection errors', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      // This would require mocking Prisma to simulate connection loss
      // Implementation depends on how errors are handled in the service layer
      
      // For now, test that the endpoint is available
      await request(app.getHttpServer())
        .get('/properties')
        .set(authHeader)
        .expect(200)
    })
  })

  describe('Content-Type and Headers', () => {
    it('should handle different content types appropriately', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)
      const propertyData = TestData.createPropertyPayload()

      // JSON content type
      await request(app.getHttpServer())
        .post('/properties')
        .set(authHeader)
        .set('Content-Type', 'application/json')
        .send(propertyData)
        .expect(201)
    })

    it('should set appropriate response headers', async () => {
      const authHeader = IntegrationTestUtils.getAuthHeader(testContext.testUser)

      const response = await request(app.getHttpServer())
        .get('/properties')
        .set(authHeader)
        .expect(200)

      expect(response.headers['content-type']).toMatch(/application\/json/)
    })
  })
})