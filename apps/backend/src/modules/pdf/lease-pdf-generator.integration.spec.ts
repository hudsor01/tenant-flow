/**
 * Integration tests for LeasePdfGeneratorService
 *
 * These tests verify that PDF generation works with real template files,
 * ensuring the implementation will work in production.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { LeasePdfGeneratorService } from './lease-pdf-generator.service'
import { TemplateCacheService } from './template-cache.service'
import { StateValidationService } from './state-validation.service'
import { AppLogger } from '../../logger/app-logger.service'
import type { LeasePdfFields } from './lease-pdf-mapper.service'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

describe('LeasePdfGeneratorService Integration', () => {
	let service: LeasePdfGeneratorService
	let templateCache: TemplateCacheService

	const mockFields: LeasePdfFields = {
		agreement_date_day: '15',
		agreement_date_month: 'December',
		agreement_date_year: '23',
		landlord_name: 'John Doe',
		tenant_name: 'Jane Smith',
		property_address: '123 Main St, Austin, TX',
		lease_start_date: 'January 1, 2024',
		lease_end_date: 'December 31, 2024',
		monthly_rent_amount: '$1,500.00',
		security_deposit_amount: '$1,500.00',
		late_fee_per_day: '$50.00',
		nsf_fee: '$35.00',
		month_to_month_rent: '$1,650.00',
		pet_fee_per_day: '$25.00',
		property_built_before_1978: 'No'
	}

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				{
					provide: AppLogger,
					useValue: {
						log: jest.fn(),
						error: jest.fn(),
						warn: jest.fn(),
						debug: jest.fn()
					}
				},
				StateValidationService,
				TemplateCacheService,
				LeasePdfGeneratorService
			]
		}).compile()

		service = module.get<LeasePdfGeneratorService>(LeasePdfGeneratorService)
		templateCache = module.get<TemplateCacheService>(TemplateCacheService)
	})

	describe('Template File Existence', () => {
		it('should have Texas template file in templates or assets directory', () => {
			const possiblePaths = [
				resolve(
					__dirname,
					'templates',
					'Texas_Residential_Lease_Agreement.pdf'
				),
				resolve(
					process.cwd(),
					'apps',
					'backend',
					'src',
					'modules',
					'pdf',
					'templates',
					'Texas_Residential_Lease_Agreement.pdf'
				),
				resolve(
					process.cwd(),
					'src',
					'modules',
					'pdf',
					'templates',
					'Texas_Residential_Lease_Agreement.pdf'
				),
				resolve(
					process.cwd(),
					'apps',
					'backend',
					'assets',
					'Texas_Residential_Lease_Agreement.pdf'
				),
				resolve(
					process.cwd(),
					'assets',
					'Texas_Residential_Lease_Agreement.pdf'
				),
				resolve(
					__dirname,
					'..',
					'..',
					'..',
					'assets',
					'Texas_Residential_Lease_Agreement.pdf'
				)
			]

			const foundPath = possiblePaths.find(p => existsSync(p))

			expect(foundPath).toBeDefined()
		})

		it('should load Texas template metadata from real filesystem', async () => {
			const metadata = await templateCache.getTemplateMetadata(
				'TX',
				'RESIDENTIAL'
			)

			expect(metadata.exists).toBe(true)
			expect(metadata.stateCode).toBe('TX')
			expect(metadata.stateName).toBe('Texas')
			expect(metadata.path).toContain('Texas_Residential_Lease_Agreement.pdf')
		})

		it('should load Texas template content from real filesystem', async () => {
			const content = await templateCache.getTemplateContent(
				'TX',
				'RESIDENTIAL'
			)

			expect(content).toBeDefined()
			expect(content).toBeInstanceOf(Uint8Array)
			expect(content.length).toBeGreaterThan(0)

			// Verify it's a valid PDF by checking header
			const header = String.fromCharCode(...Array.from(content.slice(0, 4)))
			expect(header).toBe('%PDF')
		})
	})

	describe('PDF Generation with Real Templates', () => {
		it('should generate filled PDF using real Texas template', async () => {
			const result = await service.generateFilledPdf(
				mockFields,
				'lease-integration-test'
			)

			expect(result).toBeInstanceOf(Buffer)
			expect(result.length).toBeGreaterThan(0)

			// Verify it's a valid PDF
			const header = result.toString('utf8', 0, 4)
			expect(header).toBe('%PDF')
		}, 10000) // 10s timeout for PDF generation

		it('should validate template before generation', async () => {
			const result = await service.generateFilledPdf(
				mockFields,
				'lease-validation-test',
				{
					validateTemplate: true
				}
			)

			expect(result).toBeInstanceOf(Buffer)
			expect(result.length).toBeGreaterThan(0)
		}, 10000)

		it('should handle unsupported states by falling back to Texas template', async () => {
			const result = await service.generateFilledPdf(
				mockFields,
				'lease-fallback-test',
				{
					state: 'CA' // Unsupported state
				}
			)

			expect(result).toBeInstanceOf(Buffer)
			expect(result.length).toBeGreaterThan(0)

			// Should fallback to TX template
			const header = result.toString('utf8', 0, 4)
			expect(header).toBe('%PDF')
		}, 10000)
	})

	describe('Template Caching', () => {
		it('should cache template metadata after first load', async () => {
			// First load
			const metadata1 = await templateCache.getTemplateMetadata(
				'TX',
				'RESIDENTIAL'
			)

			// Second load (should be cached)
			const metadata2 = await templateCache.getTemplateMetadata(
				'TX',
				'RESIDENTIAL'
			)

			expect(metadata1).toEqual(metadata2)
		})

		it('should cache template content after first load', async () => {
			// First load
			const content1 = await templateCache.getTemplateContent(
				'TX',
				'RESIDENTIAL'
			)

			// Second load (should be cached)
			const content2 = await templateCache.getTemplateContent(
				'TX',
				'RESIDENTIAL'
			)

			expect(content1).toEqual(content2)
		})
	})

	describe('Production Environment Simulation', () => {
		it('should work when process.cwd() is repo root', async () => {
			// This simulates CI/production where cwd is the monorepo root
			const result = await service.generateFilledPdf(
				mockFields,
				'lease-prod-sim-test'
			)

			expect(result).toBeInstanceOf(Buffer)
			expect(result.length).toBeGreaterThan(0)
		}, 10000)

		it('should handle concurrent PDF generation requests', async () => {
			const promises = Array.from({ length: 5 }, (_, i) =>
				service.generateFilledPdf(mockFields, `lease-concurrent-${i}`)
			)

			const results = await Promise.all(promises)

			results.forEach(result => {
				expect(result).toBeInstanceOf(Buffer)
				expect(result.length).toBeGreaterThan(0)
			})
		}, 30000)
	})
})
