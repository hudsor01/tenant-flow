import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { CSPReportBody } from '@repo/shared/types/domain'
import { SecurityMetricsService } from './security-metrics.service'
import { SecurityController } from './security.controller'
import { AppConfigService } from '../config/app-config.service'

describe('SecurityController', () => {
	let controller: SecurityController
	let mockMetricsService: jest.Mocked<SecurityMetricsService>
	let mockConfigService: jest.Mocked<AppConfigService>

	beforeEach(async () => {
		mockMetricsService = {
			getMetrics: jest.fn(),
			recordEvent: jest.fn()
		} as unknown as jest.Mocked<SecurityMetricsService>

		mockConfigService = {
			get: jest.fn(),
			getOrThrow: jest.fn()
		} as unknown as jest.Mocked<AppConfigService>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [SecurityController],
			providers: [
				{ provide: SecurityMetricsService, useValue: mockMetricsService },
				{ provide: AppConfigService, useValue: mockConfigService }
			]
		}).compile()

		controller = module.get<SecurityController>(SecurityController)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('handleCSPReport', () => {
		const validCSPReport: CSPReportBody = {
			'csp-report': {
				'document-uri': 'https://example.com',
				referrer: 'https://example.com',
				'violated-directive': 'script-src',
				'effective-directive': 'script-src',
				'original-policy': "default-src 'self'",
				disposition: 'enforce',
				'blocked-uri': 'https://malicious.com/script.js',
				'source-file': 'https://example.com/app.js',
				'line-number': 42,
				'column-number': 10,
				'status-code': 200,
				'script-sample': ''
			}
		}

		it('should handle valid CSP report', async () => {
			await expect(
				controller.handleCSPReport(validCSPReport)
			).resolves.toBeUndefined()
		})

		it('should handle CSP report with minimal data', async () => {
			const minimalReport: CSPReportBody = {
				'csp-report': {
					'document-uri': 'https://example.com',
					referrer: '',
					'violated-directive': 'script-src',
					'effective-directive': 'script-src',
					'original-policy': "default-src 'self'",
					disposition: 'enforce',
					'blocked-uri': 'eval',
					'source-file': '',
					'line-number': 0,
					'column-number': 0,
					'status-code': 0,
					'script-sample': ''
				}
			}

			await expect(
				controller.handleCSPReport(minimalReport)
			).resolves.toBeUndefined()
		})
	})

	describe('getSecurityMetrics', () => {
		it('should return security metrics', async () => {
			const mockMetrics = {
				totalEvents: 100,
				criticalEvents: 5,
				highSeverityEvents: 15,
				mediumSeverityEvents: 30,
				lowSeverityEvents: 50
			}

			mockMetricsService.getMetrics.mockResolvedValue(mockMetrics as any)

			const result = await controller.getSecurityMetrics()

			expect(result.success).toBe(true)
			expect(result.data).toEqual(mockMetrics)
			expect(typeof result.timestamp).toBe('string')
			expect(mockMetricsService.getMetrics).toHaveBeenCalled()
		})
	})
})
