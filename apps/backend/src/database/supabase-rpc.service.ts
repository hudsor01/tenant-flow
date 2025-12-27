import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  RPC_BACKOFF_MS,
  RPC_MAX_RETRIES,
  RPC_TIMEOUT_MS
} from './supabase.constants'
import { AppLogger } from '../logger/app-logger.service'
import { SupabaseCacheService, type CacheTier } from './supabase-cache.service'
import { SupabaseInstrumentationService } from './supabase-instrumentation.service'

type RpcFunctionName = keyof Database['public']['Functions']
type RpcFunctionArgs<T extends RpcFunctionName> = Database['public']['Functions'][T]['Args']

type RpcAttemptResult<T> = {
  data: T | null
  error: { message?: string } | null | undefined
  attempts: number
}

type RpcCacheOptions = {
  cache?: boolean
  cacheKey?: string
  cacheTier?: CacheTier
  cacheTtlMs?: number
  client?: SupabaseClient<Database>
  source?: 'admin' | 'user' | 'service'
}

type RpcBuilder<T> = Promise<{ data: T | null; error?: { message?: string } | null }> & {
  abortSignal?: (signal: AbortSignal) => Promise<{ data: T | null; error?: { message?: string } | null }>
}

@Injectable()
export class SupabaseRpcService {
  constructor(
    private readonly logger: AppLogger,
    private readonly cacheService: SupabaseCacheService,
    private readonly instrumentation: SupabaseInstrumentationService
  ) {}

  async rpcWithRetries<T extends RpcFunctionName>(
    client: SupabaseClient<Database>,
    fn: T,
    args: RpcFunctionArgs<T>,
    maxAttempts?: number,
    backoffMs?: number,
    timeoutMs?: number,
    options?: RpcCacheOptions
  ): Promise<RpcAttemptResult<Database['public']['Functions'][T]['Returns']>>
  async rpcWithRetries(
    client: SupabaseClient<Database>,
    fn: string,
    args: Record<string, unknown>,
    maxAttempts?: number,
    backoffMs?: number,
    timeoutMs?: number,
    options?: RpcCacheOptions
  ): Promise<RpcAttemptResult<unknown>>
  async rpcWithRetries(
    client: SupabaseClient<Database>,
    fn: string,
    args: Record<string, unknown>,
    maxAttempts = RPC_MAX_RETRIES,
    backoffMs = RPC_BACKOFF_MS,
    timeoutMs = RPC_TIMEOUT_MS,
    options?: RpcCacheOptions
  ): Promise<RpcAttemptResult<unknown>> {
    const cacheEnabled = !!options?.cache && this.cacheService.isEnabled()
    const cacheKey = cacheEnabled
      ? this.cacheService.buildRpcCacheKey(fn, args, options?.cacheKey)
      : null
    const startTime = Date.now()
    let lastErr: unknown = null
    let attemptCount = 0

    if (cacheEnabled && cacheKey) {
      const cached = await this.cacheService.get<unknown>(cacheKey)
      if (cached !== null) {
        this.instrumentation.recordRpcCacheHit(fn)
        this.instrumentation.recordRpcCall(fn, 0, 'cache')
        return { data: cached, error: null, attempts: 0 }
      }
      this.instrumentation.recordRpcCacheMiss(fn)
    }

    const isTransientMessage = (msg: string | undefined): boolean => {
      if (!msg) return false
      const m = msg.toLowerCase()
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
      const ac = new AbortController()
      let timer: NodeJS.Timeout | undefined
      if (typeof timeoutMs === 'number' && timeoutMs > 0) {
        timer = setTimeout(() => ac.abort(), timeoutMs)
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rpcBuilder = client.rpc(fn as any, args as any) as unknown as RpcBuilder<unknown>
        const result = rpcBuilder?.abortSignal
          ? await rpcBuilder.abortSignal(ac.signal)
          : await rpcBuilder

        if (timer) clearTimeout(timer)

        const maybeErrorMsg =
          result.error?.message ??
          (result.error ? String(result.error) : undefined)
        if (result.error) {
          this.logger.debug(
            `Supabase RPC returned error for ${fn}: ${maybeErrorMsg}`
          )
          if (isTransientMessage(maybeErrorMsg)) {
            lastErr = result.error
            const delay = backoffMs * Math.pow(2, i)
            const jitter = Math.floor(Math.random() * Math.min(1000, delay))
            await new Promise(r => setTimeout(r, delay + jitter))
            continue
          }
          this.instrumentation.trackQuery('rpc', fn)
          this.instrumentation.recordRpcCall(fn, Date.now() - startTime, 'error')
          return { data: result.data ?? null, error: result.error ?? null, attempts: attemptCount }
        }

        this.instrumentation.trackQuery('rpc', fn)
        this.instrumentation.recordRpcCall(fn, Date.now() - startTime, 'success')
        if (cacheEnabled && cacheKey && result.data !== null && result.error === null) {
          const cacheOptions =
            options?.cacheTier || typeof options?.cacheTtlMs === 'number'
              ? {
                  ...(options?.cacheTier ? { tier: options.cacheTier } : {}),
                  ...(typeof options?.cacheTtlMs === 'number'
                    ? { ttlMs: options.cacheTtlMs }
                    : {})
                }
              : undefined
          await this.cacheService.set(cacheKey, result.data, cacheOptions)
        }
        return { data: result.data ?? null, error: result.error ?? null, attempts: attemptCount }
      } catch (errUnknown) {
        if (timer) clearTimeout(timer)
        lastErr = errUnknown
        const msg =
          errUnknown instanceof Error ? errUnknown.message : String(errUnknown)
        this.logger.debug(
          `Supabase RPC attempt ${attemptCount} failed for ${fn}: ${msg}`
        )

        const isAbort =
          typeof errUnknown === 'object' &&
          errUnknown !== null &&
          'name' in errUnknown &&
          (errUnknown as { name?: string }).name === 'AbortError'

        if (isAbort || isTransientMessage(msg)) {
          const delay = backoffMs * Math.pow(2, i)
          const jitter = Math.floor(Math.random() * Math.min(1000, delay))
          await new Promise(r => setTimeout(r, delay + jitter))
          continue
        }

        break
      }
    }

    const finalMessage =
      lastErr instanceof Error
        ? lastErr.message
        : String(lastErr ?? 'Unknown error')
    this.instrumentation.trackQuery('rpc', fn)
    this.instrumentation.recordRpcCall(fn, Date.now() - startTime, 'error')
    return { data: null, error: { message: finalMessage }, attempts: attemptCount }
  }

  async rpcWithCache<T extends RpcFunctionName>(
    client: SupabaseClient<Database>,
    fn: T,
    args: RpcFunctionArgs<T>,
    options?: Omit<RpcCacheOptions, 'cache'>
  ): Promise<RpcAttemptResult<Database['public']['Functions'][T]['Returns']>>
  async rpcWithCache(
    client: SupabaseClient<Database>,
    fn: string,
    args: Record<string, unknown>,
    options?: Omit<RpcCacheOptions, 'cache'>
  ): Promise<RpcAttemptResult<unknown>>
  async rpcWithCache(
    client: SupabaseClient<Database>,
    fn: string,
    args: Record<string, unknown>,
    options?: Omit<RpcCacheOptions, 'cache'>
  ): Promise<RpcAttemptResult<unknown>> {
    return this.rpcWithRetries(
      client,
      fn,
      args,
      RPC_MAX_RETRIES,
      RPC_BACKOFF_MS,
      RPC_TIMEOUT_MS,
      {
        ...options,
        cache: true,
        source: options?.source ?? 'service'
      }
    )
  }
}

export type { RpcAttemptResult, RpcCacheOptions, RpcFunctionArgs, RpcFunctionName }
