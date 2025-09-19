import { expect, test as setup } from '@playwright/test'
import * as path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
	// Navigate to the sign in page
	await page.goto('http://localhost:3005/auth/login')

	// Fill in the login form with demo credentials
	await page.getByLabel('Email').fill('demo@tenantflow.app')
	await page.getByLabel('Password').fill('demo123456')

	// Submit the form
	await page.getByRole('button', { name: 'Sign In' }).click()

	// Wait for successful login and redirect to dashboard
	await page.waitForURL('http://localhost:3005/dashboard')

	// Verify we're authenticated by checking for dashboard elements
	await expect(page.getByText('Monthly Revenue')).toBeVisible()

	// Save authentication state
	await page.context().storageState({ path: authFile })
})
