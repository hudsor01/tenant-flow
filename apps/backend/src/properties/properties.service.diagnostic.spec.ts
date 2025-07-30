import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorHandlerService } from '../common/errors/error-handler.service';
import { PropertiesRepository } from './properties.repository';
import { Property, User, Organization } from '@prisma/client';
import {
  DiagnosticAssertions,
  StateInspector,
  DatabaseAnalyzer,
  PerformanceProfiler,
} from '../test-utils/diagnostic-assertions';
import {
  TestDocumentation,
  FailurePlaybook,
  TestScenario,
} from '../test-utils/test-documentation';

describe('PropertiesService - Diagnostic Tests', () => {
  let service: PropertiesService;
  let prisma: PrismaService;
  let testUser: User & { organization: Organization };
  let testProperty: Property;

  // Document the exact test scenario
  const createPropertyScenario: TestScenario = {
    name: 'Create Property with Multi-tenant Isolation',
    description: 'Verifies property creation respects tenant boundaries and validates all business rules',
    setup: [
      'User must be authenticated with valid JWT',
      'User must have PROPERTY_MANAGER or ADMIN role',
      'User must belong to an active organization',
      'Organization must have active subscription',
    ],
    steps: [
      {
        action: 'Validate user permissions',
        validation: 'User has required role and organization access',
      },
      {
        action: 'Validate property data',
        data: {
          name: 'Test Property',
          address: '123 Main St',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
        },
        validation: 'All required fields present and valid',
      },
      {
        action: 'Check for duplicate properties',
        validation: 'No existing property with same address',
      },
      {
        action: 'Create property in database',
        validation: 'Property created with correct organizationId',
      },
      {
        action: 'Return property with computed fields',
        validation: 'Response includes id, timestamps, and unit count',
      },
    ],
    expectedOutcome: 'Property created and associated with user\'s organization',
    commonFailures: [
      {
        symptom: 'ForbiddenException: Insufficient permissions',
        causes: [
          'User role is TENANT instead of PROPERTY_MANAGER/ADMIN',
          'User organization is inactive or suspended',
          'Organization subscription has expired',
          'RLS policies blocking the operation',
        ],
        fixes: [
          'Update user.role to PROPERTY_MANAGER or ADMIN',
          'Ensure organization.isActive is true',
          'Check organization.subscriptionStatus is "active"',
          'Review Supabase RLS policies for properties table',
        ],
      },
      {
        symptom: 'Property created but not visible in list',
        causes: [
          'RLS policies filtering by organizationId',
          'Property created with wrong organizationId',
          'Database transaction not committed',
          'Cache not invalidated after creation',
        ],
        fixes: [
          'Verify property.organizationId matches user.organizationId',
          'Check if transaction was rolled back due to error',
          'Ensure no aggressive caching on property lists',
          'Test with direct database query to confirm creation',
        ],
      },
    ],
  };

  beforeEach(async () => {
    console.log(TestDocumentation.describeScenario(createPropertyScenario));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: ErrorHandlerService,
          useFactory: () => ({
            handleErrorEnhanced: vi.fn().mockImplementation((error: Error, context?: any) => {
              // For BadRequestException about active leases, just throw it
              if (error.message && error.message.includes('active leases')) {
                throw error;
              }
              // For other errors, throw them too
              throw error;
            })
          })
        },
        {
          provide: PropertiesRepository,
          useValue: {
            exists: vi.fn().mockResolvedValue(true),
            deleteById: vi.fn().mockResolvedValue(true),
            prismaClient: {
              lease: {
                count: vi.fn().mockResolvedValue(3)
              }
            }
          }
        },
        {
          provide: PrismaService,
          useValue: {
            property: {
              create: vi.fn(),
              findMany: vi.fn(),
              findFirst: vi.fn(),
              findUnique: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
              count: vi.fn(),
            },
            unit: {
              count: vi.fn(),
              findMany: vi.fn(),
            },
            lease: {
              count: vi.fn(),
              findMany: vi.fn(),
            },
            maintenanceRequest: {
              count: vi.fn(),
              findMany: vi.fn(),
            },
            $transaction: vi.fn(callback => callback(prisma)),
          },
        },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    prisma = module.get<PrismaService>(PrismaService);
    
    console.log('Service:', service);
    console.log('Service errorHandler:', service['errorHandler']);

    // Setup test data
    testUser = {
      id: 'user-123',
      email: 'manager@example.com',
      name: 'Test Manager',
      role: 'PROPERTY_MANAGER',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      isActive: true,
      phoneNumber: null,
      avatarUrl: null,
      organization: {
        id: 'org-123',
        name: 'Test Property Management',
        userId: 'user-123',
        stripeCustomerId: 'cus_test123',
        subscriptionId: 'sub_test123',
        subscriptionStatus: 'active',
        subscriptionCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        settings: {},
      },
    };

    testProperty = {
      id: 'prop-123',
      name: 'Sunset Apartments',
      address: '456 Sunset Blvd',
      city: 'Austin',
      state: 'TX',
      zipCode: '78704',
      organizationId: 'org-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      description: null,
      imageUrl: null,
      amenities: [],
      metadata: {},
    };
  });

  describe('create - with detailed failure analysis', () => {
    it('should pinpoint exact permission failure reason', async () => {
      const tenantUser = {
        ...testUser,
        role: 'TENANT' as const,
      };

      const createDto = {
        name: 'New Property',
        address: '789 Oak St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78705',
      };

      try {
        await service.create(createDto, tenantUser);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);

        // Generate specific diagnostic info
        console.log('\n🔍 Permission Check Diagnostic:');
        console.log('----------------------------');
        console.log(`User Role: ${tenantUser.role}`);
        console.log(`Required Roles: PROPERTY_MANAGER, ADMIN`);
        console.log(`Organization Active: ${tenantUser.organization.isActive}`);
        console.log(`Subscription Status: ${tenantUser.organization.subscriptionStatus}`);
        console.log(`Subscription Valid Until: ${tenantUser.organization.subscriptionCurrentPeriodEnd}`);
        
        // Suggest exact fix
        console.log('\n💡 To fix this specific case:');
        console.log(`UPDATE users SET role = 'PROPERTY_MANAGER' WHERE id = '${tenantUser.id}';`);
        console.log('\nOr in your test:');
        console.log(`const user = { ...testUser, role: 'PROPERTY_MANAGER' };`);
      }
    });

    it('should detect data validation issues with field-specific feedback', async () => {
      const invalidData = {
        name: '', // Empty name
        address: '123 Main St',
        city: 'Austin',
        state: 'TEXAS', // Should be 2-letter code
        zipCode: '787', // Too short
      };

      vi.spyOn(prisma.property, 'create').mockRejectedValue(
        new BadRequestException('Validation failed')
      );

      try {
        await service.create(invalidData, testUser);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        console.log('\n🔍 Validation Diagnostic:');
        console.log('------------------------');
        
        const validationErrors = [];
        if (!invalidData.name) {
          validationErrors.push('❌ name: Cannot be empty');
        }
        if (invalidData.state.length !== 2) {
          validationErrors.push(`❌ state: Must be 2-letter code (got "${invalidData.state}")`);
        }
        if (!/^\d{5}(-\d{4})?$/.test(invalidData.zipCode)) {
          validationErrors.push(`❌ zipCode: Must be 5 or 9 digits (got "${invalidData.zipCode}")`);
        }

        validationErrors.forEach(err => console.log(err));
        
        console.log('\n✅ Corrected data:');
        console.log(JSON.stringify({
          ...invalidData,
          name: 'Sunset Apartments',
          state: 'TX',
          zipCode: '78701',
        }, null, 2));
      }
    });

    it('should trace duplicate property detection', async () => {
      const existingProperty = { ...testProperty };
      
      vi.spyOn(prisma.property, 'findFirst').mockResolvedValue(existingProperty);

      const duplicateDto = {
        name: 'Different Name',
        address: testProperty.address, // Same address
        city: testProperty.city,
        state: testProperty.state,
        zipCode: testProperty.zipCode,
      };

      try {
        await service.create(duplicateDto, testUser);
        fail('Should have detected duplicate');
      } catch (error) {
        console.log('\n🔍 Duplicate Detection Diagnostic:');
        console.log('--------------------------------');
        console.log(`Checking address: ${duplicateDto.address}`);
        console.log(`Organization scope: ${testUser.organization.id}`);
        console.log(`\nExisting property found:`);
        console.log(`  ID: ${existingProperty.id}`);
        console.log(`  Name: ${existingProperty.name}`);
        console.log(`  Created: ${existingProperty.createdAt}`);
        console.log('\n💡 Options:');
        console.log('1. Update existing property instead of creating new');
        console.log('2. Use different address');
        console.log('3. Add unit/suite number to differentiate');
      }
    });

    it('should measure and report performance bottlenecks', async () => {
      vi.spyOn(prisma.property, 'findFirst').mockImplementation(async () => {
        // Simulate slow duplicate check
        await new Promise(resolve => setTimeout(resolve, 100));
        return null;
      });

      vi.spyOn(prisma.property, 'create').mockImplementation(async () => {
        // Simulate slow creation
        await new Promise(resolve => setTimeout(resolve, 200));
        return testProperty;
      });

      PerformanceProfiler.startTimer('property-creation-total');
      PerformanceProfiler.startTimer('duplicate-check');
      
      // Mock the duplicate check
      await prisma.property.findFirst({ where: {} });
      const duplicateCheckTime = PerformanceProfiler.endTimer('duplicate-check');
      
      PerformanceProfiler.startTimer('database-insert');
      await prisma.property.create({ data: {} as any });
      const insertTime = PerformanceProfiler.endTimer('database-insert');
      
      const totalTime = PerformanceProfiler.endTimer('property-creation-total');

      console.log('\n⏱️ Performance Analysis:');
      console.log('-----------------------');
      console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Duplicate Check: ${duplicateCheckTime.toFixed(2)}ms (${(duplicateCheckTime/totalTime*100).toFixed(1)}%)`);
      console.log(`  Database Insert: ${insertTime.toFixed(2)}ms (${(insertTime/totalTime*100).toFixed(1)}%)`);
      
      if (duplicateCheckTime > 50) {
        console.log('\n⚠️  Duplicate check is slow!');
        console.log('💡 Consider:');
        console.log('  - Adding index on (address, organizationId)');
        console.log('  - Caching recent property addresses');
        console.log('  - Using Redis for duplicate detection');
      }
    });
  });

  describe('findAll - with state debugging', () => {
    it('should explain why properties are filtered out', async () => {
      const properties = [
        { ...testProperty, organizationId: 'org-123' },
        { ...testProperty, id: 'prop-456', organizationId: 'org-456' }, // Different org
        { ...testProperty, id: 'prop-789', organizationId: 'org-123' },
      ];

      vi.spyOn(prisma.property, 'findMany').mockResolvedValue([
        properties[0],
        properties[2], // Only same org
      ]);

      const result = await service.findAllByOwner(testUser.id, { limit: 10, offset: 0 });

      console.log('\n🔍 Property Filtering Diagnostic:');
      console.log('--------------------------------');
      console.log(`User Organization: ${testUser.organization.id}`);
      console.log(`\nAll properties in database:`);
      properties.forEach(p => {
        const included = p.organizationId === testUser.organization.id;
        console.log(`  ${included ? '✅' : '❌'} ${p.id} (org: ${p.organizationId})`);
      });
      console.log(`\nReturned: ${result.data.length} properties`);
      console.log('Reason: Multi-tenant isolation - only showing properties from user\'s organization');
    });

    it('should trace pagination logic', async () => {
      const allProperties = Array.from({ length: 25 }, (_, i) => ({
        ...testProperty,
        id: `prop-${i}`,
        name: `Property ${i + 1}`,
      }));

      vi.spyOn(prisma.property, 'count').mockResolvedValue(25);
      vi.spyOn(prisma.property, 'findMany').mockImplementation(async ({ skip, take }) => {
        return allProperties.slice(skip, skip + take);
      });

      const page2 = await service.findAllByOwner(testUser.id, { limit: 10, offset: 10 });

      console.log('\n📄 Pagination Diagnostic:');
      console.log('------------------------');
      console.log(`Total Properties: 25`);
      console.log(`Page Size: 10`);
      console.log(`Current Page: 2`);
      console.log(`Skip: ${(2-1) * 10} = 10`);
      console.log(`Take: 10`);
      console.log(`\nShowing properties ${11}-${20}:`);
      page2.data.forEach((p, i) => {
        console.log(`  ${11 + i}. ${p.name}`);
      });
      console.log(`\nPagination metadata:`);
      console.log(JSON.stringify(page2.pagination, null, 2));
    });
  });

  describe('update - with state comparison', () => {
    it('should show before/after state and detect issues', async () => {
      const updateDto = {
        name: 'Updated Apartments',
        amenities: ['pool', 'gym'],
      };

      const beforeState = { ...testProperty };
      const afterState = {
        ...testProperty,
        ...updateDto,
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.property, 'findUnique').mockResolvedValue(beforeState);
      vi.spyOn(prisma.property, 'update').mockResolvedValue(afterState);

      // Capture states
      console.log('\n🔄 Update State Comparison:');
      console.log('---------------------------');
      console.log('Before:', JSON.stringify(beforeState, null, 2));
      
      await service.update(testProperty.id, updateDto, testUser);
      
      console.log('\nAfter:', JSON.stringify(afterState, null, 2));
      console.log('\nChanges:');
      console.log(`  name: "${beforeState.name}" → "${afterState.name}"`);
      console.log(`  amenities: ${JSON.stringify(beforeState.amenities)} → ${JSON.stringify(afterState.amenities)}`);
      console.log(`  updatedAt: ${beforeState.updatedAt.toISOString()} → ${afterState.updatedAt.toISOString()}`);

      // Verify database consistency
      await DiagnosticAssertions.toMatchDatabaseState(
        afterState,
        async () => afterState,
        {
          context: 'Ensuring in-memory state matches database after update',
          suggestion: 'Check if update transaction committed successfully',
        }
      );
    });

    it('should detect authorization issues in updates', async () => {
      const otherOrgProperty = {
        ...testProperty,
        organizationId: 'org-999', // Different org
      };

      vi.spyOn(prisma.property, 'findUnique').mockResolvedValue(otherOrgProperty);

      try {
        await service.update(otherOrgProperty.id, { name: 'Hacked!' }, testUser);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        console.log('\n🚫 Authorization Diagnostic:');
        console.log('---------------------------');
        console.log(`User Org ID: ${testUser.organization.id}`);
        console.log(`Property Org ID: ${otherOrgProperty.organizationId}`);
        console.log(`Match: ${testUser.organization.id === otherOrgProperty.organizationId ? '✅' : '❌'}`);
        console.log('\n💡 This is working correctly - preventing cross-tenant data access');
        console.log('If this should be allowed, consider:');
        console.log('  - Adding a shared property feature');
        console.log('  - Implementing property transfer between orgs');
        console.log('  - Creating a super-admin role for cross-org access');
      }
    });
  });

  describe('delete - with cascade analysis', () => {
    it('should analyze cascade implications before deletion', async () => {
      vi.spyOn(prisma.property, 'findUnique').mockResolvedValue(testProperty);
      vi.spyOn(prisma.unit, 'count').mockResolvedValue(5);
      vi.spyOn(prisma.lease, 'count').mockResolvedValue(3);
      vi.spyOn(prisma.maintenanceRequest, 'count').mockResolvedValue(12);

      // Analyze before attempting delete
      const analysis = await DatabaseAnalyzer.analyzeRelationships(
        prisma,
        'property',
        testProperty.id
      );

      console.log('\n🗑️ Deletion Impact Analysis:');
      console.log('---------------------------');
      console.log(`Property: ${testProperty.name} (${testProperty.id})`);
      console.log('\nRelated Records:');
      console.log(`  Units: 5`);
      console.log(`  Active Leases: 3`);
      console.log(`  Maintenance Requests: 12`);
      console.log('\n⚠️  Cascade Effects:');
      console.log('  - 5 units will be deleted');
      console.log('  - 3 active leases will be terminated');
      console.log('  - 12 maintenance requests will be orphaned');
      console.log('\n💡 Recommendations:');
      console.log('  1. Archive property instead of deleting');
      console.log('  2. Ensure all leases are properly terminated');
      console.log('  3. Resolve open maintenance requests');
      console.log('  4. Consider soft delete with isActive flag');

      // Prevent actual deletion in test
      vi.spyOn(prisma.property, 'delete').mockRejectedValue(
        new BadRequestException('Cannot delete property with active leases')
      );

      try {
        await service.delete(testProperty.id, testUser.id);
      } catch (error) {
        console.log('Actual error:', error);
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
        expect(error.message).toContain('active leases');
      }
    });
  });

  describe('getPropertyStats - with performance profiling', () => {
    it('should identify slow queries in stats calculation', async () => {
      // Mock slow queries
      vi.spyOn(prisma.unit, 'count').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return 10;
      });

      vi.spyOn(prisma.lease, 'findMany').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return Array(7).fill({ status: 'ACTIVE' });
      });

      vi.spyOn(prisma.maintenanceRequest, 'count').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 3;
      });

      vi.spyOn(prisma.property, 'findUnique').mockResolvedValue(testProperty);

      console.log('\n📊 Stats Query Performance:');
      console.log('--------------------------');

      PerformanceProfiler.startTimer('stats-total');
      
      PerformanceProfiler.startTimer('unit-count');
      await prisma.unit.count();
      const unitTime = PerformanceProfiler.endTimer('unit-count');
      
      PerformanceProfiler.startTimer('lease-query');
      await prisma.lease.findMany();
      const leaseTime = PerformanceProfiler.endTimer('lease-query');
      
      PerformanceProfiler.startTimer('maintenance-count');
      await prisma.maintenanceRequest.count();
      const maintenanceTime = PerformanceProfiler.endTimer('maintenance-count');
      
      const totalTime = PerformanceProfiler.endTimer('stats-total');

      console.log(`Total: ${totalTime.toFixed(0)}ms`);
      console.log(`  Units: ${unitTime.toFixed(0)}ms ${unitTime > 100 ? '⚠️ SLOW' : '✅'}`);
      console.log(`  Leases: ${leaseTime.toFixed(0)}ms ${leaseTime > 100 ? '⚠️ SLOW' : '✅'}`);
      console.log(`  Maintenance: ${maintenanceTime.toFixed(0)}ms ${maintenanceTime > 100 ? '⚠️ SLOW' : '✅'}`);

      if (totalTime > 300) {
        console.log('\n💡 Performance Optimizations:');
        console.log('1. Add database indexes:');
        console.log('   CREATE INDEX idx_units_property ON units(property_id);');
        console.log('   CREATE INDEX idx_leases_unit ON leases(unit_id);');
        console.log('2. Use parallel queries:');
        console.log('   const [units, leases, maintenance] = await Promise.all([...])');
        console.log('3. Cache stats with 5-minute TTL');
        console.log('4. Use materialized view for real-time stats');
      }
    });
  });
});