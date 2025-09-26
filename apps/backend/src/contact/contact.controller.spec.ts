import { BadRequestException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { ContactFormRequest } from '@repo/shared'
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

		it('should throw BadRequestException for null/undefined input', async () => {
			await expect(
				controller.submitContactForm(null as unknown as ContactFormRequest)
			).rejects.toThrow(BadRequestException)
			await expect(
				controller.submitContactForm(undefined as unknown as ContactFormRequest)
			).rejects.toThrow(BadRequestException)
		})

		it('should throw BadRequestException for non-object input', async () => {
			await expect(
				controller.submitContactForm('string' as unknown as ContactFormRequest)
			).rejects.toThrow(BadRequestException)
			await expect(
				controller.submitContactForm(123 as unknown as ContactFormRequest)
			).rejects.toThrow(BadRequestException)
		})

		describe('name validation', () => {
			it('should throw BadRequestException for missing name', async () => {
				const invalidForm = { ...validContactForm, name: undefined }
				await expect(
					controller.submitContactForm(
						invalidForm as unknown as ContactFormRequest
					)
				).rejects.toThrow(BadRequestException)
			})

			it('should throw BadRequestException for non-string name', async () => {
				const invalidForm = { ...validContactForm, name: 123 }
				await expect(
					controller.submitContactForm(
						invalidForm as unknown as ContactFormRequest
					)
				).rejects.toThrow(BadRequestException)
			})

			it('should throw BadRequestException for empty name', async () => {
				const invalidForm = { ...validContactForm, name: '   ' }
				await expect(controller.submitContactForm(invalidForm)).rejects.toThrow(
					BadRequestException
				)
			})

			it('should throw BadRequestException for name longer than 100 characters', async () => {
				const invalidForm = { ...validContactForm, name: 'a'.repeat(101) }
				await expect(controller.submitContactForm(invalidForm)).rejects.toThrow(
					BadRequestException
				)
			})
		})

		describe('email validation', () => {
			it('should throw BadRequestException for missing email', async () => {
				const invalidForm = { ...validContactForm, email: undefined }
				await expect(
					controller.submitContactForm(
						invalidForm as unknown as ContactFormRequest
					)
				).rejects.toThrow(BadRequestException)
			})

			it('should throw BadRequestException for non-string email', async () => {
				const invalidForm = { ...validContactForm, email: 123 }
				await expect(
					controller.submitContactForm(
						invalidForm as unknown as ContactFormRequest
					)
				).rejects.toThrow(BadRequestException)
			})

			it('should throw BadRequestException for email without @', async () => {
				const invalidForm = { ...validContactForm, email: 'invalid-email' }
				await expect(controller.submitContactForm(invalidForm)).rejects.toThrow(
					BadRequestException
				)
			})
		})

		describe('subject validation', () => {
			it('should throw BadRequestException for missing subject', async () => {
				const invalidForm = { ...validContactForm, subject: undefined }
				await expect(
					controller.submitContactForm(
						invalidForm as unknown as ContactFormRequest
					)
				).rejects.toThrow(BadRequestException)
			})

			it('should throw BadRequestException for non-string subject', async () => {
				const invalidForm = { ...validContactForm, subject: 123 }
				await expect(
					controller.submitContactForm(
						invalidForm as unknown as ContactFormRequest
					)
				).rejects.toThrow(BadRequestException)
			})

			it('should throw BadRequestException for empty subject', async () => {
				const invalidForm = { ...validContactForm, subject: '   ' }
				await expect(controller.submitContactForm(invalidForm)).rejects.toThrow(
					BadRequestException
				)
			})

			it('should throw BadRequestException for subject longer than 200 characters', async () => {
				const invalidForm = { ...validContactForm, subject: 'a'.repeat(201) }
				await expect(controller.submitContactForm(invalidForm)).rejects.toThrow(
					BadRequestException
				)
			})
		})

		describe('message validation', () => {
			it('should throw BadRequestException for missing message', async () => {
				const invalidForm = { ...validContactForm, message: undefined }
				await expect(
					controller.submitContactForm(
						invalidForm as unknown as ContactFormRequest
					)
				).rejects.toThrow(BadRequestException)
			})

			it('should throw BadRequestException for non-string message', async () => {
				const invalidForm = { ...validContactForm, message: 123 }
				await expect(
					controller.submitContactForm(
						invalidForm as unknown as ContactFormRequest
					)
				).rejects.toThrow(BadRequestException)
			})

			it('should throw BadRequestException for message shorter than 10 characters', async () => {
				const invalidForm = { ...validContactForm, message: 'short' }
				await expect(controller.submitContactForm(invalidForm)).rejects.toThrow(
					BadRequestException
				)
			})

			it('should throw BadRequestException for message longer than 5000 characters', async () => {
				const invalidForm = { ...validContactForm, message: 'a'.repeat(5001) }
				await expect(controller.submitContactForm(invalidForm)).rejects.toThrow(
					BadRequestException
				)
			})
		})

		describe('type validation', () => {
			it('should throw BadRequestException for missing type', async () => {
				const invalidForm = { ...validContactForm, type: undefined }
				await expect(
					controller.submitContactForm(
						invalidForm as unknown as ContactFormRequest
					)
				).rejects.toThrow(BadRequestException)
			})

			it('should throw BadRequestException for invalid type', async () => {
				const invalidForm = { ...validContactForm, type: 'invalid' }
				await expect(
					controller.submitContactForm(
						invalidForm as unknown as ContactFormRequest
					)
				).rejects.toThrow(BadRequestException)
			})

			it('should accept valid types', async () => {
				const expectedResponse = {
					success: true,
					message: 'Contact form submitted successfully'
				}
				mockContactServiceInstance.processContactForm.mockResolvedValue(
					expectedResponse
				)

				const validTypes: Array<'sales' | 'support' | 'general'> = [
					'sales',
					'support',
					'general'
				]

				for (const type of validTypes) {
					const validForm = { ...validContactForm, type }
					await expect(
						controller.submitContactForm(validForm)
					).resolves.toEqual(expectedResponse)
				}
			})
		})

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
