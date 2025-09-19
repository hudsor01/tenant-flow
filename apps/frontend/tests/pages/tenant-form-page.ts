import { Page, Locator } from '@playwright/test'
import { BasePage } from './base-page'

/**
 * Page Object Model for the Tenant Creation Form
 * Encapsulates TailAdmin form elements and actions for creating tenants
 */
export class TenantFormPage extends BasePage {
	// Form container
	readonly formContainer: Locator
	readonly breadcrumb: Locator

	// Personal Information section
	readonly personalInfoSection: Locator
	readonly fullNameInput: Locator
	readonly emailInput: Locator
	readonly phoneInput: Locator
	readonly propertySelect: Locator

	// Emergency Contact section
	readonly emergencyContactSection: Locator
	readonly emergencyNameInput: Locator
	readonly emergencyPhoneInput: Locator

	// Additional Information section
	readonly additionalInfoSection: Locator
	readonly employmentInfoTextarea: Locator
	readonly notesTextarea: Locator

	// Form actions
	readonly submitButton: Locator
	readonly cancelButton: Locator

	// Error messages
	readonly errorMessages: Locator

	constructor(page: Page) {
		super(page)
		
		// Form structure
		this.formContainer = this.page.locator('form')
		this.breadcrumb = this.page.locator('nav ol')

		// Personal Information fields
		this.personalInfoSection = this.page.locator('.rounded-2xl').first()
		this.fullNameInput = this.page.locator('input[name="full_name"]')
		this.emailInput = this.page.locator('input[name="email"]')
		this.phoneInput = this.page.locator('input[name="phone"]')
		this.propertySelect = this.page.locator('select[name="property_id"]')

		// Emergency Contact fields
		this.emergencyContactSection = this.page.locator('.rounded-2xl').nth(1)
		this.emergencyNameInput = this.page.locator('input[name="emergency_contact_name"]')
		this.emergencyPhoneInput = this.page.locator('input[name="emergency_contact_phone"]')

		// Additional Information fields
		this.additionalInfoSection = this.page.locator('.rounded-2xl').nth(2)
		this.employmentInfoTextarea = this.page.locator('textarea[name="employment_info"]')
		this.notesTextarea = this.page.locator('textarea[name="notes"]')

		// Form actions
		this.submitButton = this.page.locator('button[type="submit"]')
		this.cancelButton = this.page.locator('a[href="/dashboard/tenants"]')

		// Error messages
		this.errorMessages = this.page.locator('.text-red-500')
	}

	/**
	 * Navigate to the tenant creation form
	 */
	async goto(): Promise<void> {
		await super.goto('/dashboard/tenants/new')
		await this.waitForLoad()
	}

	/**
	 * Fill the personal information section
	 */
	async fillPersonalInfo(data: {
		fullName: string
		email: string
		phone: string
		propertyId?: string
	}): Promise<void> {
		await this.fullNameInput.fill(data.fullName)
		await this.emailInput.fill(data.email)
		await this.phoneInput.fill(data.phone)
		
		if (data.propertyId) {
			await this.propertySelect.selectOption(data.propertyId)
		}
	}

	/**
	 * Fill the emergency contact section
	 */
	async fillEmergencyContact(data: {
		name: string
		phone: string
	}): Promise<void> {
		await this.emergencyNameInput.fill(data.name)
		await this.emergencyPhoneInput.fill(data.phone)
	}

	/**
	 * Fill the additional information section
	 */
	async fillAdditionalInfo(data: {
		employmentInfo?: string
		notes?: string
	}): Promise<void> {
		if (data.employmentInfo) {
			await this.employmentInfoTextarea.fill(data.employmentInfo)
		}
		
		if (data.notes) {
			await this.notesTextarea.fill(data.notes)
		}
	}

	/**
	 * Submit the tenant form
	 */
	async submitForm(): Promise<void> {
		await this.submitButton.click()
	}

	/**
	 * Cancel form and return to tenants list
	 */
	async cancelForm(): Promise<void> {
		await this.cancelButton.click()
	}

	/**
	 * Fill complete tenant form with all data
	 */
	async createTenant(data: {
		fullName: string
		email: string
		phone: string
		propertyId?: string
		emergencyContact?: {
			name: string
			phone: string
		}
		additionalInfo?: {
			employmentInfo?: string
			notes?: string
		}
	}): Promise<void> {
		await this.fillPersonalInfo({
			fullName: data.fullName,
			email: data.email,
			phone: data.phone,
			propertyId: data.propertyId
		})

		if (data.emergencyContact) {
			await this.fillEmergencyContact(data.emergencyContact)
		}

		if (data.additionalInfo) {
			await this.fillAdditionalInfo(data.additionalInfo)
		}

		await this.submitForm()
	}

	/**
	 * Verify form has loaded with TailAdmin styling
	 */
	async verifyFormLoaded(): Promise<void> {
		await this.waitForElement('form')
		await this.waitForElement('.rounded-2xl')
		await this.waitForElement('input[name="full_name"]')
	}

	/**
	 * Verify form validation errors
	 */
	async verifyValidationErrors(expectedCount: number): Promise<void> {
		await this.page.waitForTimeout(1000) // Allow validation to trigger
		const errorCount = await this.errorMessages.count()
		if (errorCount !== expectedCount) {
			throw new Error(`Expected ${expectedCount} validation errors, but found ${errorCount}`)
		}
	}
}
