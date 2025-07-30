import { test, expect } from '@playwright/test'
import { VisualTestHelpers } from '../../helpers/visual-helpers'
import { PropertyTestHelpers } from '../../helpers/property-helpers'

test.describe('Properties Visual Regression', () => {
  let visualHelpers: VisualTestHelpers
  let propertyHelpers: PropertyTestHelpers
  let testProperties: any[] = []

  test.beforeEach(async ({ page }) => {
    visualHelpers = new VisualTestHelpers(page)
    propertyHelpers = new PropertyTestHelpers(page)
    
    // Create test data with different states
    testProperties = await Promise.all([
      propertyHelpers.createPropertyWithUnits(4, 4), // Fully occupied
      propertyHelpers.createPropertyWithUnits(3, 2), // Partially occupied
      propertyHelpers.createPropertyWithUnits(2, 0), // Vacant
    ])

    await page.goto('/properties')
    await page.waitForLoadState('networkidle')
    await visualHelpers.disableAnimations()
  })

  test.afterEach(async () => {
    // Clean up test data
    await Promise.all(
      testProperties.map(property => propertyHelpers.deleteProperty(property.id))
    )
  })

  test('properties list view', async ({ page }) => {
    await expect(page).toHaveScreenshot('properties-list-view.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        page.locator('[data-testid="created-date"]'),
        page.locator('[data-testid="last-updated"]'),
      ],
    })
  })

  test('property card states', async ({ page }) => {
    // Test different property card states
    const propertyCards = page.locator('[data-testid="property-card"]')
    
    for (let i = 0; i < Math.min(3, await propertyCards.count()); i++) {
      const card = propertyCards.nth(i)
      await expect(card).toHaveScreenshot(`property-card-${i + 1}.png`)
    }
  })

  test('property filters and search', async ({ page }) => {
    const filtersSection = page.locator('[data-testid="property-filters"]')
    await expect(filtersSection).toHaveScreenshot('property-filters.png')
    
    // Test active filter state
    await page.selectOption('[data-testid="property-type-filter"]', 'SINGLE_FAMILY')
    await page.fill('[data-testid="property-search"]', 'test property')
    await page.waitForTimeout(500)
    
    await expect(filtersSection).toHaveScreenshot('property-filters-active.png')
  })

  test('add property modal', async ({ page }) => {
    await page.click('[data-testid="add-property-button"]')
    await page.waitForSelector('[data-testid="property-form-modal"]')
    
    const modal = page.locator('[data-testid="property-form-modal"]')
    await expect(modal).toHaveScreenshot('add-property-modal.png')
    
    // Test form validation states
    await page.click('[data-testid="submit-property-button"]')
    await page.waitForTimeout(300)
    
    await expect(modal).toHaveScreenshot('add-property-modal-validation.png')
  })

  test('property detail view', async ({ page }) => {
    const firstProperty = testProperties[0]
    await page.goto(`/properties/${firstProperty.id}`)
    await page.waitForLoadState('networkidle')
    await visualHelpers.disableAnimations()
    
    await expect(page).toHaveScreenshot('property-detail-view.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        page.locator('[data-testid="created-date"]'),
        page.locator('[data-testid="last-updated"]'),
      ],
    })
  })

  test('property units grid', async ({ page }) => {
    const firstProperty = testProperties[0]
    await page.goto(`/properties/${firstProperty.id}`)
    await page.waitForLoadState('networkidle')
    
    const unitsGrid = page.locator('[data-testid="units-grid"]')
    await expect(unitsGrid).toHaveScreenshot('property-units-grid.png')
  })

  test('unit card states', async ({ page }) => {
    const firstProperty = testProperties[0]
    await page.goto(`/properties/${firstProperty.id}`)
    await page.waitForLoadState('networkidle')
    
    // Test different unit statuses
    const unitCards = page.locator('[data-testid="unit-card"]')
    const cardCount = await unitCards.count()
    
    for (let i = 0; i < Math.min(4, cardCount); i++) {
      const card = unitCards.nth(i)
      const status = await card.getAttribute('data-unit-status')
      await expect(card).toHaveScreenshot(`unit-card-${status?.toLowerCase() || 'unknown'}-${i}.png`)
    }
  })

  test('property empty states', async ({ page }) => {
    // Create property with no units
    const emptyProperty = await propertyHelpers.createProperty()
    testProperties.push(emptyProperty)
    
    await page.goto(`/properties/${emptyProperty.id}`)
    await page.waitForLoadState('networkidle')
    await visualHelpers.disableAnimations()
    
    await expect(page).toHaveScreenshot('property-no-units-state.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('property grid vs list view toggle', async ({ page }) => {
    // Test grid view
    await page.click('[data-testid="view-toggle-grid"]')
    await page.waitForTimeout(300)
    await expect(page.locator('[data-testid="properties-container"]')).toHaveScreenshot('properties-grid-view.png')
    
    // Test list view
    await page.click('[data-testid="view-toggle-list"]')
    await page.waitForTimeout(300)
    await expect(page.locator('[data-testid="properties-container"]')).toHaveScreenshot('properties-list-view-toggle.png')
  })

  test('property management actions', async ({ page }) => {
    const firstProperty = testProperties[0]
    await page.goto(`/properties/${firstProperty.id}`)
    
    // Test action dropdown
    await page.click('[data-testid="property-actions-menu"]')
    await page.waitForTimeout(200)
    
    const dropdown = page.locator('[data-testid="actions-dropdown"]')
    await expect(dropdown).toHaveScreenshot('property-actions-dropdown.png')
  })

  test('property sort options', async ({ page }) => {
    // Test sort dropdown
    await page.click('[data-testid="sort-dropdown"]')
    await page.waitForTimeout(200)
    
    const sortMenu = page.locator('[data-testid="sort-menu"]')
    await expect(sortMenu).toHaveScreenshot('property-sort-menu.png')
  })

  test('property bulk actions', async ({ page }) => {
    // Select multiple properties
    const checkboxes = page.locator('[data-testid="property-checkbox"]')
    await checkboxes.first().check()
    await checkboxes.nth(1).check()
    await page.waitForTimeout(300)
    
    // Test bulk actions bar
    const bulkActions = page.locator('[data-testid="bulk-actions-bar"]')
    await expect(bulkActions).toHaveScreenshot('property-bulk-actions.png')
  })

  test('property pagination', async ({ page }) => {
    // This test would need many properties, so we'll mock the pagination
    await page.route('/api/v1/properties*', async (route) => {
      const url = new URL(route.request().url())
      const page = parseInt(url.searchParams.get('page') || '1')
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: testProperties,
          meta: {
            total: 50,
            page,
            limit: 10,
            totalPages: 5,
          },
        }),
      })
    })
    
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    const pagination = page.locator('[data-testid="pagination"]')
    await expect(pagination).toHaveScreenshot('property-pagination.png')
  })

  test('property search results', async ({ page }) => {
    // Test search with results
    await page.fill('[data-testid="property-search"]', testProperties[0].name.substring(0, 5))
    await page.waitForTimeout(500)
    
    await expect(page.locator('[data-testid="properties-container"]')).toHaveScreenshot('property-search-results.png')
    
    // Test no results state
    await page.fill('[data-testid="property-search"]', 'nonexistent property name xyz')
    await page.waitForTimeout(500)
    
    await expect(page.locator('[data-testid="properties-container"]')).toHaveScreenshot('property-search-no-results.png')
  })

  test('property responsive layouts', async ({ page }) => {
    const viewports = [
      { width: 1440, height: 900, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 375, height: 667, name: 'mobile' },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot(`properties-${viewport.name}.png`, {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="created-date"]'),
          page.locator('[data-testid="last-updated"]'),
        ],
      })
    }
  })

  test('property loading skeletons', async ({ page }) => {
    await page.route('/api/v1/properties*', async (route) => {
      // Delay to capture loading state
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.continue()
    })

    await page.goto('/properties')
    
    // Capture loading skeleton
    await expect(page.locator('[data-testid="properties-loading"]')).toHaveScreenshot('properties-loading-skeleton.png')
  })
})