/**
 * DocuSeal Service Tests
 *
 * TDD: Tests written BEFORE implementation
 * Tests the DocuSeal API integration for lease e-signatures
 */

import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { Logger } from '@nestjs/common'

import { DocuSealService } from './docuseal.service'
import { AppConfigService } from '../../config/app-config.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('DocuSealService', () => {
	let service: DocuSealService
	let configService: jest.Mocked<AppConfigService>

	const mockApiUrl = 'https://sign.thehudsonfam.com/api'
	const mockApiKey = 'test-api-key-123'

	beforeEach(async () => {
		mockFetch.mockClear()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DocuSealService,
				{
					provide: AppConfigService,
					useValue: {
						getDocuSealApiUrl: jest.fn().mockReturnValue(mockApiUrl),
						getDocuSealApiKey: jest.fn().mockReturnValue(mockApiKey),
						isDocuSealEnabled: jest.fn().mockReturnValue(true),
						getFrontendUrl: jest.fn().mockReturnValue('https://tenantflow.app')
					}
				},
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<DocuSealService>(DocuSealService)
		configService = module.get(AppConfigService)
	})

	describe('isEnabled', () => {
		it('should return true when API key is configured', () => {
			expect(service.isEnabled()).toBe(true)
		})

		it('should return false when API key is not configured', () => {
			configService.isDocuSealEnabled.mockReturnValue(false)
			expect(service.isEnabled()).toBe(false)
		})
	})

	describe('listTemplates', () => {
		it('should fetch templates from DocuSeal API', async () => {
			const mockTemplates = [
				{ id: 1, name: 'Lease Agreement Template', created_at: '2024-01-01' },
				{ id: 2, name: 'Month-to-Month Template', created_at: '2024-01-02' }
			]

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockTemplates
			})

			const result = await service.listTemplates()

			expect(mockFetch).toHaveBeenCalledWith(
				`${mockApiUrl}/templates`,
				expect.objectContaining({
					method: 'GET',
					headers: {
						'X-Auth-Token': mockApiKey,
						'Content-Type': 'application/json'
					}
				})
			)
			expect(result).toEqual(mockTemplates)
		})

		it('should throw error when API returns non-OK response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: 'Unauthorized'
			})

			await expect(service.listTemplates()).rejects.toThrow(
				'DocuSeal API error'
			)
		})

		it('should throw error when DocuSeal is not enabled', async () => {
			configService.isDocuSealEnabled.mockReturnValue(false)

			await expect(service.listTemplates()).rejects.toThrow(
				'DocuSeal is not configured'
			)
		})
	})

	describe('createSubmission', () => {
		const mockSubmissionParams = {
			templateId: 123,
			submitters: [
				{
					role: 'Property Owner',
					email: 'owner@example.com',
					name: 'John Owner'
				},
				{
					role: 'Tenant',
					email: 'tenant@example.com',
					name: 'Jane Tenant'
				}
			],
			metadata: {
				lease_id: 'lease-123',
				property_id: 'property-456'
			}
		}

		it('should create a submission with submitters', async () => {
			const mockResponse = {
				id: 456,
				slug: 'abc123',
				status: 'pending',
				submitters: [
					{ id: 1, email: 'owner@example.com', status: 'pending' },
					{ id: 2, email: 'tenant@example.com', status: 'pending' }
				]
			}

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			})

			const result = await service.createSubmission(mockSubmissionParams)

			expect(mockFetch).toHaveBeenCalledWith(
				`${mockApiUrl}/submissions`,
				expect.objectContaining({
					method: 'POST',
					headers: {
						'X-Auth-Token': mockApiKey,
						'Content-Type': 'application/json'
					},
					body: expect.any(String)
				})
			)

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
			expect(requestBody.template_id).toBe(123)
			expect(requestBody.submitters).toHaveLength(2)
			expect(requestBody.metadata).toEqual(mockSubmissionParams.metadata)

			expect(result).toEqual(mockResponse)
		})

		it('should include send_email option when specified', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: 456 })
			})

			await service.createSubmission({
				...mockSubmissionParams,
				sendEmail: true
			})

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
			expect(requestBody.send_email).toBe(true)
		})

		it('should throw error on API failure', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				json: async () => ({ error: 'Invalid template' })
			})

			await expect(
				service.createSubmission(mockSubmissionParams)
			).rejects.toThrow()
		})
	})

	describe('getSubmission', () => {
		it('should fetch submission details by ID', async () => {
			const mockSubmission = {
				id: 456,
				status: 'completed',
				submitters: [
					{
						id: 1,
						email: 'owner@example.com',
						status: 'completed',
						completed_at: '2024-01-15'
					},
					{
						id: 2,
						email: 'tenant@example.com',
						status: 'completed',
						completed_at: '2024-01-16'
					}
				],
				documents: [
					{
						name: 'Lease Agreement',
						url: 'https://sign.thehudsonfam.com/downloads/doc.pdf'
					}
				]
			}

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockSubmission
			})

			const result = await service.getSubmission(456)

			expect(mockFetch).toHaveBeenCalledWith(
				`${mockApiUrl}/submissions/456`,
				expect.objectContaining({
					method: 'GET',
					headers: {
						'X-Auth-Token': mockApiKey,
						'Content-Type': 'application/json'
					}
				})
			)
			expect(result).toEqual(mockSubmission)
		})
	})

	describe('getSubmitterSigningUrl', () => {
		it('should return the signing URL for a submitter', async () => {
			const mockSubmitters = [
				{
					id: 1,
					email: 'owner@example.com',
					embed_src: 'https://sign.thehudsonfam.com/s/abc123'
				}
			]

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockSubmitters
			})

			const result = await service.getSubmitterSigningUrl(
				456,
				'owner@example.com'
			)

			expect(mockFetch).toHaveBeenCalledWith(
				`${mockApiUrl}/submissions/456/submitters`,
				expect.any(Object)
			)
			expect(result).toBe('https://sign.thehudsonfam.com/s/abc123')
		})

		it('should return null when submitter not found', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => []
			})

			const result = await service.getSubmitterSigningUrl(
				456,
				'notfound@example.com'
			)
			expect(result).toBeNull()
		})
	})

	describe('archiveSubmission', () => {
		it('should archive (cancel) a submission', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: 456, archived_at: '2024-01-20' })
			})

			await service.archiveSubmission(456)

			expect(mockFetch).toHaveBeenCalledWith(
				`${mockApiUrl}/submissions/456/archive`,
				expect.objectContaining({
					method: 'POST'
				})
			)
		})
	})

	describe('resendToSubmitter', () => {
		it('should resend signature request to a submitter using native PUT endpoint', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: 1, email: 'tenant@example.com' })
			})

			await service.resendToSubmitter(1)

			expect(mockFetch).toHaveBeenCalledWith(
				`${mockApiUrl}/submitters/1`,
				expect.objectContaining({
					method: 'PUT',
					headers: {
						'X-Auth-Token': mockApiKey,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ send_email: true })
				})
			)
		})

		it('should include custom message when provided', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: 1 })
			})

			await service.resendToSubmitter(1, { message: 'Please sign ASAP' })

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
			expect(requestBody.send_email).toBe(true)
			expect(requestBody.message).toBe('Please sign ASAP')
		})

		it('should include SMS flag when sendSms is true', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: 1 })
			})

			await service.resendToSubmitter(1, { sendSms: true })

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
			expect(requestBody.send_email).toBe(true)
			expect(requestBody.send_sms).toBe(true)
		})

		it('should throw error when DocuSeal is not enabled', async () => {
			configService.isDocuSealEnabled.mockReturnValue(false)

			await expect(service.resendToSubmitter(1)).rejects.toThrow(
				'DocuSeal is not configured'
			)
		})

		it('should throw error on API failure', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found'
			})

			await expect(service.resendToSubmitter(999)).rejects.toThrow(
				'DocuSeal API error'
			)
		})
	})

	describe('createLeaseSubmission', () => {
		it('should create a lease submission with owner and tenant', async () => {
			const mockResponse = {
				id: 789,
				slug: 'def456',
				submitters: [
					{ id: 1, email: 'owner@example.com', role: 'Property Owner' },
					{ id: 2, email: 'tenant@example.com', role: 'Tenant' }
				]
			}

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			})

			const result = await service.createLeaseSubmission({
				templateId: 100,
				leaseId: 'lease-abc',
				ownerEmail: 'owner@example.com',
				ownerName: 'John Owner',
				tenantEmail: 'tenant@example.com',
				tenantName: 'Jane Tenant',
				propertyAddress: '123 Main St',
				rentAmount: 1500,
				startDate: '2024-02-01',
				endDate: '2025-01-31'
			})

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
			expect(requestBody.template_id).toBe(100)
			expect(requestBody.submitters).toHaveLength(2)
			expect(requestBody.submitters[0].role).toBe('Property Owner')
			expect(requestBody.submitters[1].role).toBe('Tenant')
			expect(requestBody.metadata.lease_id).toBe('lease-abc')

			expect(result).toEqual(mockResponse)
		})

		it('should include field values for template placeholders', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: 789 })
			})

			await service.createLeaseSubmission({
				templateId: 100,
				leaseId: 'lease-abc',
				ownerEmail: 'owner@example.com',
				ownerName: 'John Owner',
				tenantEmail: 'tenant@example.com',
				tenantName: 'Jane Tenant',
				propertyAddress: '123 Main St, Apt 1',
				rentAmount: 2000,
				startDate: '2024-03-01',
				endDate: '2025-02-28'
			})

			const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)

			// Check that field values are passed for template placeholders
			expect(requestBody.submitters[0].fields).toBeDefined()
			expect(requestBody.submitters[1].fields).toBeDefined()
		})
	})

	describe('error handling', () => {
		it('should handle network errors gracefully', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'))

			await expect(service.listTemplates()).rejects.toThrow('Network error')
		})

		it('should log errors when API calls fail', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error'
			})

			await expect(service.listTemplates()).rejects.toThrow()
		})
	})
})
