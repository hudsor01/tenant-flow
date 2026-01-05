import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { HttpService } from '@nestjs/axios'
import type { AxiosResponse } from 'axios'
import type { Request } from 'express'
import { of, throwError } from 'rxjs'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { SilentLogger } from './__tests__/silent-logger'
import { AppLogger } from './logger/app-logger.service'

// Mock the AppService
jest.mock('./app.service', () => {
	return {
		AppService: jest.fn().mockImplementation(() => ({
			getHello: jest.fn()
		}))
	}
})

// Mock HttpService
const mockHttpService = {
	request: jest.fn()
}

describe('AppController', () => {
	let controller: AppController
	let httpService: HttpService

	beforeEach(async () => {
		// Clear all mocks before each test
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [AppController],
			providers: [
				AppService,
				{
					provide: HttpService,
					useValue: mockHttpService
				}
			]
		}).compile()

		controller = module.get<AppController>(AppController)
		httpService = module.get<HttpService>(HttpService)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('batchQueries', () => {
		const mockReq = {
			protocol: 'http',
			get: jest.fn().mockReturnValue('localhost:3000')
		} as Pick<Request, 'protocol' | 'get'>

		const mockHeaders = {
			authorization: 'Bearer token123',
			'content-type': 'application/json'
		}

		it('should process multiple queries successfully', async () => {
			const queries = [
				{
					id: 'query1',
					method: 'GET' as const,
					url: '/api/properties',
					headers: { 'custom-header': 'value1' }
				},
				{
					id: 'query2',
					method: 'GET' as const,
					url: '/api/tenants',
					headers: { 'custom-header': 'value2' }
				}
			]

			const mockResponse1: AxiosResponse = {
				data: { properties: [{ id: '1', name: 'Property 1' }] },
				status: 200,
				statusText: 'OK',
				headers: {},
				config: {} as AxiosResponse['config']
			}

			const mockResponse2: AxiosResponse = {
				data: { tenants: [{ id: '1', name: 'Tenant 1' }] },
				status: 200,
				statusText: 'OK',
				headers: {},
				config: {} as AxiosResponse['config']
			}

			mockHttpService.request
				.mockReturnValueOnce(of(mockResponse1))
				.mockReturnValueOnce(of(mockResponse2))

			const result = await controller.batchQueries(
				queries,
				mockHeaders,
				mockReq as Request
			)

			expect(result).toHaveLength(2)
			expect(result[0]).toEqual({
				id: 'query1',
				status: 200,
				data: { properties: [{ id: '1', name: 'Property 1' }] }
			})
			expect(result[1]).toEqual({
				id: 'query2',
				status: 200,
				data: { tenants: [{ id: '1', name: 'Tenant 1' }] }
			})

			expect(mockHttpService.request).toHaveBeenCalledTimes(2)
		})

		it('should handle query errors gracefully', async () => {
			const queries = [
				{
					id: 'query1',
					method: 'GET' as const,
					url: '/api/properties'
				},
				{
					id: 'query2',
					method: 'GET' as const,
					url: '/api/invalid-endpoint'
				}
			]

			const mockResponse1: AxiosResponse = {
				data: { properties: [{ id: '1', name: 'Property 1' }] },
				status: 200,
				statusText: 'OK',
				headers: {},
				config: {} as AxiosResponse['config']
			}

			mockHttpService.request
				.mockReturnValueOnce(of(mockResponse1))
				.mockReturnValueOnce(throwError(() => new Error('Endpoint not found')))

			const result = await controller.batchQueries(
				queries,
				mockHeaders,
				mockReq as Request
			)

			expect(result).toHaveLength(2)
			expect(result[0]).toEqual({
				id: 'query1',
				status: 200,
				data: { properties: [{ id: '1', name: 'Property 1' }] }
			})
			expect(result[1]).toEqual({
				id: 'query2',
				status: 500,
				error: 'Internal API call failed: Endpoint not found'
			})
		})

		it('should handle empty query array', async () => {
			const result = await controller.batchQueries(
				[],
				mockHeaders,
				mockReq as Request
			)

			expect(result).toEqual([])
			expect(mockHttpService.request).not.toHaveBeenCalled()
		})

		it('should merge global and query-specific headers correctly', async () => {
			const queries = [
				{
					id: 'query1',
					method: 'GET' as const,
					url: '/api/properties',
					headers: { 'x-custom': 'custom-value' }
				}
			]

			const mockResponse: AxiosResponse = {
				data: { properties: [] },
				status: 200,
				statusText: 'OK',
				headers: {},
				config: {} as AxiosResponse['config']
			}

			mockHttpService.request.mockReturnValue(of(mockResponse))

			await controller.batchQueries(queries, mockHeaders, mockReq as Request)

			expect(mockHttpService.request).toHaveBeenCalledWith({
				method: 'GET',
				url: 'http://localhost:3000/api/properties',
				headers: expect.objectContaining({
					authorization: 'Bearer token123',
					'content-type': 'application/json',
					'x-custom': 'custom-value'
				}),
				data: undefined
			})
		})

		it('should filter out hop-by-hop headers', async () => {
			const queries = [
				{
					id: 'query1',
					method: 'GET' as const,
					url: '/api/properties'
				}
			]

			const headersWithHopByHop = {
				...mockHeaders,
				connection: 'keep-alive',
				host: 'example.com',
				upgrade: 'websocket'
			}

			const mockResponse: AxiosResponse = {
				data: { properties: [] },
				status: 200,
				statusText: 'OK',
				headers: {},
				config: {} as AxiosResponse['config']
			}

			mockHttpService.request.mockReturnValue(of(mockResponse))

			await controller.batchQueries(
				queries,
				headersWithHopByHop,
				mockReq as Request
			)

			const calledHeaders = mockHttpService.request.mock.calls[0][0].headers
			expect(calledHeaders).not.toHaveProperty('connection')
			expect(calledHeaders).not.toHaveProperty('host')
			expect(calledHeaders).not.toHaveProperty('upgrade')
			expect(calledHeaders).toHaveProperty('authorization')
		})

		it('should handle POST requests with body', async () => {
			const queries = [
				{
					id: 'query1',
					method: 'POST' as const,
					url: '/api/properties',
					body: { name: 'New Property', address: '123 Main St' }
				}
			]

			const mockResponse: AxiosResponse = {
				data: { id: '1', name: 'New Property' },
				status: 201,
				statusText: 'Created',
				headers: {},
				config: {} as AxiosResponse['config']
			}

			mockHttpService.request.mockReturnValue(of(mockResponse))

			const result = await controller.batchQueries(
				queries,
				mockHeaders,
				mockReq as Request
			)

			expect(result[0]).toEqual({
				id: 'query1',
				status: 200,
				data: { id: '1', name: 'New Property' }
			})

			expect(mockHttpService.request).toHaveBeenCalledWith({
				method: 'POST',
				url: 'http://localhost:3000/api/properties',
				headers: expect.any(Object),
				data: { name: 'New Property', address: '123 Main St' }
			})
		})

		it('should handle absolute URLs', async () => {
			const queries = [
				{
					id: 'query1',
					method: 'GET' as const,
					url: 'https://api.example.com/external-data'
				}
			]

			const mockResponse: AxiosResponse = {
				data: { external: 'data' },
				status: 200,
				statusText: 'OK',
				headers: {},
				config: {} as AxiosResponse['config']
			}

			mockHttpService.request.mockReturnValue(of(mockResponse))

			await controller.batchQueries(queries, mockHeaders, mockReq as Request)

			expect(mockHttpService.request).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://api.example.com/external-data',
				headers: expect.any(Object),
				data: undefined
			})
		})
	})
})
