import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { catchError, firstValueFrom, timeout } from 'rxjs'
import { AxiosError } from 'axios'

/**
 * Service for making resilient external API calls with circuit breaker pattern
 * Uses @fastify/circuit-breaker for automatic failure handling
 */
@Injectable()
export class ExternalApiService {
	private readonly logger = new Logger(ExternalApiService.name)
	private readonly defaultTimeout = 10000 // 10 seconds
	
	constructor(
		private readonly httpService: HttpService,
		private readonly configService: ConfigService
	) {}

	/**
	 * Make a resilient API call with circuit breaker protection
	 * This method should be wrapped with fastify.circuitBreaker() in controllers
	 */
	async makeResilientCall<T>(
		url: string,
		options: {
			method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
			data?: unknown
			headers?: Record<string, string>
			timeoutMs?: number
		} = {}
	): Promise<T> {
		const {
			method = 'GET',
			data,
			headers = {},
			timeoutMs = this.defaultTimeout
		} = options

		this.logger.debug(`Making ${method} request to ${url}`)

		const response = await firstValueFrom(
				this.httpService.request<T>({
					url,
					method,
					data,
					headers: {
						'Content-Type': 'application/json',
						...headers
					}
				}).pipe(
					timeout(timeoutMs),
					catchError((error: AxiosError) => {
						this.logger.error(`External API call failed: ${error.message}`, {
							url,
							method,
							status: error.response?.status,
							data: error.response?.data
						})
						throw error
					})
				)
			)

			return response.data
	}

	/**
	 * Health check for external service
	 * Used by circuit breaker to test if service is back online
	 */
	async healthCheck(serviceUrl: string): Promise<boolean> {
		try {
			await this.makeResilientCall(`${serviceUrl}/health`, {
				timeoutMs: 5000
			})
			return true
		} catch {
			return false
		}
	}

	/**
	 * Stripe API call with circuit breaker
	 */
	async callStripeApi<T>(
		endpoint: string,
		options: {
			method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
			data?: unknown
		} = {}
	): Promise<T> {
		const stripeApiKey = this.configService.get<string>('STRIPE_SECRET_KEY')
		
		return this.makeResilientCall<T>(
			`https://api.stripe.com/v1/${endpoint}`,
			{
				...options,
				headers: {
					'Authorization': `Bearer ${stripeApiKey}`,
					'Stripe-Version': '2023-10-16'
				}
			}
		)
	}

	/**
	 * Supabase API call with circuit breaker
	 */
	async callSupabaseApi<T>(
		endpoint: string,
		options: {
			method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
			data?: unknown
		} = {}
	): Promise<T> {
		const supabaseUrl = this.configService.get<string>('SUPABASE_URL')
		const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY')
		
		if (!supabaseKey) {
			throw new Error('SUPABASE_SERVICE_KEY is required for Supabase API calls')
		}
		
		return this.makeResilientCall<T>(
			`${supabaseUrl}/rest/v1/${endpoint}`,
			{
				...options,
				headers: {
					'apikey': supabaseKey,
					'Authorization': `Bearer ${supabaseKey}`
				}
			}
		)
	}

	/**
	 * Email service API call with circuit breaker
	 */
	async sendEmailViaApi(
		to: string,
		subject: string,
		html: string
	): Promise<void> {
		const resendApiKey = this.configService.get<string>('RESEND_API_KEY')
		
		await this.makeResilientCall('https://api.resend.com/emails', {
			method: 'POST',
			data: {
				from: 'TenantFlow <noreply@tenantflow.app>',
				to,
				subject,
				html
			},
			headers: {
				'Authorization': `Bearer ${resendApiKey}`
			}
		})
	}
}