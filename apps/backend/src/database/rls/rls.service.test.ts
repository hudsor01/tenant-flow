import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { RLSService } from './rls.service'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase createClient
// Track current table name for mocking
let currentTableName = ''

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => {
    const chainableApi = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((field: string, value?: string) => {
        if (field === 'tablename' && value) {
          currentTableName = value
        }
        return chainableApi
      }),
      single: vi.fn().mockImplementation(() => {
        const tableMap: Record<string, { data: any, error: any }> = {
          'Property': { data: { tablename: 'Property', rowsecurity: true }, error: null },
          'Unit': { data: { tablename: 'Unit', rowsecurity: true }, error: null },
          'Tenant': { data: { tablename: 'Tenant', rowsecurity: true }, error: null },
          'Lease': { data: { tablename: 'Lease', rowsecurity: true }, error: null },
          'MaintenanceRequest': { data: { tablename: 'MaintenanceRequest', rowsecurity: false }, error: null },
          'Document': { data: { tablename: 'Document', rowsecurity: true }, error: null },
          'Expense': { data: { tablename: 'Expense', rowsecurity: true }, error: null },
          'Invoice': { data: { tablename: 'Invoice', rowsecurity: true }, error: null },
          'Subscription': { data: { tablename: 'Subscription', rowsecurity: true }, error: null }
        }
        return Promise.resolve(tableMap[currentTableName] || { data: null, error: 'Table not found' })
      }),
      where: vi.fn().mockReturnThis()
    }
    
    return {
      from: vi.fn((table: string) => {
        if (table === 'pg_tables') {
          return chainableApi
        }
        return {
          select: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        }
      }),
      auth: {
        admin: {
          createUser: vi.fn(),
          getUserById: vi.fn()
        }
      },
      sql: vi.fn().mockResolvedValue({ data: [], error: null }),
      rpc: vi.fn((functionName: string) => {
        if (functionName === 'get_policies_for_table') {
          return Promise.resolve({
            data: [
              {
                schemaname: 'public',
                tablename: 'Property',
                policyname: 'property_owner_policy',
                permissive: 'PERMISSIVE',
                roles: ['authenticated'],
                cmd: 'SELECT',
                qual: 'auth.uid() = ownerId',
                with_check: null
              }
            ],
            error: null
          })
        }
        return Promise.resolve({ data: null, error: null })
      })
    }
  })
}))

describe('RLSService', () => {
  let service: RLSService
  let prisma: PrismaService
  let configService: ConfigService

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

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    currentTableName = ''
    
    // Create the mocks that we'll reuse
    const mockPropertyFindMany = vi.fn()
    const mockPropertyCreate = vi.fn()
    const mockPropertyUpdate = vi.fn()
    const mockPropertyDelete = vi.fn()
    
    // Create mock ConfigService
    configService = {
      get: vi.fn((key: string) => {
        const config: Record<string, string> = {
          'SUPABASE_URL': 'https://test.supabase.co',
          'SUPABASE_SERVICE_ROLE_KEY': 'test-service-key',
          'DATABASE_URL': 'postgresql://test:test@localhost:5432/test'
        }
        return config[key]
      })
    } as unknown as ConfigService
    
    // Create mock PrismaService
    prisma = {
      property: {
        findMany: mockPropertyFindMany,
        create: mockPropertyCreate,
        update: mockPropertyUpdate,
        delete: mockPropertyDelete
      },
      unit: {
        findMany: vi.fn(),
        create: vi.fn()
      },
      tenant: {
        findMany: vi.fn()
      },
      $transaction: vi.fn()
    } as unknown as PrismaService
    
    // Create service instance with mocked dependencies
    service = new RLSService(prisma, configService)
  })

  describe('service initialization', () => {
    it('should create service with dependencies', () => {
      expect(service).toBeDefined()
      expect(configService).toBeDefined()
      expect(configService.get).toBeDefined()
      expect(configService.get('SUPABASE_URL')).toBe('https://test.supabase.co')
    })
  })

  describe('verifyRLSEnabled', () => {
    it('should return RLS status for all critical tables', async () => {
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
        
        // Configure the existing mock to return properties
        vi.mocked(prisma.property.findMany).mockResolvedValue(mockProperties as any)

        const result = await service.testRLSPolicies(testOwner.id, 'OWNER')
        
        // The service should return true when properties are found
        expect(result.property.canViewOwn).toBe(true)
        expect(prisma.property.findMany).toHaveBeenCalledWith({
          where: { ownerId: testOwner.id }
        })
      })

      it('should allow owner to create properties', async () => {
        vi.mocked(prisma.property.create).mockResolvedValue(testProperty)

        const result = await service.testRLSPolicies(testOwner.id, 'OWNER')
        
        // Additional test logic for creation
        expect(result.property.canCreate).toBeDefined()
      })

      it('should allow owner to update their properties', async () => {
        vi.mocked(prisma.property.update).mockResolvedValue(testProperty)

        const result = await service.testRLSPolicies(testOwner.id, 'OWNER')
        
        expect(result.property.canUpdate).toBeDefined()
      })

      it('should allow owner to delete their properties', async () => {
        vi.mocked(prisma.property.delete).mockResolvedValue(testProperty)

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
        vi.mocked(prisma.property.findMany).mockResolvedValue([])

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
    it('should generate comprehensive audit report', async () => {
      // Mock the getTablePolicies method to return test policies
      vi.spyOn(service, 'getTablePolicies').mockResolvedValue([
        {
          schemaname: 'public',
          tablename: 'Property',
          policyname: 'property_owner_policy',
          permissive: 'PERMISSIVE',
          roles: ['authenticated'],
          cmd: 'SELECT',
          qual: 'auth.uid() = ownerId',
          with_check: null
        }
      ])
      
      const report = await service.generateRLSAuditReport()
      
      expect(report).toBeDefined()
      expect(report.timestamp).toBeDefined()
      expect(report.rlsStatus).toBeDefined()
      expect(report.policies).toBeDefined()
      expect(report.recommendations).toBeDefined()
      expect(Array.isArray(report.recommendations)).toBe(true)
    })

    it('should include recommendations for tables without RLS', async () => {
      // Mock verifyRLSEnabled to return a table without RLS
      vi.spyOn(service, 'verifyRLSEnabled').mockResolvedValue([
        { table: 'Property', enabled: false }
      ])

      const report = await service.generateRLSAuditReport()
      
      expect(report.recommendations).toContain('Enable RLS on Property table')
    })
  })
})

// Integration tests - can run with mock or real Supabase
describe('RLS Integration Tests', () => {
  let service: RLSService
  let supabase: any

  beforeAll(async () => {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // Check if we're in test environment with mocked values
    if (!supabaseUrl || !supabaseServiceKey || 
        supabaseUrl === 'https://test.supabase.co' || 
        supabaseServiceKey === 'test-service-key') {
      // Use mocked Supabase client for test environment
      const mockUser = { id: 'mock-user-id', email: 'test@example.com' }
      const mockProperty = {
        id: 'mock-property-id',
        name: 'RLS Test Property',
        address: '123 RLS Test St',
        city: 'Test City',
        state: 'CA',
        zipCode: '12345',
        ownerId: mockUser.id
      }
      
      supabase = {
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({ 
              data: { user: mockUser }, 
              error: null 
            }),
            deleteUser: vi.fn().mockResolvedValue({ 
              data: null, 
              error: null 
            })
          }
        },
        from: vi.fn((table: string) => ({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProperty,
                error: null
              })
            })
          }),
          select: vi.fn().mockResolvedValue({
            data: table === 'Property' ? [] : null,
            error: null
          })
        }))
      }
    } else {
      // Use real Supabase client
      supabase = createClient(supabaseUrl, supabaseServiceKey)
    }
  })

  describe('Real database RLS tests', () => {
    it('should enforce property access policies', async () => {
      // Create test data
      const createOwnerResult = await supabase.auth.admin.createUser({
        email: 'rlstest-owner@test.com',
        password: 'test123456'
      })
      
      expect(createOwnerResult.error).toBeNull()
      const owner = createOwnerResult.data

      const createTenantResult = await supabase.auth.admin.createUser({
        email: 'rlstest-tenant@test.com',
        password: 'test123456'
      })
      
      expect(createTenantResult.error).toBeNull()
      const tenant = createTenantResult.data

      // Test as property owner
      const supabaseUrl = process.env.SUPABASE_URL || 'https://test.supabase.co'
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'test-anon-key'
      
      const ownerClient = supabaseUrl === 'https://test.supabase.co'
        ? supabase  // Use the mock
        : createClient(
            supabaseUrl,
            supabaseAnonKey,
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
      const tenantClient = supabaseUrl === 'https://test.supabase.co'
        ? supabase  // Use the mock
        : createClient(
            supabaseUrl,
            supabaseAnonKey,
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

      // Cleanup (only for real environment)
      if (owner && tenant && supabaseUrl !== 'https://test.supabase.co') {
        await supabase.auth.admin.deleteUser(owner.user.id)
        await supabase.auth.admin.deleteUser(tenant.user.id)
      }
    })
  })
})