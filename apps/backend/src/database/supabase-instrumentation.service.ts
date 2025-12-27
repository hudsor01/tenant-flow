import { Injectable, Optional } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ClsService } from 'nestjs-cls'
import { MetricsService } from '../modules/metrics/metrics.service'
import { AppLogger } from '../logger/app-logger.service'

type PublicTableName = keyof Database['public']['Tables']
type RpcFunctionName = keyof Database['public']['Functions']
type RpcFunctionArgs<T extends RpcFunctionName> = Database['public']['Functions'][T]['Args']

type QueryTracker = {
  total: number
  counts: Map<string, { count: number; warned: boolean }>
  warnedTotal: boolean
}

const NPLUSONE_THRESHOLD = 8
const QUERY_TOTAL_WARN_THRESHOLD = 40

@Injectable()
export class SupabaseInstrumentationService {
  private readonly instrumentedClients = new WeakMap<
    SupabaseClient<Database>,
    SupabaseClient<Database>
  >()
  private readonly instrumentedQueryBuilders = new WeakMap<object, object>()
  private readonly instrumentedRpcBuilders = new WeakMap<object, object>()

  constructor(
    private readonly logger: AppLogger,
    @Optional() private readonly metrics?: MetricsService,
    @Optional() private readonly cls?: ClsService
  ) {}

  instrumentClient(
    client: SupabaseClient<Database>,
    source: 'admin' | 'user'
  ): SupabaseClient<Database> {
    const existing = this.instrumentedClients.get(client)
    if (existing) return existing

    const proxy = new Proxy(client as object, {
      get: (target, prop, receiver) => {
        if (prop === 'from') {
          return (table: string) => {
            const builder = (target as SupabaseClient<Database>).from(
              table as PublicTableName
            )
            return this.instrumentQueryBuilder(builder as object, {
              table,
              operation: 'select',
              source
            })
          }
        }
        if (prop === 'rpc') {
          return <T extends RpcFunctionName>(fn: T, args?: RpcFunctionArgs<T>) => {
            const builder = (target as SupabaseClient<Database>).rpc(fn, args)
            return this.instrumentRpcBuilder(builder as object, {
              fn,
              startTime: Date.now(),
              source
            })
          }
        }
        const value = Reflect.get(target, prop, receiver)
        if (typeof value === 'function') {
          return value.bind(target)
        }
        return value
      }
    }) as SupabaseClient<Database>

    this.instrumentedClients.set(client, proxy)
    return proxy
  }

  trackQuery(type: 'rpc' | 'table', signature: string): void {
    if (!this.cls) return
    if (typeof this.cls.isActive === 'function' && !this.cls.isActive()) return
    const tracker = this.getQueryTracker()
    tracker.total += 1

    const entry = tracker.counts.get(signature) ?? { count: 0, warned: false }
    entry.count += 1
    tracker.counts.set(signature, entry)

    if (entry.count >= NPLUSONE_THRESHOLD && !entry.warned) {
      entry.warned = true
      this.logger.warn('Potential N+1 query pattern detected', {
        type,
        signature,
        count: entry.count,
        totalQueries: tracker.total
      })
      this.metrics?.recordNPlusOneDetection(type, signature)
    }

    if (tracker.total >= QUERY_TOTAL_WARN_THRESHOLD && !tracker.warnedTotal) {
      tracker.warnedTotal = true
      this.logger.warn('High query volume detected in request', {
        totalQueries: tracker.total
      })
    }
  }

  recordRpcCall(fn: string, durationMs: number, status: 'success' | 'error' | 'cache'): void {
    this.metrics?.recordSupabaseRpcCall(fn, durationMs, status)
  }

  recordRpcCacheHit(fn: string): void {
    this.metrics?.recordSupabaseRpcCacheHit(fn)
  }

  recordRpcCacheMiss(fn: string): void {
    this.metrics?.recordSupabaseRpcCacheMiss(fn)
  }

  private instrumentQueryBuilder(
    builder: object,
    meta: { table: string; operation: string; source: 'admin' | 'user' }
  ): object {
    const existing = this.instrumentedQueryBuilders.get(builder)
    if (existing) return existing

    let operation = meta.operation
    const handler: ProxyHandler<object> = {
      get: (target, prop, receiver) => {
        if (prop === 'then') {
          const thenFn = (target as { then?: unknown }).then
          if (typeof thenFn !== 'function') {
            return undefined
          }
          return (onFulfilled: unknown, onRejected: unknown) => {
            this.trackQuery('table', `${meta.table}:${operation}`)
            const thenCallable = thenFn as (this: object, ...args: unknown[]) => unknown
            return thenCallable.call(target, onFulfilled, onRejected)
          }
        }

        const value = Reflect.get(target, prop, receiver)
        if (typeof value === 'function') {
          return (...args: unknown[]) => {
            if (typeof prop === 'string') {
              if (['select', 'insert', 'update', 'upsert', 'delete'].includes(prop)) {
                operation = prop
              }
            }
            const callable = value as (this: object, ...args: unknown[]) => unknown
            const result = callable.apply(target, args)
            if (result && typeof result === 'object') {
              return this.instrumentQueryBuilder(result as object, {
                ...meta,
                operation
              })
            }
            return result
          }
        }

        return value
      }
    }

    const proxy = new Proxy(builder, handler)
    this.instrumentedQueryBuilders.set(builder, proxy)
    return proxy
  }

  private instrumentRpcBuilder(
    builder: object,
    meta: { fn: string; startTime: number; source: 'admin' | 'user' }
  ): object {
    const existing = this.instrumentedRpcBuilders.get(builder)
    if (existing) return existing

    let recorded = false
    const record = (result?: { error?: unknown } | null, error?: unknown) => {
      if (recorded) return
      recorded = true
      this.trackQuery('rpc', meta.fn)
      const duration = Date.now() - meta.startTime
      const status = error || (result && result.error) ? 'error' : 'success'
      this.metrics?.recordSupabaseRpcCall(meta.fn, duration, status)
    }

    const handler: ProxyHandler<object> = {
      get: (target, prop, receiver) => {
        if (prop === 'then') {
          const thenFn = (target as { then?: unknown }).then
          if (typeof thenFn !== 'function') {
            return undefined
          }
          return (onFulfilled: unknown, onRejected: unknown) => {
            const thenCallable = thenFn as (this: object, ...args: unknown[]) => unknown
            return thenCallable.call(
              target,
              (value: { error?: unknown } | null) => {
                record(value)
                return typeof onFulfilled === 'function' ? (onFulfilled as CallableFunction)(value) : value
              },
              (err: unknown) => {
                record(null, err)
                if (typeof onRejected === 'function') {
                  return (onRejected as CallableFunction)(err)
                }
                throw err
              }
            )
          }
        }

        const value = Reflect.get(target, prop, receiver)
        if (typeof value === 'function') {
          return (...args: unknown[]) => {
            const callable = value as (this: object, ...args: unknown[]) => unknown
            return callable.apply(target, args)
          }
        }
        return value
      }
    }

    const proxy = new Proxy(builder, handler)
    this.instrumentedRpcBuilders.set(builder, proxy)
    return proxy
  }

  private getQueryTracker(): QueryTracker {
    const existing = this.cls?.get('DB_QUERY_TRACKER') as QueryTracker | undefined
    if (existing) return existing

    const tracker: QueryTracker = {
      total: 0,
      counts: new Map(),
      warnedTotal: false
    }
    this.cls?.set('DB_QUERY_TRACKER', tracker)
    return tracker
  }
}
