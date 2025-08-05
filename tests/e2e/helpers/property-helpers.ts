import { Page } from '@playwright/test'

export class PropertyTestHelpers {
  constructor(private page: Page) {}

  /**
   * Create a property with specified number of units
   */
  async createPropertyWithUnits(totalUnits: number, occupiedUnits: number) {
    const propertyData = {
      id: `prop-${Date.now()}-${require('crypto').randomBytes(6).toString('hex')}`,
      name: `Test Property ${Date.now()}`,
      address: '123 Test Street',
      city: 'Test City',
      state: 'TX',
      zipCode: '12345',
      type: 'APARTMENT',
      totalUnits,
      occupiedUnits,
      units: []
    }

    // Create units
    for (let i = 1; i <= totalUnits; i++) {
      const isOccupied = i <= occupiedUnits
      propertyData.units.push({
        id: `unit-${propertyData.id}-${i}`,
        unitNumber: `${i.toString().padStart(3, '0')}`,
        bedrooms: Math.floor(Math.random() * 3) + 1,
        bathrooms: Math.floor(Math.random() * 2) + 1,
        rent: 1000 + (Math.random() * 500),
        status: isOccupied ? 'OCCUPIED' : 'VACANT',
        propertyId: propertyData.id
      })
    }

    // Mock API response
    await this.page.route(`/api/v1/properties/${propertyData.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(propertyData)
      })
    })

    return propertyData
  }

  /**
   * Create a simple property without units
   */
  async createProperty() {
    const propertyData = {
      id: `prop-${Date.now()}-${require('crypto').randomBytes(6).toString('hex')}`,
      name: `Empty Property ${Date.now()}`,
      address: '456 Empty Street',
      city: 'Empty City',
      state: 'CA',
      zipCode: '54321',
      type: 'SINGLE_FAMILY',
      totalUnits: 0,
      occupiedUnits: 0,
      units: []
    }

    await this.page.route(`/api/v1/properties/${propertyData.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(propertyData)
      })
    })

    return propertyData
  }

  /**
   * Delete a property (cleanup)
   */
  async deleteProperty(propertyId: string) {
    await this.page.route(`/api/v1/properties/${propertyId}`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 204,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Property deleted' })
        })
      } else {
        await route.continue()
      }
    })
  }

  /**
   * Setup mock data for properties list
   */
  async setupMockPropertiesList(properties: any[]) {
    await this.page.route('/api/v1/properties*', async (route) => {
      const url = new URL(route.request().url())
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = parseInt(url.searchParams.get('limit') || '10')
      
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedProperties = properties.slice(startIndex, endIndex)
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: paginatedProperties,
          meta: {
            total: properties.length,
            page,
            limit,
            totalPages: Math.ceil(properties.length / limit)
          }
        })
      })
    })
  }
}