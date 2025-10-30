import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { ContactFormRequest } from '@repo/shared/types/domain'
import { ContactController } from './contact.controller'
import { ContactService } from './contact.service'

// Mock the ContactService
jest.mock('./contact.service', () => {
	return {
		ContactService: jest.fn().mockImplementation(() => ({
			processContactForm: jest.fn()
		}))
	}
})

describe('ContactController', () => {
	let controller: ContactController
	let mockContactServiceInstance: jest.Mocked<ContactService>

	beforeEach(async () => {
		// Clear all mocks before each test
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [ContactController],
			providers: [ContactService]
		}).compile()

		controller = module.get<ContactController>(ContactController)
		mockContactServiceInstance = module.get(
			ContactService
		) as jest.Mocked<ContactService>
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('submitContactForm', () => {
		const validContactForm: ContactFormRequest = {
			name: 'John Doe',
			email: 'john@example.com',
			subject: 'Test Subject',
			message:
				'This is a test message that meets the minimum length requirement.',
			type: 'general'
		}

		it('should process valid contact form', async () => {
			const expectedResponse = {
				success: true,
				message: 'Contact form submitted successfully'
			}
			mockContactServiceInstance.processContactForm.mockResolvedValue(
				expectedResponse
			)

			const result = await controller.submitContactForm(validContactForm)

			expect(
				mockContactServiceInstance.processContactForm
			).toHaveBeenCalledWith(validContactForm)
			expect(result).toEqual(expectedResponse)
		})

		// NOTE: Input validation tests are not needed for unit tests
		// Validation is handled by ZodValidationPipe globally configured in app.module.ts
		// The pipe validates DTOs BEFORE requests reach the controller
		// See apps/backend/src/modules/pdf/pdf.controller.integration.spec.ts for validation testing pattern

		it('should handle service errors gracefully', async () => {
			mockContactServiceInstance.processContactForm.mockRejectedValue(
				new Error('Service error')
			)

			await expect(
				controller.submitContactForm(validContactForm)
			).rejects.toThrow('Service error')
		})
	})
})
