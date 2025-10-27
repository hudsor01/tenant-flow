import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

test.describe('Property CSV Template Download', () => {
	const TEST_EMAIL = process.env.E2E_OWNER_EMAIL || 'rhudsontspr+46@gmail.com'
	const TEST_PASSWORD = process.env.E2E_OWNER_PASSWORD || 'TestPassword123!'

	test('should download CSV template with correct headers and sample data', async ({
		page
	}) => {
		// Step 1: Navigate to properties page (will redirect to login)
		console.log('📍 Step 1: Navigating to /manage/properties')
		await page.goto('http://localhost:3000/manage/properties')

		// Wait for login page (page.goto already waits for navigation, just verify URL)
		await page.waitForURL('**/login**', { timeout: 10000 })
		console.log('✅ Redirected to login page')

		// Step 2: Login with test credentials
		console.log('🔑 Step 2: Logging in with test credentials')
		console.log(`   Email: ${TEST_EMAIL}`)

		await page.fill('input[name="email"]', TEST_EMAIL)
		await page.fill('input[name="password"]', TEST_PASSWORD)
		await page.click('button[type="submit"]')

		// Wait for redirect after login (goes to /manage by default)
		await page.waitForURL('**/manage**', { timeout: 15000 })
		console.log('✅ Successfully logged in')

		// Step 3: Navigate to properties page
		console.log('📍 Step 3: Navigating to properties page')
		await page.goto('http://localhost:3000/manage/properties')
		await page.waitForLoadState('networkidle')
		console.log('✅ Properties page loaded')

		// Step 4: Click "Bulk Import" button to open dialog
		console.log('📂 Step 4: Opening Bulk Import dialog')
		const bulkImportButton = page.locator('button:has-text("Bulk Import")')
		await expect(bulkImportButton).toBeVisible({ timeout: 5000 })
		await bulkImportButton.click()

		// Wait for dialog to appear
		const dialog = page.locator('role=dialog')
		await expect(dialog).toBeVisible({ timeout: 5000 })
		console.log('✅ Bulk Import dialog opened')

		// Verify dialog title
		const dialogTitle = page.locator('role=dialog >> text=Bulk Import Properties')
		await expect(dialogTitle).toBeVisible()
		console.log('✅ Dialog title confirmed')

		// Step 5: Click "Download" button and capture download
		console.log('⬇️  Step 5: Clicking Download button')

		// Set up download listener
		const downloadPromise = page.waitForEvent('download', { timeout: 10000 })

		// Find and click the download button inside the dialog
		const downloadButton = page
			.locator('role=dialog')
			.locator('button:has-text("Download")')
		await expect(downloadButton).toBeVisible({ timeout: 5000 })
		await downloadButton.click()

		// Wait for download
		const download = await downloadPromise
		console.log('✅ Download started')

		// Step 6: Save downloaded file
		console.log('💾 Step 6: Saving downloaded file')
		const downloadPath = path.join(
			process.cwd(),
			'downloads',
			'property-import-template.csv'
		)

		// Ensure download directory exists
		const downloadDir = path.dirname(downloadPath)
		if (!fs.existsSync(downloadDir)) {
			fs.mkdirSync(downloadDir, { recursive: true })
		}

		await download.saveAs(downloadPath)
		console.log(`✅ File saved to: ${downloadPath}`)

		// Verify file exists
		expect(fs.existsSync(downloadPath)).toBe(true)

		// Step 7: Verify file content
		console.log('🔍 Step 7: Verifying file content')
		const fileContent = fs.readFileSync(downloadPath, 'utf-8')

		console.log('📄 File Content:')
		console.log('─'.repeat(80))
		console.log(fileContent)
		console.log('─'.repeat(80))

		// Expected headers
		const expectedHeaders = [
			'name',
			'address',
			'city',
			'state',
			'zipCode',
			'propertyType',
			'description'
		]

		// Parse CSV content
		const lines = fileContent.trim().split('\n')
		expect(lines.length).toBeGreaterThan(1) // Header + at least 1 sample row

		// Verify headers
		const headerLine = lines[0]
		const headers = headerLine.split(',')

		console.log('✅ Expected Headers:', expectedHeaders.join(', '))
		console.log('✅ Actual Headers:', headers.join(', '))

		// Check all expected headers are present
		for (const expectedHeader of expectedHeaders) {
			expect(headers).toContain(expectedHeader)
		}

		// Verify sample data rows exist
		console.log(`✅ File has ${lines.length} lines (including header)`)
		expect(lines.length).toBeGreaterThanOrEqual(2) // At least header + 1 sample

		// Verify sample data contains expected property types
		const fileText = fileContent.toLowerCase()
		expect(fileText).toContain('apartment') // Sample property type
		expect(fileText).toContain('single_family') // Sample property type

		console.log('✅ Sample data verified')

		// Clean up downloaded file
		fs.unlinkSync(downloadPath)
		console.log('🧹 Cleaned up downloaded file')

		console.log('🎉 TEST PASSED: CSV template download working correctly!')
	})
})
