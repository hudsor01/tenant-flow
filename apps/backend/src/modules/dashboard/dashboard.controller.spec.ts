import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { GoneException } from '@nestjs/common'

import { DashboardController } from './dashboard.controller'

describe('DashboardController', () => {
	let controller: DashboardController

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [DashboardController]
		}).compile()

		controller = module.get<DashboardController>(DashboardController)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('Legacy /manage routes', () => {
		it('should throw GoneException for root legacy route', () => {
			expect(() => controller.handleLegacyRoute('')).toThrow(GoneException)
			expect(() => controller.handleLegacyRoute('')).toThrow(
				'Legacy /manage routes have been removed. Use /owner/... endpoints.'
			)
		})

		it('should throw GoneException for /manage/stats legacy route', () => {
			expect(() => controller.handleLegacyRoute('stats')).toThrow(GoneException)
			expect(() => controller.handleLegacyRoute('stats')).toThrow(
				'Legacy /manage routes have been removed. Use /owner/... endpoints.'
			)
		})

		it('should throw GoneException for /manage/activity legacy route', () => {
			expect(() => controller.handleLegacyRoute('activity')).toThrow(
				GoneException
			)
			expect(() => controller.handleLegacyRoute('activity')).toThrow(
				'Legacy /manage routes have been removed. Use /owner/... endpoints.'
			)
		})

		it('should throw GoneException for /manage/billing/insights legacy route', () => {
			expect(() => controller.handleLegacyRoute('billing/insights')).toThrow(
				GoneException
			)
			expect(() => controller.handleLegacyRoute('billing/insights')).toThrow(
				'Legacy /manage routes have been removed. Use /owner/... endpoints.'
			)
		})

		it('should throw GoneException for /manage/billing/health legacy route', () => {
			expect(() => controller.handleLegacyRoute('billing/health')).toThrow(
				GoneException
			)
			expect(() => controller.handleLegacyRoute('billing/health')).toThrow(
				'Legacy /manage routes have been removed. Use /owner/... endpoints.'
			)
		})

		it('should throw GoneException for /manage/property-performance legacy route', () => {
			expect(() =>
				controller.handleLegacyRoute('property-performance')
			).toThrow(GoneException)
			expect(() =>
				controller.handleLegacyRoute('property-performance')
			).toThrow('Legacy /manage routes have been removed. Use /owner/... endpoints.')
		})

		it('should throw GoneException for /manage/uptime legacy route', () => {
			expect(() => controller.handleLegacyRoute('uptime')).toThrow(
				GoneException
			)
			expect(() => controller.handleLegacyRoute('uptime')).toThrow(
				'Legacy /manage routes have been removed. Use /owner/... endpoints.'
			)
		})

		it('should throw GoneException for nested legacy routes', () => {
			expect(() => controller.handleLegacyRoute('nested/route/path')).toThrow(
				GoneException
			)
			expect(() => controller.handleLegacyRoute('nested/route/path')).toThrow(
				'Legacy /manage routes have been removed. Use /owner/... endpoints.'
			)
		})

		it('should handle undefined path parameter', () => {
			expect(() => controller.handleLegacyRoute(undefined)).toThrow(
				GoneException
			)
			expect(() => controller.handleLegacyRoute(undefined)).toThrow(
				'Legacy /manage routes have been removed. Use /owner/... endpoints.'
			)
		})
	})
})
