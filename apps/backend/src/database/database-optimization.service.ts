import { Inject, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  DbIndexUsageRow,
  DbSlowQueryRow,
  DbHealthMetrics,
  DbPerformanceOverview,
} from '@repo/shared'
import { SupabaseService } from './supabase.service'

type RpcResponse<T> = { data: T | null; error: { message: string } | null }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function toString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : String(v ?? fallback)
}

function decodeIndexUsageRow(v: unknown): DbIndexUsageRow | null {
  if (!isRecord(v)) return null
  return {
    schemaname: toString(v.schemaname ?? v.schema, 'public'),
    tablename: toString(v.tablename ?? v.table, ''),
    indexname: toString(v.indexname ?? v.index, ''),
    scans: toNumber(v.scans ?? v.idx_scan, 0),
    tuples_read: toNumber(v.tuples_read, 0),
    tuples_fetched: toNumber(v.tuples_fetched, 0),
    size: toString(v.size ?? v.index_size, '0 bytes'),
  }
}

function decodeSlowQueryRow(v: unknown): DbSlowQueryRow | null {
  if (!isRecord(v)) return null
  const calls = toNumber(v.calls, 0)
  const total = toNumber(v.total_time, 0)
  const hasMean = typeof v.mean_time !== 'undefined' && v.mean_time !== null
  const mean = hasMean ? toNumber(v.mean_time, 0) : (calls > 0 ? total / calls : 0)
  return {
    query: toString(v.query ?? v.normalized_query, ''),
    calls,
    total_time: total,
    mean_time: mean,
    rows: toNumber(v.rows, 0),
    hit_percent: toNumber(v.hit_percent ?? v.shared_blks_hit_percent, 0),
  }
}

function decodeHealth(v: unknown): DbHealthMetrics | null {
  if (!isRecord(v)) return null
  const tableSizes = Array.isArray(v.table_sizes)
    ? v.table_sizes
        .map(ts =>
          isRecord(ts)
            ? {
                table_name: toString(ts.table_name ?? ts.tablename, ''),
                size: toString(ts.size ?? ts.total_bytes_readable, '0 bytes'),
                row_count: toNumber(ts.row_count ?? ts.estimated_rows, 0),
              }
            : null,
        )
        .filter(Boolean) as DbHealthMetrics['table_sizes']
    : []

  const indexSizes = Array.isArray(v.index_sizes)
    ? v.index_sizes
        .map(ix =>
          isRecord(ix)
            ? {
                index_name: toString(ix.index_name ?? ix.index, ''),
                size: toString(ix.size ?? ix.index_size, '0 bytes'),
                table_name: toString(ix.table_name ?? ix.tablename, ''),
              }
            : null,
        )
        .filter(Boolean) as DbHealthMetrics['index_sizes']
    : []

  return {
    connections: toNumber(v.connections, 0),
    cache_hit_ratio: toNumber(v.cache_hit_ratio ?? v.cache_hit_percent, 0),
    table_sizes: tableSizes,
    index_sizes: indexSizes,
  }
}

@Injectable()
export class DatabaseOptimizationService {
	private readonly logger = new Logger(DatabaseOptimizationService.name)

  constructor(
    @Inject(SupabaseService) private readonly supabaseService: SupabaseService
  ) {}

  // Typed RPC helper: centralizes bypass of generated RPC name union while preserving typed payloads
  private async rpc<T>(
    client: SupabaseClient,
    fn: string,
    args?: Record<string, unknown>
  ): Promise<RpcResponse<T>> {
    const caller = (client as unknown as { rpc: (f: string, a?: Record<string, unknown>) => Promise<RpcResponse<T>> }).rpc
    return caller(fn, args)
  }

	/**
	 * Apply database optimization indexes
	 * Creates recommended indexes to improve query performance
	 */
	async applyOptimizations(_verbose = false): Promise<{
		success: boolean
		results?: string[]
		error?: string
	}> {
		const results: string[] = []

		try {
			const client = this.supabaseService.getAdminClient()

			// Use native Supabase RPC function to create performance indexes
			const { data, error } = await client.rpc('create_performance_indexes')

			if (error) {
				this.logger.error(
					'Failed to apply database optimizations:',
					error.message
				)
				return { success: false, error: error.message }
			}

			if (
				data &&
				typeof data === 'object' &&
				'results' in data &&
				Array.isArray(data.results)
			) {
				// Log each result for monitoring
				for (const result of data.results) {
					if (typeof result === 'string') {
						if (result.startsWith('SUCCESS:')) {
							this.logger.log(result)
						} else if (result.startsWith('ERROR:')) {
							this.logger.error(result)
						}
						// Only add string results to the results array
						results.push(result)
					}
				}
			}

			const totalOperations =
				data && typeof data === 'object' && 'total_operations' in data
					? (data.total_operations as number)
					: 0
			const success =
				data && typeof data === 'object' && 'success' in data
					? (data.success as boolean)
					: false

			this.logger.log(
				`Database optimization completed: ${totalOperations} operations`
			)
			return { success, results }
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			this.logger.error('Failed to apply optimizations:', error)
			return { success: false, error: errorMessage }
		}
	}

	/**
	 * Get index usage statistics for performance monitoring
	 */
	async getIndexUsageStats(): Promise<{
		success: boolean
		stats?: {
			schemaname: string
			tablename: string
			indexname: string
			scans: number
			tuples_read: number
			tuples_fetched: number
			size: string
		}[]
		error?: string
	}> {
		try {
			const client = this.supabaseService.getAdminClient()
			// Prefer a dedicated RPC if available
			let stats: unknown[] | undefined
      const { data: rpcData, error: rpcError } = await this.rpc<unknown[]>(
        client,
        'get_index_usage_stats'
      )

			if (!rpcError && Array.isArray(rpcData)) {
				stats = rpcData
			} else {
				// Fallback: fetch the broader performance overview and extract index_usage
      const { data: overview, error } = await this.rpc<DbPerformanceOverview>(
        client,
        'get_database_performance_stats'
      )
				if (error) {
					this.logger.warn('get_index_usage_stats not available, overview failed:', error.message)
					return { success: false, error: error.message }
				}
        if (overview && Array.isArray(overview.index_usage)) {
          stats = overview.index_usage
        }
			}

			if (!stats) {
				return { success: false, error: 'Index usage not available' }
			}

      const typed = (stats as unknown[])
        .map(decodeIndexUsageRow)
        .filter((r): r is DbIndexUsageRow => !!r)
        // deterministic ordering by lowest scans first
        .sort((a, b) => a.scans - b.scans)

			return { success: true, stats: typed }
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.logger.error('Error getting index usage stats:', error)
			return { success: false, error: errorMessage }
		}
	}

	/**
	 * Get slow query statistics for performance monitoring
	 */
	async getSlowQueryStats(): Promise<{
		success: boolean
		queries?: {
			query: string
			calls: number
			total_time: number
			mean_time: number
			rows: number
			hit_percent: number
		}[]
		error?: string
	}> {
		try {
			const client = this.supabaseService.getAdminClient()
			// Prefer dedicated RPC if extension is enabled on DB
      const { data, error } = await this.rpc<unknown[]>(client, 'get_slow_query_stats')
      if (!error && Array.isArray(data)) {
        const typed = data
          .map(decodeSlowQueryRow)
          .filter((q): q is DbSlowQueryRow => !!q)
          // order by mean_time desc
          .sort((a, b) => b.mean_time - a.mean_time)
          .slice(0, 50)
        return { success: true, queries: typed }
      }

			// Fallback: try overview
      const { data: overview, error: ovErr } = await this.rpc<DbPerformanceOverview>(
        client,
        'get_database_performance_stats'
      )
			if (ovErr) {
				return { success: false, error: 'Slow query stats unavailable (pg_stat_statements disabled)' }
			}
      const queries = overview?.slow_queries
      if (Array.isArray(queries)) {
        const typed = (queries as unknown[])
          .map(decodeSlowQueryRow)
          .filter((q): q is DbSlowQueryRow => !!q)
        return { success: true, queries: typed }
      }

			return { success: false, error: 'Slow query stats not available' }
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.logger.warn('Error getting slow query stats:', error)
			return { success: false, error: errorMessage }
		}
	}

	/**
	 * Analyze database tables to update statistics
	 */
	async analyzeTables(
		tables?: string,
		_verbose = false
	): Promise<{
		success: boolean
		analyzed?: string[]
		error?: string
	}> {
		const tablesToAnalyze = tables
			? tables.split(',').map(t => t.trim()).filter(Boolean)
			: undefined

		try {
			const client = this.supabaseService.getAdminClient()
			let analyzed: string[] = []
      if (tablesToAnalyze && tablesToAnalyze.length > 0) {
        const { data, error } = await this.rpc<unknown[]>(client, 'analyze_tables', {
          tables: tablesToAnalyze
        })
				if (error) {
					this.logger.error('ANALYZE tables failed:', error.message)
					return { success: false, error: error.message }
				}
        analyzed = Array.isArray(data) ? (data as unknown[]).map(v => toString(v)) : tablesToAnalyze
      } else {
        // Full analyze
        const { data, error } = await this.rpc<unknown[]>(client, 'analyze_all_tables')
        if (error) {
          this.logger.error('ANALYZE all tables failed:', error.message)
          return { success: false, error: error.message }
        }
        analyzed = Array.isArray(data) ? (data as unknown[]).map(v => toString(v)) : []
      }

			return { success: true, analyzed }
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.logger.error('Error analyzing tables:', error)
			return { success: false, error: errorMessage }
		}
	}

	/**
	 * Get performance overview
	 */
	async getPerformanceOverview(): Promise<{
		success: boolean
		overview?: Record<string, unknown>
		error?: string
	}> {
		try {
			const client = this.supabaseService.getAdminClient()

			// Use native Supabase RPC function to get performance stats
			const { data, error } = await client.rpc('get_database_performance_stats')

			if (error) {
				this.logger.error('Failed to get performance overview:', error.message)
				return { success: false, error: error.message }
			}

			// Type guard to ensure data is a Record<string, unknown>
			const overview =
				data && typeof data === 'object' && data !== null
					? (data as Record<string, unknown>)
					: undefined

			return { success: true, overview }
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			this.logger.error('Error getting performance overview:', error)
			return { success: false, error: errorMessage }
		}
	}

	/**
	 * Find unused indexes
	 */
	async findUnusedIndexes(): Promise<{
		success: boolean
		unused_indexes?: {
			schemaname: string
			tablename: string
			indexname: string
			size: string
			scans: number
		}[]
		error?: string
	}> {
		try {
			// Try a dedicated RPC that returns unused indexes by scan count
			const client = this.supabaseService.getAdminClient()
      const { data, error } = await this.rpc<unknown[]>(client, 'find_unused_indexes')
      if (!error && Array.isArray(data)) {
        const typed = (data as unknown[])
          .map(decodeIndexUsageRow)
          .filter((r): r is DbIndexUsageRow => !!r)
        return { success: true, unused_indexes: typed }
      }

			// Fallback: compute from index usage
			const usage = await this.getIndexUsageStats()
			if (!usage.success || !usage.stats) {
				return { success: false, error: usage.error ?? 'Unable to compute unused indexes' }
			}
			const unused = usage.stats.filter(s => s.scans === 0)
			return { success: true, unused_indexes: unused }
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.logger.error('Error finding unused indexes:', error)
			return { success: false, error: errorMessage }
		}
	}

	/**
	 * Get database health metrics
	 */
	async getHealthMetrics(): Promise<{
		success: boolean
		health?: {
			connections: number
			cache_hit_ratio: number
			table_sizes: {
				table_name: string
				size: string
				row_count: number
			}[]
			index_sizes: {
				index_name: string
				size: string
				table_name: string
			}[]
		}
		error?: string
	}> {
		try {
			const client = this.supabaseService.getAdminClient()
			// Prefer a dedicated RPC if present
			let health: unknown
      const { data, error } = await this.rpc<unknown>(client, 'get_database_health_metrics')
      if (!error && data && typeof data === 'object') {
        health = data as Record<string, unknown>
      } else {
        const { data: overview, error: ovErr } = await this.rpc<DbPerformanceOverview>(
          client,
          'get_database_performance_stats'
        )
        if (ovErr) {
          return { success: false, error: ovErr.message }
        }
        health = (overview?.health as unknown) ?? (overview as unknown)
      }

      const normalized = decodeHealth(health)
      if (!normalized) return { success: false, error: 'Invalid health payload' }

      return { success: true, health: normalized }
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.logger.error('Error getting health metrics:', error)
			return { success: false, error: errorMessage }
		}
	}
}
