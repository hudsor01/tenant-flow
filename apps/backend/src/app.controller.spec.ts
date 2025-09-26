import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { AppController } from './app.controller'
import { AppService } from './app.service'

// Mock the AppService
jest.mock('./app.service', () => {
	return {
		AppService: jest.fn().mockImplementation(() => ({
			getHello: jest.fn()
		}))
	}
})

describe('AppController', () => {
	let controller: AppController
	let mockAppServiceInstance: jest.Mocked<AppService>

	beforeEach(async () => {
		// Clear all mocks before each test
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [AppController],
			providers: [AppService]
		}).compile()

		controller = module.get<AppController>(AppController)
		mockAppServiceInstance = module.get(AppService) as jest.Mocked<AppService>
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('getHello', () => {
		it('should return hello message from service', () => {
			const expectedMessage = 'Hello World!'
			mockAppServiceInstance.getHello.mockReturnValue(expectedMessage)

			const result = controller.getHello()

			expect(mockAppServiceInstance.getHello).toHaveBeenCalledTimes(1)
			expect(result).toBe(expectedMessage)
		})

		it('should handle different return values from service', () => {
			const testMessages = [
				'API is running',
				'TenantFlow Backend',
				'Service healthy',
				''
			]

			testMessages.forEach(message => {
				mockAppServiceInstance.getHello.mockReturnValue(message)
				const result = controller.getHello()
				expect(result).toBe(message)
			})
		})

		it('should propagate service errors', () => {
			mockAppServiceInstance.getHello.mockImplementation(() => {
				throw new Error('Service error')
			})

			expect(() => controller.getHello()).toThrow('Service error')
		})
	})
})
