import { test, expect } from '@playwright/test'
import { VisualTestHelpers } from '../../helpers/visual-helpers'
import { MaintenanceTestHelpers } from '../../helpers/maintenance-helpers'

test.describe('Maintenance Workflow Visual Regression', () => {
  let visualHelpers: VisualTestHelpers
  let maintenanceHelpers: MaintenanceTestHelpers

  test.beforeEach(async ({ page }) => {
    visualHelpers = new VisualTestHelpers(page)
    maintenanceHelpers = new MaintenanceTestHelpers(page)
    await visualHelpers.setupVisualEnvironment()
  })

  test.describe('Maintenance Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/maintenance')
      await page.waitForLoadState('networkidle')
    })

    test('maintenance dashboard overview', async ({ page }) => {
      await expect(page).toHaveScreenshot('maintenance-dashboard-overview.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="current-date"]'),
          page.locator('[data-testid="last-updated"]'),
        ],
      })
    })

    test('maintenance statistics cards', async ({ page }) => {
      const statsContainer = page.locator('[data-testid="maintenance-stats"]')
      await expect(statsContainer).toHaveScreenshot('maintenance-stats-cards.png')
    })

    test('urgent requests alert', async ({ page }) => {
      const urgentAlert = page.locator('[data-testid="urgent-requests-alert"]')
      await expect(urgentAlert).toHaveScreenshot('urgent-requests-alert.png')
    })

    test('maintenance team workload', async ({ page }) => {
      const workloadSection = page.locator('[data-testid="team-workload"]')
      await expect(workloadSection).toHaveScreenshot('maintenance-team-workload.png')
    })

    test('maintenance calendar view', async ({ page }) => {
      await page.click('[data-testid="calendar-view-toggle"]')
      await page.waitForTimeout(500)

      const calendar = page.locator('[data-testid="maintenance-calendar"]')
      await expect(calendar).toHaveScreenshot('maintenance-calendar-view.png')
    })
  })

  test.describe('Request Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/maintenance/requests')
      await page.waitForLoadState('networkidle')
    })

    test('requests list view', async ({ page }) => {
      await expect(page).toHaveScreenshot('maintenance-requests-list.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="request-date"]'),
          page.locator('[data-testid="last-updated"]'),
        ],
      })
    })

    test('request priority indicators', async ({ page }) => {
      const requestItems = page.locator('[data-testid="maintenance-request-item"]')
      const count = await requestItems.count()

      for (let i = 0; i < Math.min(4, count); i++) {
        const request = requestItems.nth(i)
        const priority = await request.getAttribute('data-priority')
        await expect(request).toHaveScreenshot(`request-priority-${priority}-${i}.png`)
      }
    })

    test('request status filters', async ({ page }) => {
      const filtersSection = page.locator('[data-testid="request-filters"]')
      await expect(filtersSection).toHaveScreenshot('request-filters.png')

      // Test active filters
      await page.click('[data-testid="filter-urgent"]')
      await page.click('[data-testid="filter-in-progress"]')
      await page.waitForTimeout(300)
      await expect(filtersSection).toHaveScreenshot('request-filters-active.png')
    })

    test('request search and sort', async ({ page }) => {
      const searchSection = page.locator('[data-testid="request-search-sort"]')
      await expect(searchSection).toHaveScreenshot('request-search-sort.png')

      // Test search with results
      await page.fill('[data-testid="request-search"]', 'plumbing')
      await page.waitForTimeout(500)
      await expect(searchSection).toHaveScreenshot('request-search-active.png')
    })

    test('bulk actions for requests', async ({ page }) => {
      // Select multiple requests
      const checkboxes = page.locator('[data-testid="request-checkbox"]')
      await checkboxes.first().check()
      await checkboxes.nth(1).check()
      await checkboxes.nth(2).check()
      await page.waitForTimeout(300)

      const bulkActions = page.locator('[data-testid="bulk-actions-bar"]')
      await expect(bulkActions).toHaveScreenshot('maintenance-bulk-actions.png')
    })

    test('request assignment modal', async ({ page }) => {
      await page.click('[data-testid="maintenance-request-item"]')
      await page.click('[data-testid="assign-request-button"]')
      await page.waitForSelector('[data-testid="assignment-modal"]')

      const modal = page.locator('[data-testid="assignment-modal"]')
      await expect(modal).toHaveScreenshot('request-assignment-modal.png')
    })

    test('technician selection dropdown', async ({ page }) => {
      await page.click('[data-testid="maintenance-request-item"]')
      await page.click('[data-testid="assign-request-button"]')
      await page.waitForSelector('[data-testid="assignment-modal"]')

      await page.click('[data-testid="technician-dropdown"]')
      await page.waitForTimeout(200)

      const dropdown = page.locator('[data-testid="technician-dropdown-menu"]')
      await expect(dropdown).toHaveScreenshot('technician-selection-dropdown.png')
    })
  })

  test.describe('Request Detail View', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/maintenance/requests')
      await page.click('[data-testid="maintenance-request-item"]')
      await page.waitForSelector('[data-testid="request-detail-view"]')
    })

    test('request detail layout', async ({ page }) => {
      await expect(page).toHaveScreenshot('request-detail-layout.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="request-created-date"]'),
          page.locator('[data-testid="last-activity"]'),
        ],
      })
    })

    test('request photos gallery', async ({ page }) => {
      const photosGallery = page.locator('[data-testid="request-photos-gallery"]')
      await expect(photosGallery).toHaveScreenshot('request-photos-gallery.png')
    })

    test('photo lightbox modal', async ({ page }) => {
      await page.click('[data-testid="request-photo"]')
      await page.waitForSelector('[data-testid="photo-lightbox"]')

      const lightbox = page.locator('[data-testid="photo-lightbox"]')
      await expect(lightbox).toHaveScreenshot('photo-lightbox-modal.png')
    })

    test('request activity timeline', async ({ page }) => {
      const timeline = page.locator('[data-testid="request-timeline"]')
      await expect(timeline).toHaveScreenshot('request-activity-timeline.png')
    })

    test('add activity comment', async ({ page }) => {
      const commentSection = page.locator('[data-testid="add-comment-section"]')
      await expect(commentSection).toHaveScreenshot('add-comment-empty.png')

      // Filled comment
      await page.fill('[data-testid="comment-textarea"]', 'Checked the issue, will need to order replacement parts.')
      await expect(commentSection).toHaveScreenshot('add-comment-filled.png')
    })

    test('status change dropdown', async ({ page }) => {
      await page.click('[data-testid="status-change-button"]')
      await page.waitForTimeout(200)

      const statusDropdown = page.locator('[data-testid="status-dropdown"]')
      await expect(statusDropdown).toHaveScreenshot('status-change-dropdown.png')
    })

    test('work order generation', async ({ page }) => {
      await page.click('[data-testid="generate-work-order-button"]')
      await page.waitForSelector('[data-testid="work-order-modal"]')

      const modal = page.locator('[data-testid="work-order-modal"]')
      await expect(modal).toHaveScreenshot('work-order-generation-modal.png')
    })
  })

  test.describe('Technician Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/maintenance/technicians')
      await page.waitForLoadState('networkidle')
    })

    test('technicians list view', async ({ page }) => {
      await expect(page).toHaveScreenshot('technicians-list-view.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('technician availability status', async ({ page }) => {
      const technicianCards = page.locator('[data-testid="technician-card"]')
      const count = await technicianCards.count()

      for (let i = 0; i < Math.min(3, count); i++) {
        const card = technicianCards.nth(i)
        const status = await card.getAttribute('data-availability')
        await expect(card).toHaveScreenshot(`technician-${status}-${i}.png`)
      }
    })

    test('add technician modal', async ({ page }) => {
      await page.click('[data-testid="add-technician-button"]')
      await page.waitForSelector('[data-testid="technician-form-modal"]')

      const modal = page.locator('[data-testid="technician-form-modal"]')
      await expect(modal).toHaveScreenshot('add-technician-modal.png')
    })

    test('technician skills selection', async ({ page }) => {
      await page.click('[data-testid="add-technician-button"]')
      await page.waitForSelector('[data-testid="technician-form-modal"]')

      const skillsSection = page.locator('[data-testid="technician-skills"]')
      await expect(skillsSection).toHaveScreenshot('technician-skills-empty.png')

      // Select multiple skills
      await page.click('[data-testid="skill-plumbing"]')
      await page.click('[data-testid="skill-electrical"]')
      await page.click('[data-testid="skill-hvac"]')
      await page.waitForTimeout(200)

      await expect(skillsSection).toHaveScreenshot('technician-skills-selected.png')
    })

    test('technician schedule view', async ({ page }) => {
      await page.click('[data-testid="technician-card"]')
      await page.click('[data-testid="view-schedule-button"]')
      await page.waitForSelector('[data-testid="technician-schedule"]')

      const schedule = page.locator('[data-testid="technician-schedule"]')
      await expect(schedule).toHaveScreenshot('technician-schedule-view.png')
    })

    test('technician workload chart', async ({ page }) => {
      const workloadChart = page.locator('[data-testid="technician-workload-chart"]')
      await expect(workloadChart).toHaveScreenshot('technician-workload-chart.png')
    })
  })

  test.describe('Maintenance Analytics', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/maintenance/analytics')
      await page.waitForLoadState('networkidle')
    })

    test('analytics dashboard', async ({ page }) => {
      await expect(page).toHaveScreenshot('maintenance-analytics-dashboard.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="analytics-date-range"]'),
        ],
      })
    })

    test('request volume chart', async ({ page }) => {
      const volumeChart = page.locator('[data-testid="request-volume-chart"]')
      await expect(volumeChart).toHaveScreenshot('request-volume-chart.png')
    })

    test('response time metrics', async ({ page }) => {
      const responseMetrics = page.locator('[data-testid="response-time-metrics"]')
      await expect(responseMetrics).toHaveScreenshot('response-time-metrics.png')
    })

    test('cost analysis chart', async ({ page }) => {
      const costChart = page.locator('[data-testid="cost-analysis-chart"]')
      await expect(costChart).toHaveScreenshot('cost-analysis-chart.png')
    })

    test('analytics date range picker', async ({ page }) => {
      await page.click('[data-testid="date-range-picker"]')
      await page.waitForTimeout(200)

      const datePicker = page.locator('[data-testid="date-picker-dropdown"]')
      await expect(datePicker).toHaveScreenshot('analytics-date-picker.png')
    })

    test('export analytics report', async ({ page }) => {
      const exportButton = page.locator('[data-testid="export-analytics-button"]')
      await expect(exportButton).toHaveScreenshot('export-analytics-button.png')

      await exportButton.hover()
      await page.waitForTimeout(200)
      await expect(exportButton).toHaveScreenshot('export-analytics-button-hover.png')
    })
  })

  test.describe('Mobile Maintenance App', () => {
    const mobileViewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 320, height: 568, name: 'mobile-small' },
    ]

    test('mobile maintenance dashboard', async ({ page }) => {
      for (const viewport of mobileViewports) {
        await page.setViewportSize(viewport)
        await page.goto('/maintenance')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(300)

        await expect(page).toHaveScreenshot(`maintenance-dashboard-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          mask: [
            page.locator('[data-testid="current-date"]'),
          ],
        })
      }
    })

    test('mobile request list', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/maintenance/requests')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('maintenance-requests-mobile.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('mobile request detail', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/maintenance/requests')
      await page.click('[data-testid="maintenance-request-item"]')
      await page.waitForSelector('[data-testid="request-detail-view"]')
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('request-detail-mobile.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('mobile navigation drawer', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/maintenance')
      await page.waitForLoadState('networkidle')

      // Closed navigation
      await expect(page.locator('[data-testid="mobile-nav"]')).toHaveScreenshot('maintenance-nav-mobile-closed.png')

      // Open navigation
      await page.click('[data-testid="mobile-nav-toggle"]')
      await page.waitForTimeout(200)
      await expect(page.locator('[data-testid="mobile-nav"]')).toHaveScreenshot('maintenance-nav-mobile-open.png')
    })
  })

  test.describe('Maintenance Themes', () => {
    test('maintenance dashboard dark theme', async ({ page }) => {
      await page.goto('/maintenance')
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('maintenance-dashboard-dark.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="current-date"]'),
        ],
      })
    })

    test('request detail dark theme', async ({ page }) => {
      await page.goto('/maintenance/requests')
      await page.click('[data-testid="maintenance-request-item"]')
      await page.waitForSelector('[data-testid="request-detail-view"]')
      
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('request-detail-dark-theme.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('maintenance high contrast theme', async ({ page }) => {
      await page.goto('/maintenance')
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-contrast', 'high')
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('maintenance-high-contrast.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })

  test.describe('Maintenance Print Views', () => {
    test('print work order', async ({ page }) => {
      await page.goto('/maintenance/requests')
      await page.click('[data-testid="maintenance-request-item"]')
      await page.waitForSelector('[data-testid="request-detail-view"]')

      await page.emulateMedia({ media: 'print' })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('work-order-print-view.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('print technician schedule', async ({ page }) => {
      await page.goto('/maintenance/technicians')
      await page.click('[data-testid="technician-card"]')
      await page.click('[data-testid="view-schedule-button"]')
      await page.waitForSelector('[data-testid="technician-schedule"]')

      await page.emulateMedia({ media: 'print' })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('technician-schedule-print.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })
})