/**
 * Debug test to inspect the tenant management page structure
 */

import { test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Storage paths for authenticated sessions
const STORAGE_STATE = {
	OWNER: path.join(__dirname, '..', '.auth', 'owner.json'),
	TENANT: path.join(__dirname, '..', '.auth', 'tenant.json'),
	ADMIN: path.join(__dirname, '..', '.auth', 'admin.json')
}

test.describe('Debug Tenant Page', () => {
	test.use({ storageState: STORAGE_STATE.OWNER })

	test('inspect tenant management page', async ({ page }) => {
		// Navigate to tenant management
		await page.goto('/manage/tenants')
		await page.waitForLoadState('networkidle')

		// Wait for skeleton loaders to disappear
		console.log('\n=== Waiting for content to load (5 seconds) ===')
		await page.waitForTimeout(5000)

		// Take a screenshot
		await page.screenshot({
			path: 'debug-tenant-page-after-wait.png',
			fullPage: true
		})

		// Print all links
		const links = await page.locator('a').all()
		console.log(`\n=== Found ${links.length} links ===`)
		for (const link of links) {
			const text = await link.textContent()
			const href = await link.getAttribute('href')
			console.log(`Link: "${text?.trim()}" -> ${href}`)
		}

		// Print all buttons
		const buttons = await page.locator('button').all()
		console.log(`\n=== Found ${buttons.length} buttons ===`)
		for (const button of buttons) {
			const text = await button.textContent()
			console.log(`Button: "${text?.trim()}"`)
		}

		// Look for any element containing "Add" or "Create" or "Tenant"
		const addElements = await page
			.locator('*:has-text("Add"), *:has-text("Create"), *:has-text("Tenant")')
			.all()
		console.log(
			`\n=== Found ${addElements.length} elements with Add/Create/Tenant ===`
		)
		for (const el of addElements.slice(0, 10)) {
			// Limit to first 10
			const tagName = await el.evaluate(node => node.tagName)
			const text = await el.textContent()
			console.log(`${tagName}: "${text?.trim().substring(0, 50)}"`)
		}

		// Check if page is actually loaded
		const html = await page.content()
		console.log(`\n=== Page HTML length: ${html.length} characters ===`)
		console.log(`Has "Tenants" heading: ${html.includes('Tenants')}`)
		console.log(`Has "Add Tenant": ${html.includes('Add Tenant')}`)
	})
})
