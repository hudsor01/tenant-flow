import {
    Injectable,
    InternalServerErrorException,
    Logger,
    OnModuleInit
} from '@nestjs/common'
import type { authUser, Database } from '@repo/shared'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Request } from 'express'

@Injectable()
export class SupabaseService implements OnModuleInit {
	private adminClient!: SupabaseClient<Database>
	private readonly logger = new Logger(SupabaseService.name)

	constructor() {
		// Constructor should be lightweight - move client creation to onModuleInit
		this.logger.log('SupabaseService constructor called')
	}

	onModuleInit() {
		const supabaseUrl = process.env.SUPABASE_URL
		// Standard service key with platform compatibility validation
		const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

		// Validate expected aliases exist to prevent deployment issues
		if (!supabaseServiceKey && process.env.SERVICE_ROLE_KEY) {
			throw new Error(
				'SERVICE_ROLE_KEY found but SUPABASE_SERVICE_ROLE_KEY is required - update environment configuration'
			)
		}
		if (!supabaseServiceKey && process.env.SUPABASE_SERVICE_KEY) {
			throw new Error(
				'SUPABASE_SERVICE_KEY found but SUPABASE_SERVICE_ROLE_KEY is required - update environment configuration'
			)
		}

		if (!supabaseUrl || !supabaseServiceKey) {
			this.logger.error(
				'Missing Supabase configuration. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set (via Doppler).',
				{
					issue: 'missing_supabase_env',
					hasSupabaseUrl: !!supabaseUrl,
					hasServiceKey: !!supabaseServiceKey,
					env: process.env.NODE_ENV
				}
			)
			throw new InternalServerErrorException(
				'Database service unavailable [SUP-001]'
			)
		}

		this.logger.log('Creating Supabase client', {
			supabaseUrl,
			hasServiceKey: !!supabaseServiceKey,
			keyLength: supabaseServiceKey?.length
		})

		this.adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false
			}
		})

		try {
			const urlHost = new URL(supabaseUrl).host
			this.logger.log('Supabase service initialized', { supabaseHost: urlHost })
		} catch {
			this.logger.log('Supabase service initialized')
		}
	}

	getAdminClient(): SupabaseClient<Database> {
		return this.adminClient
	}

	getUserClient(userToken: string): SupabaseClient<Database> {
		const supabaseUrl = process.env.SUPABASE_URL
		const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

		if (!supabaseUrl || !supabaseAnonKey) {
			throw new InternalServerErrorException(
				'Authentication service unavailable [SUP-002]'
			)
		}

		return createClient<Database>(supabaseUrl, supabaseAnonKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false
			},
			global: {
				headers: {
					Authorization: `Bearer ${userToken}`
				}
			}
		})
	}

	/**
	 * Get authenticated user from request
	 * Uses Supabase's native auth.getUser() method as per official docs
	 * Supports both Authorization header (Bearer token) and SSR cookies
	 */
	async getUser(req: Request): Promise<authUser | null> {
		const startTime = Date.now()
		try {
			let token: string | undefined

			// First check Authorization header (standard pattern for APIs)
			const authHeader = req.headers.authorization
			if (authHeader?.startsWith('Bearer ')) {
				token = authHeader.replace('Bearer ', '')
				this.logger.log('Using token from Authorization header', {
					endpoint: req.path,
					method: req.method
				})
			}

			// Fallback to cookie if no Authorization header (SSR pattern)
			if (!token) {
				const cookieName = `sb-${process.env.SUPABASE_PROJECT_REF || 'bshjmbshupiibfiewpxb'}-auth-token`
				token = req.cookies?.[cookieName] as string | undefined

				if (token) {
					this.logger.log('Using token from SSR cookie', {
						endpoint: req.path,
						method: req.method,
						cookieName
					})
				}
			}

			if (!token) {
				this.logger.warn('No auth token found in request', {
					endpoint: req.path,
					hasAuthHeader: !!authHeader,
					availableCookies: Object.keys(req.cookies || {}),
					headers: {
						origin: req.headers.origin,
						referer: req.headers.referer
					}
				})
				return null
			}

			// Use Supabase's native auth.getUser() with the token
			// This sends a request to Supabase Auth server to validate the token
			const { data: { user }, error } = await this.adminClient.auth.getUser(token)

			if (error || !user) {
				this.logger.warn('Token validation failed via auth.getUser()', {
					error: error?.message,
					errorCode: error?.code,
					endpoint: req.path,
					tokenLength: token?.length
				})
				return null
			}

			const duration = Date.now() - startTime
			this.logger.log('User authenticated successfully', {
				userId: user.id,
				email: user.email,
				endpoint: req.path,
				duration: `${duration}ms`
			})

			// Return the Supabase User directly
			return user
		} catch (error) {
			const duration = Date.now() - startTime
			this.logger.error('Error in getUser()', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined,
				endpoint: req.path,
				duration: `${duration}ms`
			})
			return null
		}
	}

	async checkConnection(): Promise<{
		status: 'healthy' | 'unhealthy'
		message?: string
	}> {
		try {
			// Prefer a lightweight RPC if available; fall back to HEAD on a known table.
			// Using health_check function with SECURITY DEFINER for consistent permissions
			const fn = 'health_check' // Hardcoded health check function name
			try {
				// Attempt RPC call (must exist in DB). Returns ok=true when reachable.
				const result = await this.adminClient.rpc(fn as never)
				const { data, error } = result
				if (!error && data && typeof data === 'object') {
					const dataArray = data as unknown[]
					if (Array.isArray(dataArray) && dataArray.length > 0) {
						const ok = (dataArray[0] as { ok?: boolean })?.ok ?? true
						if (ok) {
							this.logger?.debug({ fn }, 'Supabase RPC health ok')
							return { status: 'healthy' }
						}
					}
				}
				if (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error)
					this.logger?.warn(
						{ error: errorMessage, fn },
						'Supabase RPC health failed; falling back to table ping'
					)
				}
			} catch (rpcErr) {
				// RPC not available; continue to table ping
				this.logger?.debug(
					{
						fn,
						rpcErr: rpcErr instanceof Error ? rpcErr.message : String(rpcErr)
					},
					'RPC health not available; using table ping'
				)
			}

			// Connectivity check: lightweight HEAD count on a canonical table.
			const table = 'users' // Use users table for health check
			const { error } = await this.adminClient
				.from(table as never)
				.select('*', { count: 'exact', head: true })

			if (error) {
				interface SupabaseError {
					message?: string
					details?: string
					hint?: string
					code?: string
				}
				const message =
					error instanceof Error
						? error.message
						: (error as SupabaseError)?.message ||
							(error as SupabaseError)?.details ||
							(error as SupabaseError)?.hint ||
							(error as SupabaseError)?.code ||
							JSON.stringify(error)
				this.logger?.error({ error, table }, 'Supabase table ping failed')
				return { status: 'unhealthy', message }
			}

			this.logger?.debug({ table }, 'Supabase table ping ok')
			return { status: 'healthy' }
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error'
			this.logger?.error(
				{ error: message },
				'Supabase connectivity check threw'
			)
			return { status: 'unhealthy', message }
		}
	}
}
