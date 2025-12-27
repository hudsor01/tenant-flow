import { Inject, Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AppConfigService } from '../config/app-config.service'
import { AppLogger } from '../logger/app-logger.service'
import { SUPABASE_ADMIN_CLIENT, SUPABASE_ERROR_CODES } from './supabase.constants'

type PublicTableName = keyof Database['public']['Tables']

type HealthCheckResponse = {
  status: 'healthy' | 'unhealthy'
  message?: string
  method?: 'rpc' | 'table_ping'
}

@Injectable()
export class SupabaseHealthService {
  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT) private readonly adminClient: SupabaseClient<Database>,
    private readonly logger: AppLogger,
    private readonly config: AppConfigService
  ) {}

  async checkConnection(): Promise<HealthCheckResponse> {
    try {
      try {
        type HealthCheckResult = { ok?: boolean; timestamp?: string; version?: string }

        const { data, error } = await this.adminClient.rpc('health_check')
        const result = data as HealthCheckResult | null

        if (!error && result && typeof result === 'object' && !Array.isArray(result)) {
          if (result.ok === true) {
            this.logger?.debug({ fn: 'health_check', version: result.version }, 'Supabase RPC health ok')
            return { status: 'healthy', method: 'rpc' }
          }
        }

        if (error) {
          const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
          const errorStr = String(errorMessage).toLowerCase()

          if (errorStr.includes('unregistered api key') || errorStr.includes('invalid api key')) {
            this.logger?.error(
              {
                error: errorMessage,
                fn: 'health_check',
                urlPrefix: this.config.getSupabaseUrl()?.substring(0, 35),
                keyPrefix: this.config.getSupabaseSecretKey()?.substring(0, 20),
                errorCode: SUPABASE_ERROR_CODES.HEALTH_CHECK_FAILED
              },
              '[SUP-005] Invalid Supabase API key - check SB_SECRET_KEY environment variable'
            )
            return { status: 'unhealthy', message: 'Invalid API key', method: 'rpc' }
          }

          if (errorStr.includes('function') && errorStr.includes('does not exist')) {
            this.logger?.debug({ fn: 'health_check' }, 'RPC health_check function not available, using table ping fallback')
          } else {
            this.logger?.debug({ error: errorMessage, fn: 'health_check' }, 'Supabase RPC health failed; falling back to table ping')
          }
        }
      } catch (rpcErr) {
        const rpcErrMsg = rpcErr instanceof Error ? rpcErr.message : String(rpcErr)
        const errorStr = rpcErrMsg.toLowerCase()

        if (errorStr.includes('unregistered api key') || errorStr.includes('invalid api key')) {
          this.logger?.error(
            {
              error: rpcErrMsg,
              urlPrefix: this.config.getSupabaseUrl()?.substring(0, 35),
              keyPrefix: this.config.getSupabaseSecretKey()?.substring(0, 20),
              errorCode: SUPABASE_ERROR_CODES.HEALTH_CHECK_FAILED
            },
            '[SUP-005] Invalid Supabase API key - check SB_SECRET_KEY environment variable'
          )
          return { status: 'unhealthy', message: 'Invalid API key', method: 'rpc' }
        }

        if (errorStr.includes('function') && errorStr.includes('does not exist')) {
          this.logger?.debug({ fn: 'health_check' }, 'RPC health_check function not available, using table ping fallback')
        } else {
          this.logger?.debug({ fn: 'health_check', rpcErr: rpcErrMsg }, 'RPC health not available; using table ping')
        }
      }

      const table: PublicTableName = 'users'
      const { error } = await this.adminClient
        .from(table)
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

        const errorStr = String(message).toLowerCase()

        if (errorStr.includes('unregistered api key') || errorStr.includes('invalid api key')) {
          this.logger?.error(
            {
              error: JSON.stringify(error),
              table,
              errorCode: SUPABASE_ERROR_CODES.HEALTH_CHECK_FAILED,
              urlPrefix: this.config.getSupabaseUrl()?.substring(0, 35),
              keyPrefix: this.config.getSupabaseSecretKey()?.substring(0, 20)
            },
            `[${SUPABASE_ERROR_CODES.HEALTH_CHECK_FAILED}] Invalid Supabase API key - check SB_SECRET_KEY environment variable`
          )
        } else {
          this.logger?.error(
            { error: JSON.stringify(error), table, errorCode: SUPABASE_ERROR_CODES.HEALTH_CHECK_FAILED },
            `[${SUPABASE_ERROR_CODES.HEALTH_CHECK_FAILED}] Supabase table ping failed`
          )
        }
        return { status: 'unhealthy', message, method: 'table_ping' }
      }

      this.logger?.debug({ table }, 'Supabase table ping ok')
      return { status: 'healthy', method: 'table_ping' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.logger?.error(
        { error: message, errorCode: SUPABASE_ERROR_CODES.HEALTH_CHECK_FAILED },
        `[${SUPABASE_ERROR_CODES.HEALTH_CHECK_FAILED}] Supabase connectivity check threw`
      )
      return { status: 'unhealthy', message }
    }
  }
}

export type { HealthCheckResponse }
