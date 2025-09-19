import { test, expect } from '@playwright/test'

test.describe('Dashboard Tabs Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('should display tabs and default to month view', async ({ page }) => {
    // Check that all tabs are present
    await expect(page.getByRole('tab', { name: 'This Month' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'This Quarter' })).toBeVisible() 
    await expect(page.getByRole('tab', { name: 'This Year' })).toBeVisible()
    
    // Month tab should be selected by default
    await expect(page.getByRole('tab', { name: 'This Month' })).toHaveAttribute('data-state', 'active')
    
    // Should show month data
    await expect(page.getByText('$1,250.00')).toBeVisible()
  })

  test('should update data when switching to Quarter tab', async ({ page }) => {
    // Click Quarter tab
    await page.getByRole('tab', { name: 'This Quarter' }).click()
    
    // Check URL updated
    await expect(page).toHaveURL(/period=quarter/)
    
    // Check Quarter tab is active
    await expect(page.getByRole('tab', { name: 'This Quarter' })).toHaveAttribute('data-state', 'active')
    
    // Check data updated to quarter values
    await expect(page.getByText('$3,750.00')).toBeVisible()
    await expect(page.getByText('3,456')).toBeVisible()
    await expect(page.getByText('47,892')).toBeVisible()
    await expect(page.locator('[data-slot="card-title"]').getByText('6.2%')).toBeVisible()
  })

  test('should update data when switching to Year tab', async ({ page }) => {
    // Click Year tab
    await page.getByRole('tab', { name: 'This Year' }).click()
    
    // Check URL updated
    await expect(page).toHaveURL(/period=year/)
    
    // Check Year tab is active
    await expect(page.getByRole('tab', { name: 'This Year' })).toHaveAttribute('data-state', 'active')
    
    // Check data updated to year values
    await expect(page.getByText('$14,250.00')).toBeVisible()
    await expect(page.getByText('12,789')).toBeVisible()
    await expect(page.getByText('52,341')).toBeVisible()
    await expect(page.locator('[data-slot="card-title"]').getByText('8.7%')).toBeVisible()
  })

  test('should preserve tab selection on page reload', async ({ page }) => {
    // Go to quarter view
    await page.getByRole('tab', { name: 'This Quarter' }).click()
    await expect(page).toHaveURL(/period=quarter/)
    
    // Reload page
    await page.reload()
    
    // Should still be on quarter view
    await expect(page.getByRole('tab', { name: 'This Quarter' })).toHaveAttribute('data-state', 'active')
    await expect(page.getByText('$3,750.00')).toBeVisible()
  })

  test('should work with direct URL navigation', async ({ page }) => {
    // Navigate directly to year view
    await page.goto('/dashboard?period=year')
    
    // Should show year tab as active
    await expect(page.getByRole('tab', { name: 'This Year' })).toHaveAttribute('data-state', 'active')
    
    // Should show year data
    await expect(page.getByText('$14,250.00')).toBeVisible()
    
    // Navigate directly to quarter view
    await page.goto('/dashboard?period=quarter')
    
    // Should show quarter tab as active
    await expect(page.getByRole('tab', { name: 'This Quarter' })).toHaveAttribute('data-state', 'active')
    
    // Should show quarter data
    await expect(page.getByText('$3,750.00')).toBeVisible()
  })

  test('should handle invalid period parameter gracefully', async ({ page }) => {
    // Navigate with invalid period
    await page.goto('/dashboard?period=invalid')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Should default to month view
    await expect(page.getByRole('tab', { name: 'This Month' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'This Month' })).toHaveAttribute('data-state', 'active')
    await expect(page.getByText('$1,250.00')).toBeVisible()
  })
})
