import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { PDFController } from './pdf.controller'

describe('PDFController', () => {
	let controller: PDFController

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [PDFController]
		}).compile()

		controller = module.get<PDFController>(PDFController)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('health', () => {
		it('should return health status', async () => {
			const result = await controller.health()

			expect(result).toEqual({
				status: 'ok',
				message: 'PDF service is running'
			})
		})

		it('should return consistent health response', async () => {
			const result1 = await controller.health()
			const result2 = await controller.health()

			expect(result1).toEqual(result2)
			expect(result1.status).toBe('ok')
			expect(result1.message).toBe('PDF service is running')
		})
	})
})