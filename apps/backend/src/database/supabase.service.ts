import type {
  OnModuleDestroy
} from '@nestjs/common'
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common'
import type { AuthUser } from '@repo/shared/types/auth'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Request } from 'express'
import {
  SUPABASE_ADMIN_CLIENT,
  RPC_MAX_RETRIES,
  RPC_BACKOFF_MS,
  RPC_TIMEOUT_MS,
  SUPABASE_ERROR_CODES
} from './supabase.constants'
import {
  SupabaseAuthTokenResolver,
  type ResolvedSupabaseToken
} from './supabase-auth-token.resolver'
import {
  SupabaseUserClientPool,
  type SupabaseClientPoolMetrics
} from './supabase-user-client-pool'
import { AppConfigService } from '../config/app-config.service'
import { AppLogger } from '../logger/app-logger.service'

@Injectable()
export class SupabaseService implements OnModuleDestroy {
  private readonly tokenResolver: SupabaseAuthTokenResolver
  private userClientPool?: SupabaseUserClientPool

  constructor(@Inject(SUPABASE_ADMIN_CLIENT) private readonly adminClient: SupabaseClient<Database>,
    private readonly logger: AppLogger,
    private readonly config: AppConfigService
  ) {
    this.logger.debug('SupabaseService initialized with injected admin client')
    this.tokenResolver = new SupabaseAuthTokenResolver(
      this.config.getSupabaseProjectRef()
    )
  }

  getPoolMetrics(): SupabaseClientPoolMetrics {
    return this.userClientPool
      ? this.userClientPool.getMetrics()
      : { hits: 0, misses: 0, evictions: 0, totalClients: 0 }
  }
  private getUserClientPool(): SupabaseUserClientPool {
    if (!this.userClientPool) {
      const supabaseUrl = this.config.getSupabaseUrl()
      const supabasePublishableKey = this.config.getSupabasePublishableKey()

      if (!supabaseUrl || !supabasePublishableKey) {
        this.logger.error(
          `[${SUPABASE_ERROR_CODES.USER_CLIENT_UNAVAILABLE}] User client pool initialization failed`,
          {
            errorCode: SUPABASE_ERROR_CODES.USER_CLIENT_UNAVAILABLE,
            context: 'getUserClientPool',
            hasPublishableKey: !!supabasePublishableKey,
            url: (supabaseUrl || '').substring(0, 35),
            keyPrefix: supabasePublishableKey ? supabasePublishableKey.substring(0, 10) + '...' : undefined
          }
        )
        throw new InternalServerErrorException(
          `Authentication service unavailable [${SUPABASE_ERROR_CODES.USER_CLIENT_UNAVAILABLE}]`
        )
      }

      // Log initialization with masked credentials (prefix only)
      this.logger.debug('Initializing user client pool', {
        url: supabaseUrl.substring(0, 35),
        keyPrefix: supabasePublishableKey.substring(0, 20)
      })

      this.userClientPool = new SupabaseUserClientPool({
        supabaseUrl,
        supabasePublishableKey,
        logger: this.logger
      })
    }

    return this.userClientPool
  }

  /**
   * Cleanup method for graceful shutdown
   * Call this in OnModuleDestroy lifecycle hook
   */
  onModuleDestroy(): void {
    this.userClientPool?.close()
    this.logger.debug('SupabaseService cleanup complete')
  }

  getAdminClient(): SupabaseClient<Database> {
    if (!this.adminClient) {
      this.logger.error(
        `[${SUPABASE_ERROR_CODES.ADMIN_CLIENT_UNAVAILABLE}] Supabase admin client not initialized`,
        {
          errorCode: SUPABASE_ERROR_CODES.ADMIN_CLIENT_UNAVAILABLE,
          context: 'getAdminClient'
        }
      )
      throw new InternalServerErrorException(
        `Database service unavailable [${SUPABASE_ERROR_CODES.ADMIN_CLIENT_UNAVAILABLE}]`
      )
    }

    return this.adminClient
  }

  /**
   * Call a Supabase RPC with retries and exponential backoff for transient failures.
   * Returns the raw result { data, error, attempts } or throws if unrecoverable.
   */
  async rpcWithRetries(
    fn: string,
    args: Record<string, unknown>,
    maxAttempts = RPC_MAX_RETRIES,
    backoffMs = RPC_BACKOFF_MS,
    timeoutMs = RPC_TIMEOUT_MS
  ) {
    const client = this.adminClient
    let lastErr: unknown = null
    let attemptCount = 0

    function isTransientMessage(msg: string | undefined): boolean {
      if (!msg) return false
      const m = msg.toLowerCase()
      // Common transient indicators: network issues, timeouts, rate limits, service unavailable
      // Also includes connection errors: ECONNRESET, ECONNREFUSED, ETIMEDOUT
      return (
        m.includes('network') ||
        m.includes('timeout') ||
        m.includes('temporar') ||
        m.includes('unavailable') ||
        m.includes('try again') ||
        m.includes('rate limit') ||
        m.includes('429') ||
        m.includes('503') ||
        m.includes('econnreset') ||
        m.includes('econnrefused') ||
        m.includes('etimedout') ||
        m.includes('connection reset')
      )
    }

    for (let i = 0; i < maxAttempts; i++) {
      attemptCount = i + 1
      // Create an AbortController for per-attempt timeout
      const ac = new AbortController()
      let timer: NodeJS.Timeout | undefined
      if (typeof timeoutMs === 'number' && timeoutMs > 0) {
        timer = setTimeout(() => ac.abort(), timeoutMs)
      }

      try {
        // `client.rpc` has a union type for known RPC names; cast for dynamic calls
        // and attach an abort signal for the attempt so long-running RPCs time out.
        type RpcResult = {
          data: unknown
          error?: { message?: string } | null
        }
        type RpcBuilder = {
          abortSignal?: (signal: AbortSignal) => Promise<RpcResult>
        } & Promise<RpcResult>
        type DynamicRpcClient = {
          rpc: (name: string, args: Record<string, unknown>) => RpcBuilder
        }
        const rpcBuilder = (client as unknown as DynamicRpcClient).rpc(fn, args)
        // Some versions of the SDK return a builder with `.abortSignal` support.
        const result = rpcBuilder?.abortSignal
          ? await rpcBuilder.abortSignal(ac.signal)
          : await rpcBuilder

        if (timer) clearTimeout(timer)

        // If the RPC returned an error object, determine if it's transient.
        const maybeErrorMsg =
          result.error?.message ??
          (result.error ? String(result.error) : undefined)
        if (result.error) {
          // Log transient RPC errors at debug level to avoid noisy WARN logs for
          // retries; callers should decide whether to warn on final failure.
          this.logger.debug(
            `Supabase RPC returned error for ${fn}: ${maybeErrorMsg}`
          )
          if (isTransientMessage(maybeErrorMsg)) {
            // transient - retry with backoff
            lastErr = result.error
            const delay = backoffMs * Math.pow(2, i)
            const jitter = Math.floor(Math.random() * Math.min(1000, delay))
            await new Promise(r => setTimeout(r, delay + jitter))
            continue
          }
          // Non-transient - return immediately with attempt count
          return { ...result, attempts: attemptCount }
        }

        // Success - return with attempt count
        return { ...result, attempts: attemptCount }
      } catch (errUnknown) {
        if (timer) clearTimeout(timer)
        lastErr = errUnknown
        const msg =
          errUnknown instanceof Error ? errUnknown.message : String(errUnknown)
        this.logger.debug(
          `Supabase RPC attempt ${attemptCount} failed for ${fn}: ${msg}`
        )

        // If this looks transient (abort, network errors, connection resets), retry
        const candidate = errUnknown as unknown
        const nameProp =
          typeof candidate === 'object' && candidate !== null
            ? (candidate as Record<string, unknown>)['name']
            : undefined
        const isAbort = nameProp === 'AbortError'
        if (isAbort || isTransientMessage(msg)) {
          const delay = backoffMs * Math.pow(2, i)
          const jitter = Math.floor(Math.random() * Math.min(1000, delay))
          await new Promise(r => setTimeout(r, delay + jitter))
          continue
        }

        // Non-transient thrown error - fail immediately per Requirement 7.4
        break
      }
    }

    const finalMessage =
      lastErr instanceof Error
        ? lastErr.message
        : String(lastErr ?? 'Unknown error')
    return { data: null, error: { message: finalMessage }, attempts: attemptCount }
  }

  /**
   * Get user-scoped Supabase client with connection pooling
   * Uses LRU cache to reuse clients for the same token (30-40% memory reduction)
   *
   * Performance:
   * - Cache hit: ~0.1ms (instant return)
   * - Cache miss: ~2-5ms (client initialization)
   *
   * @param userToken JWT access token from user request
   * @returns User-scoped Supabase client with RLS enabled
   */
  getUserClient(userToken: string): SupabaseClient<Database> {
    return this.getUserClientPool().getClient(userToken)
  }

  /**
   * Extract JWT token from Express request
   * Standardized to Authorization header only (per security guidelines)
   */
  getTokenFromRequest(request: Request): string | null {
    const authHeader = request.headers?.authorization
    if (authHeader && typeof authHeader === 'string') {
      const match = authHeader.match(/^Bearer\s+(.+)$/i)
      if (match?.[1]) {
        return match[1]
      }
    }
    return null
  }

  /**
   * Get authenticated user from request
   * Uses Supabase's native auth.getUser() method as per official docs
   * Supports both Authorization header (Bearer token) and SSR cookies
   */
  async getUser(req: Request): Promise<AuthUser | null> {
    const startTime = Date.now()
    try {
      // Request-level cache to avoid duplicate Supabase lookups per request
      const reqWithCache = req as Request & { authUserCache?: AuthUser | null }
      if (typeof reqWithCache.authUserCache !== 'undefined') {
        return reqWithCache.authUserCache
      }
      // Check if user was already attached by JwtAuthGuard
      const guardUser = (req as unknown as { user?: AuthUser }).user
      if (guardUser) {
        reqWithCache.authUserCache = guardUser
        return guardUser
      }

      const tokenDetails: ResolvedSupabaseToken = this.tokenResolver.resolve(req)
      const token = tokenDetails.token

      if (!token) {
        this.logger.warn('No auth token found in request', {
          endpoint: req.path,
          hasAuthHeader: tokenDetails.authHeaderPresent,
          expectedCookieName: tokenDetails.expectedCookieName,
          headers: {
            origin: req.headers.origin,
            referer: req.headers.referer
          }
        })
        return null
      }

      this.logger.debug('Authentication token resolved', {
        endpoint: req.path,
        method: req.method,
        source: tokenDetails.source,
        cookieKeys: tokenDetails.cookieKeys
      })

      // Use Supabase's native auth.getUser() with the token
      // This sends a request to Supabase Auth server to validate the token
      const {
        data: { user },
        error
      } = await this.adminClient.auth.getUser(token)

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
        user_id: user.id,
        endpoint: req.path,
        duration: `${duration}ms`
      })

      // Cache on request for subsequent consumers in the same request lifecycle
      reqWithCache.authUserCache = user

      // Return the Supabase User directly
      return user
    } catch (error) {
      const duration = Date.now() - startTime
      this.logger.error('Error in getUser()', {
        error: error instanceof Error ? error.message : String(error),
        stack:
          error instanceof Error
            ? error.stack?.split('\n').slice(0, 3).join('\n')
            : undefined,
        endpoint: req.path,
        duration: `${duration}ms`
      })
      return null
    }
  }

  async checkConnection(): Promise<{
    status: 'healthy' | 'unhealthy'
    message?: string
    method?: 'rpc' | 'table_ping'
  }> {
    try {
      const fn = 'health_check' // Hardcoded health check function name
      try {
        // RPC returns single JSONB object: {ok: true, timestamp: ..., version: ...}
        type HealthCheckResult = { ok?: boolean; timestamp?: string; version?: string }
        type RpcResult = { data: HealthCheckResult | null; error: unknown }

        const result = (await this.adminClient.rpc(fn)) as unknown as RpcResult
        const { data, error } = result

        if (!error && data && typeof data === 'object' && !Array.isArray(data)) {
          const healthData = data as HealthCheckResult
          if (healthData.ok === true) {
            this.logger?.debug({ fn, version: healthData.version }, 'Supabase RPC health ok')
            return { status: 'healthy', method: 'rpc' }
          }
        }

        if (error) {
          const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
          // Check if error is "function does not exist" - this is expected and not an error
          const errorStr = String(errorMessage).toLowerCase()

          // Check for API key errors
          if (errorStr.includes('unregistered api key') || errorStr.includes('invalid api key')) {
            this.logger?.error(
              {
                error: errorMessage,
                fn,
                urlPrefix: this.config.getSupabaseUrl()?.substring(0, 35),
                keyPrefix: this.config.getSupabaseSecretKey()?.substring(0, 20),
                errorCode: SUPABASE_ERROR_CODES.HEALTH_CHECK_FAILED
              },
              '[SUP-005] Invalid Supabase API key - check SB_SECRET_KEY environment variable'
            )
            return { status: 'unhealthy', message: 'Invalid API key', method: 'rpc' }
          }

          if (errorStr.includes('function') && errorStr.includes('does not exist')) {
            this.logger?.debug({ fn }, 'RPC health_check function not available, using table ping fallback')
          } else {
            this.logger?.debug({ error: errorMessage, fn }, 'Supabase RPC health failed; falling back to table ping')
          }
        }
      } catch (rpcErr) {
        // RPC not available; continue to table ping
        const rpcErrMsg = rpcErr instanceof Error ? rpcErr.message : String(rpcErr)
        const errorStr = rpcErrMsg.toLowerCase()

        // Check for API key errors
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

        // Only log at DEBUG level - missing RPC is not an error
        if (errorStr.includes('function') && errorStr.includes('does not exist')) {
          this.logger?.debug({ fn }, 'RPC health_check function not available, using table ping fallback')
        } else {
          this.logger?.debug({ fn, rpcErr: rpcErrMsg }, 'RPC health not available; using table ping')
        }
      }

      // Connectivity check: lightweight HEAD count on a canonical table.
      const table = 'users' // Use users table for health check
      type SelectResult = {
        error: unknown
      }
      const { error } = (await this.adminClient
        .from(table)
        .select('*', { count: 'exact', head: true })) as unknown as SelectResult

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

        // Check for API key errors
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