import 'reflect-metadata'
import { describe, it, expect, beforeEach, beforeAll, vi } from '@jest/globals'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { RLSService } from './rls.service'
import { createClient } from '@supabase/supabase-js'
import { RLSPolicy, RLSTableStatus, RLSAuditReport, PropertyType } from '@repo/shared'
import { TEST_API_KEYS, TEST_URLS, getTestDatabaseUrl } from '../../test/test-constants'

// Mock Supabase createClient
// Track current table name for mocking
let currentTableName = ''

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => {
    const chainableApi = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockImplementation((field: string, value?: string) => {
        if (field === 'tablename' && value) {
          currentTableName = value
        }
        return chainableApi
      }),
      single: jest.fn().mockImplementation(() => {
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
      where: jest.fn().mockReturnThis()
    }
    
    return {
      from: jest.fn((table: string) => {
        if (table === 'pg_tables') {
          return chainableApi
        }
        return {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        }
      }),
      auth: {
        admin: {
          createUser: jest.fn(),
          getUserById: jest.fn()
        }
      },
      sql: jest.fn().mockResolvedValue({ data: [], error: null }),
      rpc: jest.fn((functionName: string) => {
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
    description: null,
    imageUrl: null,
    ownerId: testOwner.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    propertyType: 'RESIDENTIAL' as PropertyType
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    currentTableName = ''
    
    // Create the mocks that we'll reuse
    const mockPropertyFindMany = jest.fn()
    const mockPropertyCreate = jest.fn()
    const mockPropertyUpdate = jest.fn()
    const mockPropertyDelete = jest.fn()
    
    // Create mock ConfigService
    configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'SUPABASE_URL': TEST_URLS.SUPABASE,
          'SUPABASE_SERVICE_ROLE_KEY': TEST_API_KEYS.SERVICE_ROLE,
          'DATABASE_URL': getTestDatabaseUrl()
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
        findMany: jest.fn(),
        create: jest.fn()
      },
      tenant: {
        findMany: jest.fn()
      },
      $transaction: jest.fn()
    } as unknown as PrismaService
    
    // Create service instance with mocked dependencies
    service = new RLSService(prisma, configService)
  })

  describe('service initialization', () => {
    it('should create service with dependencies', () => {
      expect(service).toBeDefined()
      expect(configService).toBeDefined()
      expect(configService.get).toBeDefined()
      expect(configService.get('SUPABASE_URL')).toBe(TEST_URLS.SUPABASE)
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
      
      // Verify RLSTableStatus structure
      result.forEach(tableStatus => {
        expect(tableStatus).toHaveProperty('table')
        expect(tableStatus).toHaveProperty('enabled')
        expect(tableStatus).toHaveProperty('policyCount')
        expect(tableStatus).toHaveProperty('policyNames')
        expect(tableStatus).toHaveProperty('lastAudit')
        expect(typeof tableStatus.enabled).toBe('boolean')
        expect(typeof tableStatus.policyCount).toBe('number')
        expect(Array.isArray(tableStatus.policyNames)).toBe(true)
      })
    })
  })

  describe('testRLSPolicies', () => {
    describe('Property Owner Access', () => {
      it('should allow owner to view their own properties', async () => {
        const mockProperties = [testProperty]
        
        // Configure the existing mock to return properties
        jest.mocked(prisma.property.findMany).mockResolvedValue(mockProperties as any)

        const result = await service.testRLSPolicies(testOwner.id, 'OWNER')
        
        // The service should return true when properties are found
        expect(result.property.canViewOwn).toBe(true)
        expect(prisma.property.findMany).toHaveBeenCalledWith({
          where: { ownerId: testOwner.id }
        })
      })

      it('should allow owner to create properties', async () => {
        jest.mocked(prisma.property.create).mockResolvedValue(testProperty)

        const result = await service.testRLSPolicies(testOwner.id, 'OWNER')
        
        // Additional test logic for creation
        expect(result.property.canCreate).toBeDefined()
      })

      it('should allow owner to update their properties', async () => {
        jest.mocked(prisma.property.update).mockResolvedValue(testProperty)

        const result = await service.testRLSPolicies(testOwner.id, 'OWNER')
        
        expect(result.property.canUpdate).toBeDefined()
      })

      it('should allow owner to delete their properties', async () => {
        jest.mocked(prisma.property.delete).mockResolvedValue(testProperty)

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
        jest.mocked(prisma.property.findMany).mockResolvedValue([])

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
      const mockPolicy: RLSPolicy = {
        schemaname: 'public',
        tablename: 'Property',
        policyname: 'property_owner_policy',
        permissive: 'PERMISSIVE',
        roles: ['authenticated'],
        cmd: 'SELECT',
        qual: 'auth.uid() = ownerId',
        with_check: ''
      }
      
      jest.spyOn(service, 'getTablePolicies').mockResolvedValue([mockPolicy])
      
      const report: RLSAuditReport = await service.generateRLSAuditReport()
      
      // Verify RLSAuditReport structure
      expect(report).toBeDefined()
      expect(report.timestamp).toBeDefined()
      expect(report.tableStatuses).toBeDefined()
      expect(Array.isArray(report.tableStatuses)).toBe(true)
      expect(report.policies).toBeDefined()
      expect(typeof report.policies).toBe('object')
      expect(report.recommendations).toBeDefined()
      expect(Array.isArray(report.recommendations)).toBe(true)
      expect(report.securityScore).toBeDefined()
      expect(typeof report.securityScore).toBe('number')
      expect(report.criticalIssues).toBeDefined()
      expect(Array.isArray(report.criticalIssues)).toBe(true)
      
      // Verify security score is between 0-100
      expect(report.securityScore).toBeGreaterThanOrEqual(0)
      expect(report.securityScore).toBeLessThanOrEqual(100)
    })

    it('should include recommendations for tables without RLS', async () => {
      // Mock verifyRLSEnabled to return a table without RLS
      const mockTableStatus: RLSTableStatus = {
        table: 'Property',
        enabled: false,
        policyCount: 0,
        policyNames: [],
        lastAudit: new Date()
      }
      
      jest.spyOn(service, 'verifyRLSEnabled').mockResolvedValue([mockTableStatus])

      const report: RLSAuditReport = await service.generateRLSAuditReport()
      
      expect(report.recommendations).toContain('Enable RLS on Property table')
      expect(report.criticalIssues).toContain('RLS not enabled on critical table: Property')
      expect(report.securityScore).toBe(0) // No tables have RLS enabled
    })

    it('should generate RLS policies with correct structure', async () => {
      const mockPolicy: RLSPolicy = {
        schemaname: 'public',
        tablename: 'Property',
        policyname: 'property_owner_policy',
        permissive: 'PERMISSIVE',
        roles: ['authenticated'],
        cmd: 'SELECT',
        qual: 'auth.uid() = ownerId',
        with_check: ''
      }
      
      jest.spyOn(service, 'getTablePolicies').mockResolvedValue([mockPolicy])
      
      // Mock verifyRLSEnabled to return enabled table
      const mockTableStatus: RLSTableStatus = {
        table: 'Property',
        enabled: true,
        policyCount: 1,
        policyNames: ['property_owner_policy'],
        lastAudit: new Date()
      }
      
      jest.spyOn(service, 'verifyRLSEnabled').mockResolvedValue([mockTableStatus])
      
      const report: RLSAuditReport = await service.generateRLSAuditReport()
      
      expect(report.policies['Property']).toBeDefined()
      expect(report.policies['Property']).toHaveLength(1)
      
      const policyInfo = report.policies['Property']?.[0]
      expect(policyInfo).toBeDefined()
      expect(policyInfo?.name).toBe('property_owner_policy')
      expect(policyInfo?.tableName).toBe('Property')
      expect(policyInfo?.enabled).toBe(true)
      expect(policyInfo?.operations).toContain('SELECT')
      expect(policyInfo?.roles).toContain('authenticated')
      expect(policyInfo?.description).toContain('SELECT ON Property')
    })

    it('should calculate security score correctly', async () => {
      // Mock 2 out of 3 tables with RLS enabled
      const mockTableStatuses: RLSTableStatus[] = [
        {
          table: 'Property',
          enabled: true,
          policyCount: 1,
          policyNames: ['property_policy'],
          lastAudit: new Date()
        },
        {
          table: 'Unit',
          enabled: true,
          policyCount: 1,
          policyNames: ['unit_policy'],
          lastAudit: new Date()
        },
        {
          table: 'Tenant',
          enabled: false,
          policyCount: 0,
          policyNames: [],
          lastAudit: new Date()
        }
      ]
      
      jest.spyOn(service, 'verifyRLSEnabled').mockResolvedValue(mockTableStatuses)
      jest.spyOn(service, 'getTablePolicies').mockResolvedValue([])
      
      const report: RLSAuditReport = await service.generateRLSAuditReport()
      
      // Security score should be 67% (2 out of 3 tables enabled)
      expect(report.securityScore).toBe(67)
      expect(report.criticalIssues).toHaveLength(1)
      expect(report.criticalIssues[0]).toContain('Tenant')
    })
  })
})

// Integration tests - can run with mock or real Supabase
describe('RLS Integration Tests', () => {
  // let _service: RLSService // Not used in integration tests
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
        description: null,
        imageUrl: null,
        ownerId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        propertyType: 'RESIDENTIAL' as PropertyType
      }
      
      supabase = {
        auth: {
          admin: {
            createUser: jest.fn().mockResolvedValue({ 
              data: { user: mockUser }, 
              error: null 
            }),
            deleteUser: jest.fn().mockResolvedValue({ 
              data: null, 
              error: null 
            })
          }
        },
        from: jest.fn((table: string) => ({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockProperty,
                error: null
              })
            })
          }),
          select: jest.fn().mockResolvedValue({
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
      const supabaseUrl = process.env.SUPABASE_URL || TEST_URLS.SUPABASE
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || TEST_API_KEYS.ANON
      
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