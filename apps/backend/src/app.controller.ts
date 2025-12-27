import { Controller, Post, Body, Headers, Req } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import type { Request } from 'express'
import { firstValueFrom } from 'rxjs'

interface BatchQuery {
	id: string
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
	url: string
	headers?: Record<string, string>
	body?: unknown
}

interface BatchResult<T = unknown> {
	id: string
	status: number
	data?: T
	error?: string
}

@Controller()
export class AppController {
	constructor(private readonly httpService: HttpService) {}

	/**
	 * Note: Health check is handled by HealthController in health module
	 * for maximum reliability on Railway.
	 */

	/**
	 * TanStack Query batch endpoint for request deduplication
	 * Processes multiple queries in parallel to reduce network round trips
	 */
	@Post('api/batch')
	async batchQueries(
		@Body() queries: BatchQuery[],
		@Headers() headers: Record<string, string>,
		@Req() req: Request
	): Promise<BatchResult[]> {
		// Get the base URL for internal requests
		const protocol = req.protocol
		const host = req.get('host')
		const baseUrl = `${protocol}://${host}`

		// Process all queries in parallel for maximum performance
		const results = await Promise.allSettled(
			queries.map(async (query) => {
				try {
					const result = await this.processBatchQuery(query, headers, baseUrl)
					return {
						id: query.id,
						status: 200,
						data: result
					}
				} catch (error) {
					return {
						id: query.id,
						status: 500,
						error: error instanceof Error ? error.message : 'Batch query failed'
					}
				}
			})
		)

		// Convert PromiseSettledResult to BatchResult format
		return results.map((result, index) => {
			if (result.status === 'fulfilled') {
				return result.value
			} else {
				return {
					id: queries[index]?.id || 'unknown',
					status: 500,
					error: result.reason instanceof Error ? result.reason.message : 'Batch query failed'
				}
			}
		})
	}

	private async processBatchQuery(
		query: BatchQuery,
		globalHeaders: Record<string, string>,
		baseUrl: string
	): Promise<unknown> {
		// Merge global headers with query-specific headers
		const requestHeaders: Record<string, string> = {
			...globalHeaders,
			...query.headers,
			'Content-Type': 'application/json'
		}

		// Remove hop-by-hop headers that shouldn't be forwarded
		const hopByHopHeaders = ['host', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade']
		hopByHopHeaders.forEach(header => {
			delete requestHeaders[header]
		})

		// Construct full URL
		const fullUrl = query.url.startsWith('http') ? query.url : `${baseUrl}${query.url}`

		try {
			// Make internal HTTP request to the actual API endpoint
			const response = await firstValueFrom(
				this.httpService.request({
					method: query.method,
					url: fullUrl,
					headers: requestHeaders,
					data: query.body
				})
			)

			return response.data
		} catch (error: unknown) {
			// If internal request fails, return the error
			const message = error instanceof Error ? error.message : 'Unknown error'
			throw new Error(`Internal API call failed: ${message}`)
		}
	}
}
