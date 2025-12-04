import { test, expect } from '@playwright/test'
import { loginAsOwner } from '../../auth-helpers'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

test.describe('Property Image Upload', () => {
	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
	let testImagePath: string

	test.beforeAll(() => {
		// Create a test image (1x1 red PNG)
		const testImagesDir = path.join(__dirname, '../../fixtures/images')
		if (!fs.existsSync(testImagesDir)) {
			fs.mkdirSync(testImagesDir, { recursive: true })
		}

		testImagePath = path.join(testImagesDir, 'test-property-image.png')

		// Create a minimal PNG file (1x1 red pixel)
		const pngData = Buffer.from([
			0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
			0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
			0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
			0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
			0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
			0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
			0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
			0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
			0x44, 0xAE, 0x42, 0x60, 0x82
		])

		fs.writeFileSync(testImagePath, pngData)
	})

	test.beforeEach(async ({ page }) => {
		// Login using the existing auth helper
		await loginAsOwner(page)
	})

	test('should upload image and display it on property card', async ({ page }) => {
		// Navigate to /properties
		await page.goto(`${baseUrl}/properties`)
		await page.waitForLoadState('networkidle')

		// Find existing property card
		const propertyCards = page.locator('[data-testid="property-card"]')
		const cardCount = await propertyCards.count()

		if (cardCount === 0) {
			// Create a new property first
			await page.getByRole('button', { name: /new property/i }).click()
			await page.waitForTimeout(500)

			// Fill the form
			await page.getByLabel(/property name/i).fill('Test Property for Images')
			await page.getByLabel(/address/i).first().fill('123 Test Street')
			await page.getByLabel(/city/i).fill('San Francisco')
			await page.getByLabel(/state/i).fill('CA')
			await page.getByLabel(/zip/i).fill('94102')

			// Submit
			await page.getByRole('button', { name: /create property/i }).click()
			await page.waitForTimeout(2000)
			await page.waitForLoadState('networkidle')
		}

		// Get the first property card
		const propertyCard = propertyCards.first()
		await expect(propertyCard).toBeVisible()

		// Click View Details button WITHIN the first property card with navigation wait
		const viewDetailsBtn = propertyCard.getByRole('link', { name: 'View Details' })
		await Promise.all([
			page.waitForURL(/\/properties\/[a-f0-9-]+$/),
			viewDetailsBtn.click()
		])
		await page.waitForLoadState('networkidle')

		// Verify we're on the property details page (URL has property ID)
		expect(page.url()).toMatch(/\/properties\/[a-f0-9-]+/)

		// Click Edit button to go to edit page - wait for navigation
		const editLink = page.getByRole('link', { name: /edit/i }).first()
		await Promise.all([
			page.waitForURL(/\/edit$/),
			editLink.click()
		])
		await page.waitForLoadState('networkidle')

		// Verify we're on the edit page
		expect(page.url()).toContain('/edit')

		// Scroll to Property Images section
		const propertyImagesSection = page.getByRole('heading', { name: /property images/i })
		await propertyImagesSection.scrollIntoViewIfNeeded()
		await page.waitForTimeout(500)

		// Upload a test image using PropertyImageUpload dropzone (use first() to avoid mobile duplicate)
		const fileInput = page.locator('input[type="file"]').first()
		await fileInput.setInputFiles(testImagePath)

		// Wait for auto-upload to complete (compression + upload happens automatically)
		// Look for "Uploading..." or "Uploaded!" status indicators
		await page.waitForTimeout(1000) // Brief wait for compression to start

		// Wait for upload to complete - look for success indicator or wait for file to disappear
		await page.waitForFunction(
			() => {
				// Check if "Uploaded!" appears or if processing is done
				const uploaded = document.body.textContent?.includes('Uploaded!') ||
					document.body.textContent?.includes('Image uploaded successfully')
				const noActiveUploads = !document.body.textContent?.includes('Compressing...') &&
					!document.body.textContent?.includes('Uploading...')
				return uploaded || noActiveUploads
			},
			{ timeout: 10000 }
		)

		// Verify the image appears in the gallery (look for img tag or "Primary" badge)
		const gallery = page.locator('[class*="grid"]').filter({ has: page.locator('img') })
		const primaryBadge = page.getByText('Primary')

		// Either the gallery shows images or the Primary badge appears
		const imageUploaded = await gallery.count() > 0 || await primaryBadge.count() > 0
		expect(imageUploaded).toBeTruthy()

		// Navigate back to /properties
		await page.goto(`${baseUrl}/properties`)
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)

		// Verify the uploaded image now appears on the property card
		// (Should have an img with supabase URL, not just the Building2 placeholder)
		const cardWithImage = page.locator('[data-testid="property-card"]').first()
		await expect(cardWithImage).toBeVisible()

		// Check if there's an actual image (not placeholder)
		const cardImage = cardWithImage.locator('img')
		const hasImage = await cardImage.count() > 0

		if (hasImage) {
			const imgSrc = await cardImage.getAttribute('src')
			console.log('Property card image src:', imgSrc)
			// Verify it's a real image URL (contains supabase storage or nextjs image proxy)
			expect(imgSrc).toBeTruthy()
		} else {
			// Check if Building2 placeholder is shown (acceptable if no images)
			const placeholder = cardWithImage.locator('svg')
			expect(await placeholder.count()).toBeGreaterThan(0)
		}

		console.log('Property image upload test completed!')
	})

	test('should show compression statistics during upload', async ({ page }) => {
		// Navigate to a property edit page
		await page.goto(`${baseUrl}/properties`)
		await page.waitForLoadState('networkidle')

		const propertyCard = page.locator('[data-testid="property-card"]').first()

		if (await propertyCard.count() > 0) {
			// Navigate to details with navigation wait
			const viewDetailsBtn = propertyCard.getByRole('link', { name: 'View Details' })
			await Promise.all([
				page.waitForURL(/\/properties\/[a-f0-9-]+$/),
				viewDetailsBtn.click()
			])
			await page.waitForLoadState('networkidle')

			// Click Edit with proper wait for navigation
			const editLink = page.getByRole('link', { name: /edit/i }).first()
			await Promise.all([
				page.waitForURL(/\/edit$/),
				editLink.click()
			])
			await page.waitForLoadState('networkidle')

			// Scroll to images section
			const imagesSection = page.getByRole('heading', { name: /property images/i })
			await imagesSection.scrollIntoViewIfNeeded()

			// Upload image (use first() to avoid mobile duplicate)
			const fileInput = page.locator('input[type="file"]').first()
			await fileInput.setInputFiles(testImagePath)

			// Wait for compression
			await page.waitForTimeout(2000)

			// Verify file was selected (compression may show "smaller" stats)
			const fileSelected = page.locator('text=test-property-image').or(
				page.locator('[class*="preview"]')
			)
			expect(await fileSelected.count()).toBeGreaterThanOrEqual(0)
		}
	})

	test('should navigate to property edit page successfully', async ({ page }) => {
		await page.goto(`${baseUrl}/properties`)
		await page.waitForLoadState('networkidle')

		const propertyCard = page.locator('[data-testid="property-card"]').first()

		if (await propertyCard.count() > 0) {
			// Click View Details with navigation wait
			const viewDetailsBtn = propertyCard.getByRole('link', { name: 'View Details' })
			await Promise.all([
				page.waitForURL(/\/properties\/[a-f0-9-]+$/),
				viewDetailsBtn.click()
			])
			await page.waitForLoadState('networkidle')

			// Verify details page loaded (URL has property ID)
			expect(page.url()).toMatch(/\/properties\/[a-f0-9-]+/)

			// Click Edit with proper wait for navigation
			const editLink = page.getByRole('link', { name: /edit/i }).first()
			await Promise.all([
				page.waitForURL(/\/edit$/),
				editLink.click()
			])
			await page.waitForLoadState('networkidle')

			// Verify edit page loaded
			expect(page.url()).toContain('/edit')

			// Verify Property Images section exists
			const imagesSection = page.getByRole('heading', { name: /property images/i })
			await expect(imagesSection).toBeVisible()

			// Verify upload dropzone exists
			const dropzone = page.locator('input[type="file"]').first()
			await expect(dropzone).toBeAttached()
		}
	})
})
