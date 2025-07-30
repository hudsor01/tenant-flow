import { test, expect } from '@playwright/test'
import { TestDataFactory } from '../config/test-data-factory'
import { PerformanceTestHelper, ApiTestHelper, DatabaseTestHelper } from '../config/test-helpers'

/**
 * Performance Tests for TenantFlow API Endpoints
 * Tests response times, throughput, and system behavior under load
 */
test.describe('API Performance Tests', () => {
  let testLandlord: any
  let apiHelper: ApiTestHelper
  let performanceHelper: PerformanceTestHelper

  test.beforeAll(async () => {
    await DatabaseTestHelper.setupDatabase()
    
    // Create performance test data
    await TestDataFactory.createPerformanceTestData('medium')
    
    testLandlord = await TestDataFactory.createLandlord()
    performanceHelper = new PerformanceTestHelper()
  })

  test.afterAll(async () => {
    await DatabaseTestHelper.teardownDatabase()
  })

  test.describe('Property Management API Performance', () => {
    test('should handle property list requests efficiently', async ({ request }) => {
      // Measure property list endpoint performance
      const results = await PerformanceTestHelper.measureApiEndpoint(
        async () => {
          const response = await request.get('/api/properties', {
            headers: {
              'Authorization': `Bearer ${generateTestToken(testLandlord.id)}`
            }
          })
          expect(response.status()).toBe(200)
          return response.json()
        },
        { iterations: 20, warmup: 3 }
      )

      // Performance assertions
      expect(results.averageResponseTime).toBeLessThan(500) // < 500ms average
      expect(results.maxResponseTime).toBeLessThan(1000) // < 1s max
      expect(results.successRate).toBe(100) // 100% success rate

      console.log('Property List Performance:', {
        averageResponseTime: `${results.averageResponseTime}ms`,
        maxResponseTime: `${results.maxResponseTime}ms`,
        minResponseTime: `${results.minResponseTime}ms`,
        successRate: `${results.successRate}%`
      })
    })

    test('should handle property creation under load', async ({ request }) => {
      let createdProperties: string[] = []

      const results = await PerformanceTestHelper.measureApiEndpoint(
        async () => {
          const propertyData = {
            name: `Load Test Property ${Date.now()}`,
            address: '123 Load Test St',
            city: 'Test City',
            state: 'CA',
            zipCode: '90210',
            type: 'APARTMENT',
            monthlyRent: 2000
          }

          const response = await request.post('/api/properties', {
            headers: {
              'Authorization': `Bearer ${generateTestToken(testLandlord.id)}`,
              'Content-Type': 'application/json'
            },
            data: propertyData
          })

          expect(response.status()).toBe(201)
          const result = await response.json()
          createdProperties.push(result.id)
          return result
        },
        { iterations: 10, warmup: 2 }
      )

      // Performance assertions for creation
      expect(results.averageResponseTime).toBeLessThan(1000) // < 1s average
      expect(results.successRate).toBe(100)

      // Cleanup created properties
      for (const propertyId of createdProperties) {
        await request.delete(`/api/properties/${propertyId}`, {
          headers: {
            'Authorization': `Bearer ${generateTestToken(testLandlord.id)}`
          }
        })
      }
    })

    test('should handle concurrent property searches', async ({ request }) => {
      // Create concurrent search requests
      const searchQueries = [
        'apartment',
        'house',
        'condo',
        'townhouse',
        'loft'
      ]

      const concurrentResults = await Promise.all(
        searchQueries.map(async (query) => {
          const startTime = Date.now()
          const response = await request.get(`/api/properties/search?q=${query}`, {
            headers: {
              'Authorization': `Bearer ${generateTestToken(testLandlord.id)}`
            }
          })
          const endTime = Date.now()
          
          expect(response.status()).toBe(200)
          return {
            query,
            responseTime: endTime - startTime,
            results: await response.json()
          }
        })
      )

      // All concurrent searches should complete within reasonable time
      const maxConcurrentTime = Math.max(...concurrentResults.map(r => r.responseTime))
      expect(maxConcurrentTime).toBeLessThan(2000) // < 2s for concurrent searches

      console.log('Concurrent Search Performance:', concurrentResults.map(r => 
        `${r.query}: ${r.responseTime}ms`
      ))
    })
  })

  test.describe('Tenant Management API Performance', () => {
    test('should handle tenant invitation workflow efficiently', async ({ request }) => {
      const results = await PerformanceTestHelper.measureApiEndpoint(
        async () => {
          const invitationData = {
            email: `tenant-${Date.now()}@test.com`,
            name: 'Load Test Tenant',
            propertyId: 'test-property-id'
          }

          const response = await request.post('/api/tenants/invite', {
            headers: {
              'Authorization': `Bearer ${generateTestToken(testLandlord.id)}`,
              'Content-Type': 'application/json'
            },
            data: invitationData
          })

          expect(response.status()).toBe(201)
          return response.json()
        },
        { iterations: 15, warmup: 3 }
      )

      expect(results.averageResponseTime).toBeLessThan(800)
      expect(results.successRate).toBe(100)
    })
  })

  test.describe('Lease Management API Performance', () => {
    test('should generate lease PDFs efficiently', async ({ request }) => {
      const property = await TestDataFactory.createProperty(testLandlord.id)
      const unit = await TestDataFactory.createUnit(property.id)
      const tenant = await TestDataFactory.createTenantProfile(
        testLandlord.id, 
        testLandlord.id
      )

      const results = await PerformanceTestHelper.measureApiEndpoint(
        async () => {
          const leaseData = {
            unitId: unit.id,
            tenantId: tenant.id,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            rentAmount: 2000,
            securityDeposit: 2000
          }

          const response = await request.post('/api/leases/generate-pdf', {
            headers: {
              'Authorization': `Bearer ${generateTestToken(testLandlord.id)}`,
              'Content-Type': 'application/json'
            },
            data: leaseData
          })

          expect(response.status()).toBe(200)
          const blob = await response.body()
          expect(blob.length).toBeGreaterThan(1000) // PDF should have reasonable size
          return blob
        },
        { iterations: 5, warmup: 1 } // Fewer iterations for PDF generation
      )

      // PDF generation is more resource-intensive
      expect(results.averageResponseTime).toBeLessThan(3000) // < 3s average
      expect(results.successRate).toBe(100)
    })
  })

  test.describe('Maintenance Request API Performance', () => {
    test('should handle maintenance request creation with file uploads', async ({ request }) => {
      const property = await TestDataFactory.createProperty(testLandlord.id)
      const unit = await TestDataFactory.createUnit(property.id)

      const results = await PerformanceTestHelper.measureApiEndpoint(
        async () => {
          // Simulate file upload with maintenance request
          const formData = new FormData()
          formData.append('title', 'Performance Test Request')
          formData.append('description', 'Test maintenance request for performance testing')
          formData.append('priority', 'MEDIUM')
          formData.append('unitId', unit.id)
          
          // Add mock file data
          const mockFile = new Blob(['mock image data'], { type: 'image/jpeg' })
          formData.append('images', mockFile, 'test-image.jpg')

          const response = await request.post('/api/maintenance-requests', {
            headers: {
              'Authorization': `Bearer ${generateTestToken(testLandlord.id)}`
            },
            multipart: formData
          })

          expect(response.status()).toBe(201)
          return response.json()
        },
        { iterations: 8, warmup: 2 }
      )

      // File upload requests may take longer
      expect(results.averageResponseTime).toBeLessThan(2000) // < 2s average
      expect(results.successRate).toBe(100)
    })
  })

  test.describe('Database Query Performance', () => {
    test('should handle complex queries efficiently', async ({ request }) => {
      // Test complex query with joins and filters
      const results = await PerformanceTestHelper.measureApiEndpoint(
        async () => {
          const response = await request.get('/api/dashboard/analytics', {
            headers: {
              'Authorization': `Bearer ${generateTestToken(testLandlord.id)}`
            },
            params: {
              period: '12months',
              includeMetrics: 'occupancy,revenue,maintenance,tenant-satisfaction'
            }
          })

          expect(response.status()).toBe(200)
          const data = await response.json()
          expect(data.occupancyRate).toBeDefined()
          expect(data.totalRevenue).toBeDefined()
          return data
        },
        { iterations: 10, warmup: 2 }
      )

      // Complex analytics queries should still be fast
      expect(results.averageResponseTime).toBeLessThan(1500) // < 1.5s average
      expect(results.successRate).toBe(100)
    })

    test('should handle pagination efficiently', async ({ request }) => {
      // Test large dataset pagination
      const pageSizes = [10, 25, 50, 100]
      
      for (const pageSize of pageSizes) {
        const results = await PerformanceTestHelper.measureApiEndpoint(
          async () => {
            const response = await request.get('/api/properties', {
              headers: {
                'Authorization': `Bearer ${generateTestToken(testLandlord.id)}`
              },
              params: {
                page: '1',
                limit: pageSize.toString(),
                sort: 'createdAt',
                order: 'desc'
              }
            })

            expect(response.status()).toBe(200)
            const data = await response.json()
            expect(data.properties).toBeDefined()
            expect(data.pagination).toBeDefined()
            return data
          },
          { iterations: 5, warmup: 1 }
        )

        // Pagination performance should be consistent regardless of page size
        expect(results.averageResponseTime).toBeLessThan(600)
        
        console.log(`Pagination Performance (${pageSize} items): ${results.averageResponseTime}ms`)
      }
    })
  })

  test.describe('Memory and Resource Usage', () => {
    test('should handle memory-intensive operations', async ({ request }) => {
      // Test endpoint that processes large amounts of data
      const results = await PerformanceTestHelper.measureApiEndpoint(
        async () => {
          const response = await request.post('/api/reports/generate', {
            headers: {
              'Authorization': `Bearer ${generateTestToken(testLandlord.id)}`,
              'Content-Type': 'application/json'
            },
            data: {
              type: 'comprehensive',
              period: 'year',
              includeAll: true,
              format: 'pdf'
            }
          })

          expect(response.status()).toBe(200)
          return response.json()
        },
        { iterations: 3, warmup: 1 } // Fewer iterations for resource-intensive operations
      )

      // Memory-intensive operations may take longer but should not timeout
      expect(results.averageResponseTime).toBeLessThan(10000) // < 10s
      expect(results.successRate).toBe(100)
    })
  })

  test.describe('Error Handling Performance', () => {
    test('should handle error scenarios efficiently', async ({ request }) => {
      // Test that error responses are fast
      const errorScenarios = [
        { endpoint: '/api/properties/nonexistent', expectedStatus: 404 },
        { endpoint: '/api/tenants/invalid-id', expectedStatus: 404 },
        { endpoint: '/api/leases/malformed-id', expectedStatus: 400 }
      ]

      for (const scenario of errorScenarios) {
        const results = await PerformanceTestHelper.measureApiEndpoint(
          async () => {
            const response = await request.get(scenario.endpoint, {
              headers: {
                'Authorization': `Bearer ${generateTestToken(testLandlord.id)}`
              }
            })

            expect(response.status()).toBe(scenario.expectedStatus)
            return response.json()
          },
          { iterations: 10, warmup: 2 }
        )

        // Error responses should be very fast
        expect(results.averageResponseTime).toBeLessThan(200) // < 200ms
        expect(results.successRate).toBe(100)
      }
    })
  })
})

// Helper function to generate test tokens
function generateTestToken(userId: string): string {
  // This should use your actual JWT generation logic
  // For tests, you might use a simplified version
  return 'test-jwt-token-' + userId
}