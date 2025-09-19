import { test, expect } from '@playwright/test'
import { DashboardPage } from '../pages/dashboard-page'
import { TenantFormPage } from '../pages/tenant-form-page'

test.describe('Visual Regression Testing - TailAdmin Dashboard', () => {
	test.beforeEach(async ({ page }) => {
		// Set consistent viewport for reliable screenshots
		await page.setViewportSize({ width: 1280, height: 720 })
	})

	test('Dashboard page visual snapshot', async ({ page }) => {
		const dashboardPage = new DashboardPage(page)
		await dashboardPage.goto()
		
		// Wait for page to fully load
		await dashboardPage.verifyDashboardLoaded()
		
		// Take full page screenshot
		await expect(page).toHaveScreenshot('dashboard-full-page.png')
		
		// Take sidebar screenshot
		await expect(dashboardPage.sidebar).toHaveScreenshot('dashboard-sidebar.png')
	})

	test('Tenant form visual snapshot', async ({ page }) => {
		const tenantForm = new TenantFormPage(page)
		await tenantForm.goto()
		
		// Wait for form to load
		await tenantForm.verifyFormLoaded()
		
		// Take full form screenshot
		await expect(page).toHaveScreenshot('tenant-form-full.png')
		
		// Take individual form section screenshots
		await expect(tenantForm.personalInfoSection).toHaveScreenshot('tenant-form-personal-info.png')
		await expect(tenantForm.emergencyContactSection).toHaveScreenshot('tenant-form-emergency-contact.png')
		await expect(tenantForm.additionalInfoSection).toHaveScreenshot('tenant-form-additional-info.png')
	})

	test('Form validation errors visual snapshot', async ({ page }) => {
		const tenantForm = new TenantFormPage(page)
		await tenantForm.goto()
		await tenantForm.verifyFormLoaded()
		
		// Submit empty form to trigger validation
		await tenantForm.submitForm()
		
		// Wait for validation errors to appear
		await page.waitForTimeout(1000)
		
		// Screenshot form with validation errors
		await expect(page).toHaveScreenshot('tenant-form-validation-errors.png')
	})

	test('Responsive design - Mobile viewport', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })
		
		const dashboardPage = new DashboardPage(page)
		await dashboardPage.goto()
		await dashboardPage.verifyDashboardLoaded()
		
		// Mobile dashboard screenshot
		await expect(page).toHaveScreenshot('dashboard-mobile.png')
		
		// Test tenant form on mobile
		const tenantForm = new TenantFormPage(page)
		await tenantForm.goto()
		await tenantForm.verifyFormLoaded()
		
		await expect(page).toHaveScreenshot('tenant-form-mobile.png')
	})

	test('Dark mode visual snapshot', async ({ page }) => {
		// Enable dark mode by adding class to body
		await page.addStyleTag({
			content: `
				body { 
					color-scheme: dark; 
				}
				html { 
					class: "dark"; 
				}
			`
		})
		
		const dashboardPage = new DashboardPage(page)
		await dashboardPage.goto()
		await dashboardPage.verifyDashboardLoaded()
		
		// Dark mode dashboard screenshot
		await expect(page).toHaveScreenshot('dashboard-dark-mode.png')
		
		// Dark mode tenant form
		const tenantForm = new TenantFormPage(page)
		await tenantForm.goto()
		await tenantForm.verifyFormLoaded()
		
		await expect(page).toHaveScreenshot('tenant-form-dark-mode.png')
	})
})
