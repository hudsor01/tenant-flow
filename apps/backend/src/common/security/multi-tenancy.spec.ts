import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthService } from '../../auth/auth.service'
import { AppModule } from '../../app.module'
import { faker } from '@faker-js/faker'

describe('Multi-Tenancy Isolation Tests', () => {
  let app: INestApplication
  let prisma: PrismaService
  let authService: AuthService
  
  // Test data
  let org1: any
  let org2: any
  let user1: any
  let user2: any
  let token1: string
  let token2: string
  let property1: any
  let property2: any

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
    
    prisma = app.get<PrismaService>(PrismaService)
    authService = app.get<AuthService>(AuthService)

    // Create test organizations
    org1 = await prisma.organization.create({
      data: {
        name: 'Test Org 1',
        slug: 'test-org-1',
      },
    })

    org2 = await prisma.organization.create({
      data: {
        name: 'Test Org 2',
        slug: 'test-org-2',
      },
    })

    // Create test users
    user1 = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        role: 'OWNER',
        organizationId: org1.id,
      },
    })

    user2 = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        role: 'OWNER',
        organizationId: org2.id,
      },
    })

    // Get auth tokens
    token1 = await authService.generateTestToken(user1)
    token2 = await authService.generateTestToken(user2)

    // Create test properties
    property1 = await prisma.property.create({
      data: {
        name: 'Property 1',
        address: '123 Test St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        ownerId: user1.id,
        propertyType: 'SINGLE_FAMILY',
      },
    })

    property2 = await prisma.property.create({
      data: {
        name: 'Property 2',
        address: '456 Test Ave',
        city: 'Dallas',
        state: 'TX',
        zipCode: '75201',
        ownerId: user2.id,
        propertyType: 'APARTMENT',
      },
    })
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.property.deleteMany({
      where: { id: { in: [property1.id, property2.id] } },
    })
    await prisma.user.deleteMany({
      where: { id: { in: [user1.id, user2.id] } },
    })
    await prisma.organization.deleteMany({
      where: { id: { in: [org1.id, org2.id] } },
    })
    
    await app.close()
  })

  describe('Property Isolation', () => {
    it('should only return properties owned by the authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/properties')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200)

      expect(res.body).toHaveLength(1)
      expect(res.body[0].id).toBe(property1.id)
      expect(res.body[0].ownerId).toBe(user1.id)
    })

    it('should not allow access to properties from different organization', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/properties/${property2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404)
    })

    it('should not allow updating properties from different organization', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/properties/${property2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ name: 'Hacked Property' })
        .expect(404)

      // Verify property name unchanged
      const property = await prisma.property.findUnique({
        where: { id: property2.id },
      })
      expect(property?.name).toBe('Property 2')
    })

    it('should not allow deleting properties from different organization', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/properties/${property2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404)

      // Verify property still exists
      const property = await prisma.property.findUnique({
        where: { id: property2.id },
      })
      expect(property).toBeTruthy()
    })
  })

  describe('Unit Isolation', () => {
    let unit1: any
    let unit2: any

    beforeAll(async () => {
      unit1 = await prisma.unit.create({
        data: {
          unitNumber: '101',
          propertyId: property1.id,
          bedrooms: 2,
          bathrooms: 1,
          rent: 1500,
          status: 'VACANT',
        },
      })

      unit2 = await prisma.unit.create({
        data: {
          unitNumber: '201',
          propertyId: property2.id,
          bedrooms: 3,
          bathrooms: 2,
          rent: 2000,
          status: 'VACANT',
        },
      })
    })

    afterAll(async () => {
      await prisma.unit.deleteMany({
        where: { id: { in: [unit1.id, unit2.id] } },
      })
    })

    it('should only return units from owned properties', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/units')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200)

      expect(res.body).toHaveLength(1)
      expect(res.body[0].id).toBe(unit1.id)
      expect(res.body[0].propertyId).toBe(property1.id)
    })

    it('should not allow access to units from different organization', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/units/${unit2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404)
    })
  })

  describe('Tenant Isolation', () => {
    let tenant1: any
    let tenant2: any

    beforeAll(async () => {
      tenant1 = await prisma.tenant.create({
        data: {
          email: faker.internet.email(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          phone: faker.phone.number(),
          organizationId: org1.id,
        },
      })

      tenant2 = await prisma.tenant.create({
        data: {
          email: faker.internet.email(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          phone: faker.phone.number(),
          organizationId: org2.id,
        },
      })
    })

    afterAll(async () => {
      await prisma.tenant.deleteMany({
        where: { id: { in: [tenant1.id, tenant2.id] } },
      })
    })

    it('should only return tenants from same organization', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200)

      expect(res.body).toHaveLength(1)
      expect(res.body[0].id).toBe(tenant1.id)
      expect(res.body[0].organizationId).toBe(org1.id)
    })

    it('should not allow access to tenants from different organization', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404)
    })
  })

  describe('Financial Data Isolation', () => {
    it('should only show financial stats for owned properties', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/financial-summary')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200)

      expect(res.body.propertyCount).toBe(1)
      expect(res.body.totalProperties).not.toContain(property2.id)
    })

    it('should not include other organizations in revenue calculations', async () => {
      // Create lease for org1
      const lease1 = await prisma.lease.create({
        data: {
          unitId: unit1.id,
          tenantId: tenant1.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          rentAmount: 1500,
          securityDeposit: 1500,
          status: 'ACTIVE',
        },
      })

      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/revenue')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200)

      expect(res.body.monthlyRevenue).toBe(1500)
      expect(res.body.annualRevenue).toBe(18000)

      await prisma.lease.delete({ where: { id: lease1.id } })
    })
  })

  describe('Cross-Organization Data Leakage Tests', () => {
    it('should not expose organization IDs in API responses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/properties')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200)

      // Check that no organizationId is exposed
      res.body.forEach((property: any) => {
        expect(property.organizationId).toBeUndefined()
      })
    })

    it('should not allow querying with different organization ID', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/properties?organizationId=${org2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(400) // Should reject invalid query param
    })

    it('should sanitize error messages to prevent information disclosure', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/properties/${property2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404)

      expect(res.body.message).not.toContain(property2.id)
      expect(res.body.message).not.toContain(org2.id)
      expect(res.body.message).toBe('Property not found')
    })
  })

  describe('Concurrent Access Tests', () => {
    it('should handle concurrent requests from different organizations', async () => {
      const requests = [
        request(app.getHttpServer())
          .get('/api/v1/properties')
          .set('Authorization', `Bearer ${token1}`),
        request(app.getHttpServer())
          .get('/api/v1/properties')
          .set('Authorization', `Bearer ${token2}`),
      ]

      const [res1, res2] = await Promise.all(requests)

      expect(res1.status).toBe(200)
      expect(res2.status).toBe(200)
      expect(res1.body[0].id).toBe(property1.id)
      expect(res2.body[0].id).toBe(property2.id)
    })

    it('should maintain isolation during concurrent writes', async () => {
      const requests = [
        request(app.getHttpServer())
          .patch(`/api/v1/properties/${property1.id}`)
          .set('Authorization', `Bearer ${token1}`)
          .send({ name: 'Updated by Org1' }),
        request(app.getHttpServer())
          .patch(`/api/v1/properties/${property2.id}`)
          .set('Authorization', `Bearer ${token2}`)
          .send({ name: 'Updated by Org2' }),
      ]

      const [res1, res2] = await Promise.all(requests)

      expect(res1.status).toBe(200)
      expect(res2.status).toBe(200)
      expect(res1.body.name).toBe('Updated by Org1')
      expect(res2.body.name).toBe('Updated by Org2')
    })
  })
})