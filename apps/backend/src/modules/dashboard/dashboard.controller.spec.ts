import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { GoneException } from '@nestjs/common'

import { DashboardController } from './dashboard.controller'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('DashboardController', () => {
	let controller: DashboardController

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [DashboardController],
			providers: [
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		controller = module.get<DashboardController>(DashboardController)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('Legacy /manage routes', () => {
		const expectGone = (path?: string) => {
			expect(() => controller.handleLegacyRoute(path)).toThrow(GoneException)
			expect(() => controller.handleLegacyRoute(path)).toThrow(
				'Legacy /manage routes have been removed. Use /owner/... endpoints.'
			)
		}

		it('should throw GoneException for root legacy route', () => {
			expectGone('')
		})

		it('should throw GoneException for /manage/stats legacy route', () => {
			expectGone('stats')
		})

		it('should throw GoneException for /manage/activity legacy route', () => {
			expectGone('activity')
		})

		it('should throw GoneException for /manage/billing/insights legacy route', () => {
			expectGone('billing/insights')
		})

		it('should throw GoneException for /manage/billing/health legacy route', () => {
			expectGone('billing/health')
		})

		it('should throw GoneException for /manage/property-performance legacy route', () => {
			expectGone('property-performance')
		})

		it('should throw GoneException for /manage/uptime legacy route', () => {
			expectGone('uptime')
		})

		it('should throw GoneException for nested legacy routes', () => {
			expectGone('nested/route/path')
		})

		it('should handle undefined path parameter', () => {
			expectGone(undefined)
		})

		it('normalizes trailing slashes before throwing', () => {
			expectGone('stats/')
		})
	})
})
