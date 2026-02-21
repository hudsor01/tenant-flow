import { UnauthorizedException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { Reflector } from '@nestjs/core'
import { SupabaseService } from '../../database/supabase.service'
import { ReportsController } from './reports.controller'
import { FinancialReportService } from './financial-report.service'
import { MaintenanceReportService } from './maintenance-report.service'
import { PropertyReportService } from './property-report.service'
import { TenantReportService } from './tenant-report.service'
import { YearEndReportService } from './year-end-report.service'

describe('ReportsController', () => {
	let controller: ReportsController
	let financialReportService: jest.Mocked<FinancialReportService>
	let propertyReportService: jest.Mocked<PropertyReportService>
	let tenantReportService: jest.Mocked<TenantReportService>
	let maintenanceReportService: jest.Mocked<MaintenanceReportService>
	let yearEndReportService: jest.Mocked<YearEndReportService>

	beforeEach(async () => {
		financialReportService = {
			getFinancialReport: jest.fn().mockResolvedValue({ income: 1000 })
		} as unknown as jest.Mocked<FinancialReportService>

		propertyReportService = {
			getPropertyReport: jest.fn().mockResolvedValue({ properties: [] })
		} as unknown as jest.Mocked<PropertyReportService>

		tenantReportService = {
			getTenantReport: jest.fn().mockResolvedValue({ tenants: [] })
		} as unknown as jest.Mocked<TenantReportService>

		maintenanceReportService = {
			getMaintenanceReport: jest.fn().mockResolvedValue({ requests: [] })
		} as unknown as jest.Mocked<MaintenanceReportService>

		yearEndReportService = {
			getYearEndSummary: jest.fn().mockResolvedValue({ year: 2025, grossRentalIncome: 0, operatingExpenses: 0, netIncome: 0, byProperty: [], expenseByCategory: [] }),
			get1099Vendors: jest.fn().mockResolvedValue({ year: 2025, threshold: 600, recipients: [] })
		} as unknown as jest.Mocked<YearEndReportService>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [ReportsController],
			providers: [
				{
					provide: FinancialReportService,
					useValue: financialReportService
				},
				{
					provide: Reflector,
					useValue: { get: jest.fn(), getAllAndOverride: jest.fn() }
				},
				{
					provide: SupabaseService,
					useValue: { getAdminClient: jest.fn() }
				},
				{
					provide: PropertyReportService,
					useValue: propertyReportService
				},
				{
					provide: TenantReportService,
					useValue: tenantReportService
				},
				{
					provide: MaintenanceReportService,
					useValue: maintenanceReportService
				},
				{
					provide: YearEndReportService,
					useValue: yearEndReportService
				}
			]
		}).compile()

		controller = module.get(ReportsController)
	})

	function createAuthenticatedRequest(userId = 'test-user-id') {
		return {
			user: { id: userId, email: 'test@example.com' }
		} as never
	}

	function createUnauthenticatedRequest() {
		return { user: undefined } as never
	}

	describe('authentication', () => {
		it('throws UnauthorizedException when user is not authenticated for financial report', async () => {
			await expect(
				controller.getFinancialReport(createUnauthenticatedRequest())
			).rejects.toBeInstanceOf(UnauthorizedException)
		})

		it('throws UnauthorizedException when user is not authenticated for property report', async () => {
			await expect(
				controller.getPropertyReport(createUnauthenticatedRequest())
			).rejects.toBeInstanceOf(UnauthorizedException)
		})

		it('throws UnauthorizedException when user is not authenticated for tenant report', async () => {
			await expect(
				controller.getTenantReport(createUnauthenticatedRequest())
			).rejects.toBeInstanceOf(UnauthorizedException)
		})

		it('throws UnauthorizedException when user is not authenticated for maintenance report', async () => {
			await expect(
				controller.getMaintenanceReport(createUnauthenticatedRequest())
			).rejects.toBeInstanceOf(UnauthorizedException)
		})
	})

	describe('getFinancialReport', () => {
		it('returns financial report data for authenticated user', async () => {
			const result = await controller.getFinancialReport(
				createAuthenticatedRequest()
			)

			expect(financialReportService.getFinancialReport).toHaveBeenCalledWith(
				'test-user-id',
				undefined,
				undefined
			)
			expect(result).toEqual({
				success: true,
				data: { income: 1000 }
			})
		})

		it('passes date filters to service', async () => {
			await controller.getFinancialReport(
				createAuthenticatedRequest(),
				'2024-01-01',
				'2024-12-31'
			)

			expect(financialReportService.getFinancialReport).toHaveBeenCalledWith(
				'test-user-id',
				'2024-01-01',
				'2024-12-31'
			)
		})
	})

	describe('getPropertyReport', () => {
		it('returns property report data for authenticated user', async () => {
			const result = await controller.getPropertyReport(
				createAuthenticatedRequest()
			)

			expect(propertyReportService.getPropertyReport).toHaveBeenCalledWith(
				'test-user-id',
				undefined,
				undefined
			)
			expect(result).toEqual({
				success: true,
				data: { properties: [] }
			})
		})
	})

	describe('getTenantReport', () => {
		it('returns tenant report data for authenticated user', async () => {
			const result = await controller.getTenantReport(
				createAuthenticatedRequest()
			)

			expect(tenantReportService.getTenantReport).toHaveBeenCalledWith(
				'test-user-id',
				undefined,
				undefined
			)
			expect(result).toEqual({
				success: true,
				data: { tenants: [] }
			})
		})
	})

	describe('getMaintenanceReport', () => {
		it('returns maintenance report data for authenticated user', async () => {
			const result = await controller.getMaintenanceReport(
				createAuthenticatedRequest()
			)

			expect(maintenanceReportService.getMaintenanceReport).toHaveBeenCalledWith(
				'test-user-id',
				undefined,
				undefined
			)
			expect(result).toEqual({
				success: true,
				data: { requests: [] }
			})
		})
	})

	describe('getYearEndSummary', () => {
		it('returns year-end summary for authenticated user', async () => {
			// In unit tests, pipes (DefaultValuePipe, ParseIntPipe) do not run.
			// Pass the already-resolved value that DefaultValuePipe would provide.
			const result = await controller.getYearEndSummary(
				createAuthenticatedRequest(),
				new Date().getFullYear()
			)

			expect(yearEndReportService.getYearEndSummary).toHaveBeenCalledWith(
				'test-user-id',
				new Date().getFullYear()
			)
			expect(result.success).toBe(true)
		})

		it('uses provided year parameter', async () => {
			// ParseIntPipe converts to number in production; pass the number directly in tests.
			await controller.getYearEndSummary(createAuthenticatedRequest(), 2024)

			expect(yearEndReportService.getYearEndSummary).toHaveBeenCalledWith(
				'test-user-id',
				2024
			)
		})

		it('throws UnauthorizedException when user is not authenticated', async () => {
			await expect(
				controller.getYearEndSummary(createUnauthenticatedRequest())
			).rejects.toBeInstanceOf(UnauthorizedException)
		})
	})

	describe('get1099Vendors', () => {
		it('returns 1099 vendor data for authenticated user', async () => {
			// In unit tests, pipes do not run — pass the DefaultValuePipe result directly.
			const result = await controller.get1099Vendors(
				createAuthenticatedRequest(),
				new Date().getFullYear()
			)

			expect(yearEndReportService.get1099Vendors).toHaveBeenCalledWith(
				'test-user-id',
				new Date().getFullYear()
			)
			expect(result.success).toBe(true)
		})

		it('throws UnauthorizedException when user is not authenticated', async () => {
			await expect(
				controller.get1099Vendors(createUnauthenticatedRequest())
			).rejects.toBeInstanceOf(UnauthorizedException)
		})
	})
})
