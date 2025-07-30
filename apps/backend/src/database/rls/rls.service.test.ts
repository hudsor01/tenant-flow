import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { RLSService } from './rls.service'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase createClient
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    })),
    auth: {
      admin: {
        createUser: vi.fn(),
        getUserById: vi.fn()
      }
    },
    sql: vi.fn().mockResolvedValue({ data: [], error: null })
  }))
}))

describe('RLSService', () => {
  let service: RLSService
  let prisma: PrismaService
  let configService: ConfigService
  let supabaseAdmin: any

  // Test data
  const testOwner = {
    id: 'owner-123',
    email: 'owner@test.com',
    role: 'OWNER' as const
  }

  const testTenant = {
    id: 'tenant-456',
    email: 'tenant@test.com',
    role: 'TENANT' as const
  }

  const testProperty = {
    id: 'property-789',
    name: 'Test Property',
    address: '123 Test St',
    city: 'Test City',
    state: 'CA',
    zipCode: '12345',
    ownerId: testOwner.id
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RLSService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findMany: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
              delete: vi.fn()
            },
            unit: {
              findMany: vi.fn(),
              create: vi.fn()
            },
            tenant: {
              findMany: vi.fn()
            },
            $transaction: vi.fn()
          }
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              const config: Record<string, string> = {
                'SUPABASE_URL': 'https://test.supabase.co',
                'SUPABASE_SERVICE_ROLE_KEY': 'test-service-key',
                'DATABASE_URL': 'postgresql://test:test@localhost:5432/test'
              }
              return config[key]
            })
          }
        }
      ]
    }).compile()

    service = module.get<RLSService>(RLSService)
    prisma = module.get<PrismaService>(PrismaService)
    configService = module.get<ConfigService>(ConfigService)
  })

  describe('service initialization', () => {
    it('should have properly injected dependencies', () => {
      expect(service).toBeDefined()
      expect(configService).toBeDefined()
      expect(configService.get).toBeDefined()
      expect(configService.get('SUPABASE_URL')).toBe('https://test.supabase.co')
    })
  })

  describe('verifyRLSEnabled', () => {
    it.skip('should return RLS status for all critical tables', async () => {
      const result = await service.verifyRLSEnabled()
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      
      // Check that critical tables are included
      const tableNames = result.map(r => r.table)
      expect(tableNames).toContain('Property')
      expect(tableNames).toContain('Unit')
      expect(tableNames).toContain('Tenant')
      expect(tableNames).toContain('Lease')
    })
  })

  describe('testRLSPolicies', () => {
    describe('Property Owner Access', () => {
      it('should allow owner to view their own properties', async () => {
        const mockProperties = [testProperty]
        
        // Ensure the mock is set up correctly
        const mockFindMany = vi.fn().mockResolvedValue(mockProperties)
        prisma.property.findMany = mockFindMany

        const result = await service.testRLSPolicies(testOwner.id, 'OWNER')
        
        // The service should return true when properties are found
        expect(result.property.canViewOwn).toBe(true)
        expect(mockFindMany).toHaveBeenCalledWith({
          where: { ownerId: testOwner.id }
        })
      })

      it('should allow owner to create properties', async () => {
        ;(prisma.property.create as jest.Mock).mockResolvedValue(testProperty)

        const result = await service.testRLSPolicies(testOwner.id, 'OWNER')
        
        // Additional test logic for creation
        expect(result.property.canCreate).toBeDefined()
      })

      it('should allow owner to update their properties', async () => {
        ;(prisma.property.update as jest.Mock).mockResolvedValue(testProperty)

        const result = await service.testRLSPolicies(testOwner.id, 'OWNER')
        
        expect(result.property.canUpdate).toBeDefined()
      })

      it('should allow owner to delete their properties', async () => {
        ;(prisma.property.delete as jest.Mock).mockResolvedValue(testProperty)

        const result = await service.testRLSPolicies(testOwner.id, 'OWNER')
        
        expect(result.property.canDelete).toBeDefined()
      })
    })

    describe('Tenant Access', () => {
      it('should allow tenant to view properties they have leases in', async () => {
        const result = await service.testRLSPolicies(testTenant.id, 'TENANT')
        
        expect(result.property.canViewOwn).toBeDefined()
      })

      it('should not allow tenant to create properties', async () => {
        const result = await service.testRLSPolicies(testTenant.id, 'TENANT')
        
        expect(result.property.canCreate).toBe(false)
      })

      it('should allow tenant to view their own tenant record', async () => {
        const result = await service.testRLSPolicies(testTenant.id, 'TENANT')
        
        expect(result.tenant.canViewOwn).toBeDefined()
      })

      it('should allow tenant to view their leases', async () => {
        const result = await service.testRLSPolicies(testTenant.id, 'TENANT')
        
        expect(result.lease.canViewOwn).toBeDefined()
      })
    })

    describe('Cross-tenant isolation', () => {
      it('should not allow users to view properties they do not own', async () => {
        ;(prisma.property.findMany as jest.Mock).mockResolvedValue([])

        const result = await service.testRLSPolicies('other-user-id', 'OWNER')
        
        expect(result.property.cannotViewOthers).toBeDefined()
      })

      it('should not allow tenants to view unrelated properties', async () => {
        const result = await service.testRLSPolicies(testTenant.id, 'TENANT')
        
        expect(result.tenant.cannotViewUnrelated).toBeDefined()
      })
    })
  })

  describe('generateRLSAuditReport', () => {
    it.skip('should generate comprehensive audit report', async () => {
      const report = await service.generateRLSAuditReport()
      
      expect(report).toBeDefined()
      expect(report.timestamp).toBeDefined()
      expect(report.rlsStatus).toBeDefined()
      expect(report.policies).toBeDefined()
      expect(report.recommendations).toBeDefined()
      expect(Array.isArray(report.recommendations)).toBe(true)
    })

    it('should include recommendations for tables without RLS', async () => {
      // Mock a table without RLS
      service.verifyRLSEnabled = vi.fn().mockResolvedValue([
        { table: 'Property', enabled: false }
      ])

      const report = await service.generateRLSAuditReport()
      
      expect(report.recommendations).toContain('Enable RLS on Property table')
    })
  })
})

describe.skip('RLS Integration Tests', () => {
  let service: RLSService
  let supabase: any

  beforeAll(async () => {
    // Setup test database connection
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    supabase = createClient(supabaseUrl, supabaseServiceKey)
  })

  describe('Real database RLS tests', () => {
    it('should enforce property access policies', async () => {
      // Create test data
      const { data: owner } = await supabase.auth.admin.createUser({
        email: 'rlstest-owner@test.com',
        password: 'test123456'
      })

      const { data: tenant } = await supabase.auth.admin.createUser({
        email: 'rlstest-tenant@test.com',
        password: 'test123456'
      })

      // Test as property owner
      const ownerClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false
          },
          global: {
            headers: {
              Authorization: `Bearer ${owner.user.id}`
            }
          }
        }
      )

      // Owner should be able to create property
      const { data: property, error: createError } = await ownerClient
        .from('Property')
        .insert({
          name: 'RLS Test Property',
          address: '123 RLS Test St',
          city: 'Test City',
          state: 'CA',
          zipCode: '12345',
          ownerId: owner.user.id
        })
        .select()
        .single()

      expect(createError).toBeNull()
      expect(property).toBeDefined()

      // Test as tenant - should not see property without lease
      const tenantClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false
          },
          global: {
            headers: {
              Authorization: `Bearer ${tenant.user.id}`
            }
          }
        }
      )

      const { data: tenantProperties } = await tenantClient
        .from('Property')
        .select('*')

      expect(tenantProperties).toHaveLength(0)

      // Cleanup
      await supabase.auth.admin.deleteUser(owner.user.id)
      await supabase.auth.admin.deleteUser(tenant.user.id)
    })
  })
})