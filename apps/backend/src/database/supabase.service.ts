import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import type { Database } from '@repo/shared'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService {
	private adminClient: SupabaseClient<Database>
	private readonly logger = new Logger(SupabaseService.name)

	constructor() {
    const supabaseUrl = process.env.SUPABASE_URL
    // Accept common aliases to avoid env name drift in platforms
    const supabaseServiceKey =
      process.env.SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY

		if (!supabaseUrl || !supabaseServiceKey) {
			this.logger.error(
				'Missing Supabase configuration. Ensure SUPABASE_URL and SERVICE_ROLE_KEY are set (via Doppler).',
				{
					issue: 'missing_supabase_env',
					hasSupabaseUrl: !!supabaseUrl,
					hasServiceKey: !!supabaseServiceKey,
					env: process.env.NODE_ENV
				}
			)
			throw new InternalServerErrorException(
				'Supabase configuration is missing'
			)
		}

		this.logger.log(
			'Creating Supabase client',
			{
				supabaseUrl,
				hasServiceKey: !!supabaseServiceKey,
				keyLength: supabaseServiceKey?.length
			}
		)

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
				'Supabase configuration is missing for user client'
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

  async checkConnection(): Promise<{
    status: 'healthy' | 'unhealthy'
    message?: string
  }> {
    try {
      // Prefer a lightweight RPC if available; fall back to HEAD on a known table.
      // Using health_check function with SECURITY DEFINER for consistent permissions
      const fn = process.env.HEALTH_CHECK_FUNCTION || 'health_check'
      try {
        // Attempt RPC call (must exist in DB). Returns ok=true when reachable.
        const { data, error } = await this.adminClient.rpc(fn as any)
        if (!error && Array.isArray(data)) {
          const ok = data[0]?.ok ?? true
          if (ok) {
            this.logger?.debug({ fn }, 'Supabase RPC health ok')
            return { status: 'healthy' }
          }
        }
        if (error) {
          this.logger?.warn({ error: error.message, fn }, 'Supabase RPC health failed; falling back to table ping')
        }
      } catch (rpcErr) {
        // RPC not available; continue to table ping
        this.logger?.debug({ fn, rpcErr: rpcErr instanceof Error ? rpcErr.message : String(rpcErr) }, 'RPC health not available; using table ping')
      }

      // Connectivity check: lightweight HEAD count on a canonical table.
      const table = process.env.HEALTH_CHECK_TABLE || 'User'
      const { error } = await this.adminClient
        .from(table as never)
        .select('*', { count: 'exact', head: true })

      if (error) {
        const message =
          (error as any)?.message || (error as any)?.details || (error as any)?.hint || (error as any)?.code || JSON.stringify(error)
        this.logger?.error({ error, table }, 'Supabase table ping failed')
        return { status: 'unhealthy', message }
      }

      this.logger?.debug({ table }, 'Supabase table ping ok')
      return { status: 'healthy' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.logger?.error({ error: message }, 'Supabase connectivity check threw')
      return { status: 'unhealthy', message }
    }
  }
}
