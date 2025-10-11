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

	beforeEach(async () => {
		// Clear all mocks before each test
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [AppController],
			providers: [AppService]
		}).compile()

		controller = module.get<AppController>(AppController)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})
})
