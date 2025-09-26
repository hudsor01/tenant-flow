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
	 * Validates a user by reading the Supabase auth cookie and verifying it
	 * Modern 2025 pattern using Supabase SSR cookies instead of JWT headers
	 */
	async validateUser(req: Request): Promise<authUser | null> {
		try {
			// Extract Supabase auth cookie (format: sb-{project-ref}-auth-token)
			const cookieName = `sb-${process.env.SUPABASE_PROJECT_REF || 'bshjmbshupiibfiewpxb'}-auth-token`
			const authCookie = req.cookies?.[cookieName] as string | undefined

			if (!authCookie) {
				this.logger.debug('No Supabase auth cookie found')
				return null
			}

			// Validate the token using admin client
			const { data: { user: supabaseUser }, error } = await this.adminClient.auth.getUser(authCookie)

			if (error || !supabaseUser?.id) {
				this.logger.debug('Invalid Supabase auth token', { error: error?.message })
				return null
			}

			// Query our User table to get the complete user record
			const { data: dbUser, error: dbError } = await this.adminClient
				.from('User')
				.select('*')
				.eq('supabaseId', supabaseUser.id)
				.single()

			if (dbError || !dbUser) {
				this.logger.debug('User not found in database', {
					supabaseId: supabaseUser.id,
					error: dbError?.message
				})
				return null
			}

			// Map database user to authUser format
			const authUser: authUser = {
				id: dbUser.id,
				email: dbUser.email,
				name: dbUser.name,
				phone: dbUser.phone,
				bio: dbUser.bio,
				avatarUrl: dbUser.avatarUrl,
				role: dbUser.role,
				createdAt: new Date(dbUser.createdAt),
				updatedAt: new Date(dbUser.updatedAt),
				emailVerified: !!supabaseUser.email_confirmed_at,
				supabaseId: dbUser.supabaseId,
				stripeCustomerId: dbUser.stripeCustomerId,
				organizationId: null // Organization feature not implemented yet
			}

			return authUser
		} catch (error) {
			this.logger.error('Error validating user', {
				error: error instanceof Error ? error.message : String(error)
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
