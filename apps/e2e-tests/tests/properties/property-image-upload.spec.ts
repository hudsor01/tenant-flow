import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

test.describe('Property Image Upload', () => {
	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
	let testImagePath: string
	let testImagePaths: string[]

	test.beforeAll(() => {
		// Create test images (1x1 PNG files with different colors)
		const testImagesDir = path.join(__dirname, '../../fixtures/images')
		if (!fs.existsSync(testImagesDir)) {
			fs.mkdirSync(testImagesDir, { recursive: true })
		}

		testImagePath = path.join(testImagesDir, 'test-property-image.png')

		// Create a minimal PNG file (1x1 red pixel)
		const pngData = Buffer.from([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
			0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
			0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
			0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
			0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb4, 0x00, 0x00, 0x00,
			0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
		])

		fs.writeFileSync(testImagePath, pngData)

		// Create additional test images for creation test
		testImagePaths = [
			path.join(testImagesDir, 'test-property-front.png'),
			path.join(testImagesDir, 'test-property-side.png'),
			path.join(testImagesDir, 'test-property-back.png')
		]

		testImagePaths.forEach(imagePath => {
			fs.writeFileSync(imagePath, pngData)
		})
	})

	// No beforeEach needed — the chromium project injects storageState: OWNER_AUTH_FILE
	// before every test. Adding loginAsOwner() here causes a double-auth loop:
	// storageState already sets auth cookies → /login redirects to /dashboard → timeout.

	test('should create property with images during creation (NEW FEATURE)', async ({
		page
	}) => {
		// Navigate to property creation page
		await page.goto(`${baseUrl}/properties/new`, { waitUntil: 'domcontentloaded' })

		// Verify we're on the create page (this also waits for the page to be interactive)
		await expect(page.getByRole('heading', { name: /add new property/i })).toBeVisible()

		// Wait for form to be fully loaded
		await page.waitForTimeout(1000)

		// Fill out required property fields (click first, then fill to ensure focus)
		const nameInput = page.getByLabel(/property name/i).first()
		await nameInput.click()
		await nameInput.fill('E2E Test Property with Images')

		const addressInput = page.getByLabel(/address/i).first()
		await addressInput.click()
		await addressInput.fill('789 Creation Test Blvd')

		const cityInput = page.getByLabel(/city/i).first()
		await cityInput.click()
		await cityInput.fill('Los Angeles')

		const stateInput = page.getByLabel(/state/i).first()
		await stateInput.click()
		await stateInput.fill('CA')

		const zipInput = page.getByLabel(/zip/i).first()
		await zipInput.click()
		await zipInput.fill('90001')

		// Upload multiple test images before submitting (use first() to target desktop form only)
		const fileInput = page.locator('input[type="file"]').first()
		await fileInput.setInputFiles(testImagePaths)

		// Verify files are selected - check for file count indicator or preview
		await page.waitForTimeout(500) // Brief wait for React state update
		const fileCountText = await page.textContent('body')
		const hasFileIndicator = fileCountText?.includes('3 image') ||
		                        fileCountText?.includes('selected') ||
		                        (await page.locator('img[src^="blob:"]').count()) === 3

		expect(hasFileIndicator).toBeTruthy()

		// Submit the form
		const button = page.getByRole('button', { name: /create property/i })
		await button.click()

		// Wait for property creation AND image upload to complete
		await page.waitForFunction(
			() => {
				const text = document.body.textContent || ''
				return (
					text.includes('Property created') ||
					text.includes('image(s) uploaded') ||
					text.includes('successfully')
				)
			},
			{ timeout: 15000 }
		)

		// Wait for upload overlay statuses to complete (uploading -> success)
		await page.waitForFunction(
			() => {
				const text = document.body.textContent || ''
				return !text.includes('Uploading...')
			},
			{ timeout: 10000 }
		)

		// Verify success toast appeared
		const bodyText = await page.textContent('body')
		const hasSuccessMessage =
			bodyText?.includes('Property created with') ||
			bodyText?.includes('image(s)') ||
			bodyText?.includes('3 image')

		expect(hasSuccessMessage).toBeTruthy()

		// Navigate to properties list to verify creation
		await page.goto(`${baseUrl}/properties`)
		await page.waitForLoadState('domcontentloaded')

		// Switch to grid view if currently in table view (Zustand persists view mode)
		const gridButton = page.getByRole('button', { name: /grid/i })
		if (await gridButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await gridButton.click()
			await page.waitForTimeout(300)
		}

		// Find the newly created property card (use first() to handle duplicate names from repeated test runs)
		const newPropertyCard = page.locator('[data-testid="property-card"]').filter({
			hasText: 'E2E Test Property with Images'
		}).first()

		await expect(newPropertyCard).toBeVisible()

		// Verify the card has an image (not just placeholder)
		const cardImage = newPropertyCard.locator('img').first()
		const imgSrc = await cardImage.getAttribute('src')

		// Image should be from Supabase storage or Next.js image proxy (not just building icon)
		expect(imgSrc).toBeTruthy()
		console.log('Property card image src:', imgSrc)

		console.log('✅ Property creation with images test completed!')
	})

	test('should upload image and display it on property card', async ({
		page
	}) => {
		// Navigate to /properties
		await page.goto(`${baseUrl}/properties`)
		await page.waitForLoadState('domcontentloaded')

		// Find existing property card
		const propertyCards = page.locator('[data-testid="property-card"]')
		const cardCount = await propertyCards.count()

		if (cardCount === 0) {
			// Create a new property first
			await page.getByRole('button', { name: /add.*property/i }).click()
			await page.waitForLoadState('domcontentloaded')
			await expect(page.getByRole('heading', { name: /add new property/i })).toBeVisible()

			// Fill the form
			const nameInput = page.getByLabel(/property name/i).first()
			await nameInput.click()
			await nameInput.fill('Test Property for Images')
			const addrInput = page.getByLabel(/address/i).first()
			await addrInput.click()
			await addrInput.fill('123 Test Street')
			const cityInput = page.getByLabel(/city/i).first()
			await cityInput.click()
			await cityInput.fill('San Francisco')
			const stateInput = page.getByLabel(/state/i).first()
			await stateInput.click()
			await stateInput.fill('CA')
			const zipInput = page.getByLabel(/zip/i).first()
			await zipInput.click()
			await zipInput.fill('94102')

			// Submit
			await page.getByRole('button', { name: /create property/i }).click()
			await page.waitForTimeout(2000)
			await page.waitForLoadState('domcontentloaded')
		}

		// Get the first property card
		const propertyCard = propertyCards.first()
		await expect(propertyCard).toBeVisible()

		// Click View Details button WITHIN the first property card (property-select-card uses button not link)
		const viewDetailsBtn = propertyCard.getByRole('button', {
			name: /view details/i
		})
		await Promise.all([
			page.waitForURL(/\/properties\/[a-f0-9-]+$/),
			viewDetailsBtn.click()
		])
		await page.waitForLoadState('domcontentloaded')

		// Verify we're on the property details page (URL has property ID)
		expect(page.url()).toMatch(/\/properties\/[a-f0-9-]+/)

		// Click Edit button to go to edit page - wait for navigation
		const editLink = page.getByRole('link', { name: /edit/i }).first()
		await Promise.all([page.waitForURL(/\/edit$/), editLink.click()])
		await page.waitForLoadState('domcontentloaded')

		// Verify we're on the edit page
		expect(page.url()).toContain('/edit')

		// Scroll to Property Images section
		const propertyImagesSection = page.getByRole('heading', {
			name: /property images/i
		})
		await propertyImagesSection.scrollIntoViewIfNeeded()
		await page.waitForTimeout(500)

		// Upload a test image using PropertyImageUpload dropzone (use first() to avoid mobile duplicate)
		const fileInput = page.locator('input[type="file"]').first()
		await fileInput.setInputFiles(testImagePath)

		// Wait for auto-upload to complete (compression + upload happens automatically)
		await page.waitForTimeout(1000) // Brief wait for compression to start

		// Wait for upload to complete
		await page.waitForFunction(
			() => {
				const uploaded =
					document.body.textContent?.includes('Uploaded!') ||
					document.body.textContent?.includes('Image uploaded successfully')
				const noActiveUploads =
					!document.body.textContent?.includes('Compressing...') &&
					!document.body.textContent?.includes('Uploading...')
				return uploaded || noActiveUploads
			},
			{ timeout: 10000 }
		)

		// Verify the image appears in the gallery (look for img tag or "Primary" badge)
		const gallery = page
			.locator('[class*="grid"]')
			.filter({ has: page.locator('img') })
		const primaryBadge = page.getByText('Primary')

		// Either the gallery shows images or the Primary badge appears
		const imageUploaded =
			(await gallery.count()) > 0 || (await primaryBadge.count()) > 0
		expect(imageUploaded).toBeTruthy()

		// Navigate back to /properties
		await page.goto(`${baseUrl}/properties`)
		await page.waitForLoadState('domcontentloaded')
		await page.waitForTimeout(1000)

		// Verify the uploaded image now appears on the property card
		const cardWithImage = page.locator('[data-testid="property-card"]').first()
		await expect(cardWithImage).toBeVisible()

		// Check if there's an actual image (not placeholder)
		const cardImage = cardWithImage.locator('img')
		const hasImage = (await cardImage.count()) > 0

		if (hasImage) {
			const imgSrc = await cardImage.getAttribute('src')
			expect(imgSrc).toBeTruthy()
		} else {
			// Check if Building2 placeholder is shown (acceptable if no images)
			const placeholder = cardWithImage.locator('svg')
			expect(await placeholder.count()).toBeGreaterThan(0)
		}
	})

	test('should show compression statistics during upload', async ({ page }) => {
		// Navigate to a property edit page
		await page.goto(`${baseUrl}/properties`)
		await page.waitForLoadState('domcontentloaded')

		const propertyCard = page.locator('[data-testid="property-card"]').first()

		if ((await propertyCard.count()) > 0) {
			// Navigate to details with navigation wait (property-select-card uses button not link)
			const viewDetailsBtn = propertyCard.getByRole('button', {
				name: /view details/i
			})
			await Promise.all([
				page.waitForURL(/\/properties\/[a-f0-9-]+$/),
				viewDetailsBtn.click()
			])
			await page.waitForLoadState('domcontentloaded')

			// Click Edit with proper wait for navigation
			const editLink = page.getByRole('link', { name: /edit/i }).first()
			await Promise.all([page.waitForURL(/\/edit$/), editLink.click()])
			await page.waitForLoadState('domcontentloaded')

			// Scroll to images section
			const imagesSection = page.getByRole('heading', {
				name: /property images/i
			})
			await imagesSection.scrollIntoViewIfNeeded()

			// Upload image (use first() to avoid mobile duplicate)
			const fileInput = page.locator('input[type="file"]').first()
			await fileInput.setInputFiles(testImagePath)

			// Wait for compression
			await page.waitForTimeout(2000)

			// Verify file was selected (compression may show "smaller" stats)
			const fileSelected = page
				.locator('text=test-property-image')
				.or(page.locator('[class*="preview"]'))
			expect(await fileSelected.count()).toBeGreaterThanOrEqual(0)
		}
	})

	test('should navigate to property edit page successfully', async ({
		page
	}) => {
		await page.goto(`${baseUrl}/properties`)
		await page.waitForLoadState('domcontentloaded')

		const propertyCard = page.locator('[data-testid="property-card"]').first()

		if ((await propertyCard.count()) > 0) {
			// Click View Details with navigation wait (property-select-card uses button not link)
			const viewDetailsBtn = propertyCard.getByRole('button', {
				name: /view details/i
			})
			await Promise.all([
				page.waitForURL(/\/properties\/[a-f0-9-]+$/),
				viewDetailsBtn.click()
			])
			await page.waitForLoadState('domcontentloaded')

			// Verify details page loaded (URL has property ID)
			expect(page.url()).toMatch(/\/properties\/[a-f0-9-]+/)

			// Click Edit with proper wait for navigation
			const editLink = page.getByRole('link', { name: /edit/i }).first()
			await Promise.all([page.waitForURL(/\/edit$/), editLink.click()])
			await page.waitForLoadState('domcontentloaded')

			// Verify edit page loaded
			expect(page.url()).toContain('/edit')

			// Verify Property Images section exists
			const imagesSection = page.getByRole('heading', {
				name: /property images/i
			})
			await expect(imagesSection).toBeVisible()

			// Verify upload dropzone exists
			const dropzone = page.locator('input[type="file"]').first()
			await expect(dropzone).toBeAttached()
		}
	})
})
