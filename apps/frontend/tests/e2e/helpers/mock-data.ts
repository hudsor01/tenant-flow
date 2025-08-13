import { Page } from '@playwright/test'

export function createMockProperty(overrides = {}) {
  return {
    id: 'prop-1',
    name: 'Sunset Apartments',
    address: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    propertyType: 'RESIDENTIAL',
    yearBuilt: 2010,
    totalSize: 10000,
    description: 'Beautiful apartment complex',
    units: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

export function createMockUnit(overrides = {}) {
  return {
    id: 'unit-1',
    unitNumber: '101',
    propertyId: 'prop-1',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 800,
    status: 'VACANT',
    rentAmount: 1500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

export async function mockPropertiesAPI(page: Page) {
  // Mock properties list
  await page.route('**/api/v1/properties', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          createMockProperty({
            id: 'prop-1',
            name: 'Sunset Apartments',
            address: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            propertyType: 'RESIDENTIAL',
            units: [
              createMockUnit({ status: 'OCCUPIED' }),
              createMockUnit({ id: 'unit-2', unitNumber: '102', status: 'OCCUPIED' }),
              createMockUnit({ id: 'unit-3', unitNumber: '103', status: 'VACANT' }),
              createMockUnit({ id: 'unit-4', unitNumber: '104', status: 'OCCUPIED' })
            ]
          }),
          createMockProperty({
            id: 'prop-2',
            name: 'Downtown Offices',
            address: '456 Business Ave',
            city: 'San Francisco',
            state: 'CA',
            propertyType: 'COMMERCIAL',
            units: [
              createMockUnit({ id: 'unit-5', unitNumber: 'Suite A', status: 'OCCUPIED' }),
              createMockUnit({ id: 'unit-6', unitNumber: 'Suite B', status: 'VACANT' })
            ]
          }),
          createMockProperty({
            id: 'prop-3',
            name: 'Lakeside Condos',
            address: '789 Lake Drive',
            city: 'Oakland',
            state: 'CA',
            propertyType: 'RESIDENTIAL',
            units: [
              createMockUnit({ id: 'unit-7', unitNumber: '201', status: 'OCCUPIED' }),
              createMockUnit({ id: 'unit-8', unitNumber: '202', status: 'OCCUPIED' })
            ]
          })
        ])
      })
    } else {
      await route.continue()
    }
  })

  // Mock property stats
  await page.route('**/api/v1/properties/stats', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total: 3,
        occupied: 6,
        vacant: 2,
        occupancyRate: 0.85,
        totalMonthlyRent: 12000,
        averageRent: 1500
      })
    })
  })

  // Mock individual property details
  await page.route('**/api/v1/properties/prop-*', async route => {
    const id = route.request().url().split('/').pop()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createMockProperty({ 
        id,
        units: [
          createMockUnit({ propertyId: id, status: 'OCCUPIED' }),
          createMockUnit({ 
            id: `${id}-unit-2`, 
            propertyId: id, 
            unitNumber: '102', 
            status: 'VACANT' 
          })
        ]
      }))
    })
  })
}

export async function mockAuthenticatedUser(page: Page) {
  // Set auth token in localStorage
  await page.addInitScript(() => {
    localStorage.setItem('auth-token', 'mock-jwt-token')
    localStorage.setItem('user', JSON.stringify({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      organizationId: 'org-1'
    }))
  })

  // Mock auth check endpoint
  await page.route('**/api/v1/auth/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-1'
      })
    })
  })
}

export async function mockAPIError(page: Page, endpoint: string, error: { status: number; message: string }) {
  await page.route(endpoint, async route => {
    await route.fulfill({
      status: error.status,
      contentType: 'application/json',
      body: JSON.stringify({ error: error.message })
    })
  })
}