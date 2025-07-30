import { test, expect } from '@playwright/test'
import { createTestUser, cleanupTestUser, loginAs } from '../helpers/auth'
import { createTestProperty, cleanupTestProperties } from '../helpers/properties'

test.describe('Row Level Security (RLS) Tests', () => {
  let ownerEmail = 'rls-owner@test.com'
  let tenantEmail = 'rls-tenant@test.com'
  let otherOwnerEmail = 'rls-other-owner@test.com'
  
  let ownerId: string
  let tenantId: string
  let otherOwnerId: string
  
  let propertyId: string
  let otherPropertyId: string

  test.beforeAll(async () => {
    // Create test users
    ownerId = await createTestUser(ownerEmail, 'OWNER')
    tenantId = await createTestUser(tenantEmail, 'TENANT')
    otherOwnerId = await createTestUser(otherOwnerEmail, 'OWNER')
    
    // Create properties
    propertyId = await createTestProperty({
      name: 'RLS Test Property',
      ownerId: ownerId
    })
    
    otherPropertyId = await createTestProperty({
      name: 'Other Owner Property',
      ownerId: otherOwnerId
    })
  })

  test.afterAll(async () => {
    // Cleanup
    await cleanupTestProperties([propertyId, otherPropertyId])
    await cleanupTestUser(ownerId)
    await cleanupTestUser(tenantId)
    await cleanupTestUser(otherOwnerId)
  })

  test.describe('Property Owner Access', () => {
    test('owner can view their own properties', async ({ page }) => {
      await loginAs(page, ownerEmail)
      
      await page.goto('/properties')
      
      // Should see their property
      await expect(page.locator('text=RLS Test Property')).toBeVisible()
      
      // Should NOT see other owner's property
      await expect(page.locator('text=Other Owner Property')).not.toBeVisible()
    })

    test('owner can create new property', async ({ page }) => {
      await loginAs(page, ownerEmail)
      
      await page.goto('/properties')
      await page.click('button:has-text("Add Property")')
      
      // Fill form
      await page.fill('input[name="name"]', 'New Test Property')
      await page.fill('input[name="address"]', '456 Test Ave')
      await page.fill('input[name="city"]', 'Test City')
      await page.selectOption('select[name="state"]', 'CA')
      await page.fill('input[name="zipCode"]', '12345')
      
      await page.click('button[type="submit"]')
      
      // Should see success message
      await expect(page.locator('text=Property created successfully')).toBeVisible()
      
      // Should see new property in list
      await expect(page.locator('text=New Test Property')).toBeVisible()
    })

    test('owner can update their property', async ({ page }) => {
      await loginAs(page, ownerEmail)
      
      await page.goto('/properties')
      
      // Click on their property
      await page.click('text=RLS Test Property')
      
      // Click edit button
      await page.click('button:has-text("Edit")')
      
      // Update name
      await page.fill('input[name="name"]', 'Updated RLS Property')
      await page.click('button[type="submit"]')
      
      // Should see success message
      await expect(page.locator('text=Property updated successfully')).toBeVisible()
      
      // Should see updated name
      await expect(page.locator('text=Updated RLS Property')).toBeVisible()
    })

    test('owner cannot access other owner properties via direct URL', async ({ page }) => {
      await loginAs(page, ownerEmail)
      
      // Try to access other owner's property directly
      await page.goto(`/properties/${otherPropertyId}`)
      
      // Should be redirected or see error
      await expect(page.locator('text=Property not found')).toBeVisible()
    })
  })

  test.describe('Tenant Access', () => {
    test('tenant cannot see properties without lease', async ({ page }) => {
      await loginAs(page, tenantEmail)
      
      await page.goto('/properties')
      
      // Should see empty state or only properties they have leases for
      await expect(page.locator('text=RLS Test Property')).not.toBeVisible()
      await expect(page.locator('text=Other Owner Property')).not.toBeVisible()
    })

    test('tenant can view property after lease is created', async ({ page, request }) => {
      // First, create a lease as the owner
      await loginAs(page, ownerEmail)
      
      // Create unit and lease for tenant
      const unitResponse = await request.post('/api/units', {
        data: {
          propertyId: propertyId,
          unitNumber: '101',
          bedrooms: 2,
          bathrooms: 1,
          rent: 1500
        }
      })
      
      const unit = await unitResponse.json()
      
      const leaseResponse = await request.post('/api/leases', {
        data: {
          unitId: unit.id,
          tenantId: tenantId,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          rentAmount: 1500,
          securityDeposit: 1500,
          status: 'ACTIVE'
        }
      })
      
      expect(leaseResponse.ok()).toBeTruthy()
      
      // Now login as tenant
      await loginAs(page, tenantEmail)
      
      await page.goto('/my-lease')
      
      // Should see the property they have a lease for
      await expect(page.locator('text=RLS Test Property')).toBeVisible()
      await expect(page.locator('text=Unit 101')).toBeVisible()
    })

    test('tenant cannot create properties', async ({ page }) => {
      await loginAs(page, tenantEmail)
      
      await page.goto('/properties')
      
      // Should not see "Add Property" button
      await expect(page.locator('button:has-text("Add Property")')).not.toBeVisible()
    })

    test('tenant can create maintenance requests for their unit', async ({ page }) => {
      await loginAs(page, tenantEmail)
      
      await page.goto('/maintenance')
      await page.click('button:has-text("New Request")')
      
      // Fill form
      await page.fill('input[name="title"]', 'Leaky Faucet')
      await page.fill('textarea[name="description"]', 'Kitchen faucet is dripping')
      await page.selectOption('select[name="priority"]', 'MEDIUM')
      
      await page.click('button[type="submit"]')
      
      // Should see success message
      await expect(page.locator('text=Maintenance request created')).toBeVisible()
    })
  })

  test.describe('API Level RLS Tests', () => {
    test('API enforces RLS on property endpoints', async ({ request }) => {
      // Login as owner
      const ownerAuth = await loginAs(null, ownerEmail)
      
      // Owner can get their properties
      const ownPropertiesResponse = await request.get('/api/properties', {
        headers: {
          'Authorization': `Bearer ${ownerAuth.token}`
        }
      })
      
      expect(ownPropertiesResponse.ok()).toBeTruthy()
      const ownProperties = await ownPropertiesResponse.json()
      
      // Should only see their own properties
      expect(ownProperties.data.some((p: any) => p.id === propertyId)).toBeTruthy()
      expect(ownProperties.data.some((p: any) => p.id === otherPropertyId)).toBeFalsy()
      
      // Try to access other owner's property directly
      const otherPropertyResponse = await request.get(`/api/properties/${otherPropertyId}`, {
        headers: {
          'Authorization': `Bearer ${ownerAuth.token}`
        }
      })
      
      expect(otherPropertyResponse.status()).toBe(404)
    })

    test('API prevents unauthorized property creation', async ({ request }) => {
      // Login as tenant
      const tenantAuth = await loginAs(null, tenantEmail)
      
      // Try to create property as tenant
      const response = await request.post('/api/properties', {
        headers: {
          'Authorization': `Bearer ${tenantAuth.token}`
        },
        data: {
          name: 'Unauthorized Property',
          address: '999 Hack St',
          city: 'Hack City',
          state: 'CA',
          zipCode: '99999'
        }
      })
      
      expect(response.status()).toBe(403)
    })

    test('API prevents cross-tenant data access', async ({ request }) => {
      // Login as one owner
      const ownerAuth = await loginAs(null, ownerEmail)
      
      // Try to update other owner's property
      const response = await request.patch(`/api/properties/${otherPropertyId}`, {
        headers: {
          'Authorization': `Bearer ${ownerAuth.token}`
        },
        data: {
          name: 'Hacked Property Name'
        }
      })
      
      expect(response.status()).toBe(404) // Should act as if property doesn't exist
    })
  })

  test.describe('RLS Performance Tests', () => {
    test('queries perform well with RLS policies', async ({ page }) => {
      await loginAs(page, ownerEmail)
      
      const startTime = Date.now()
      
      await page.goto('/properties')
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // Page should load within reasonable time even with RLS
      expect(loadTime).toBeLessThan(2000) // 2 seconds
      
      // Check that data loaded correctly
      await expect(page.locator('[data-testid="property-card"]')).toHaveCount(1)
    })
  })
})