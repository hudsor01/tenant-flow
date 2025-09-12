import { Inject, Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from './supabase.service'

@Injectable()
export class DatabaseOptimizationService {
	private readonly logger = new Logger(DatabaseOptimizationService.name)

	constructor(
		@Inject(SupabaseService) private readonly supabaseService: SupabaseService
	) {}

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
			let stats: any[] | undefined
			const { data: rpcData, error: rpcError } = await (client.rpc as any)(
				'get_index_usage_stats' as any
			)

			if (!rpcError && Array.isArray(rpcData)) {
				stats = rpcData
			} else {
				// Fallback: fetch the broader performance overview and extract index_usage
				const { data: overview, error } = await client.rpc(
					'get_database_performance_stats'
				)
				if (error) {
					this.logger.warn('get_index_usage_stats not available, overview failed:', error.message)
					return { success: false, error: error.message }
				}
				if (
					overview &&
					typeof overview === 'object' &&
					'index_usage' in overview &&
					Array.isArray((overview as any).index_usage)
				) {
					stats = (overview as any).index_usage
				}
			}

			if (!stats) {
				return { success: false, error: 'Index usage not available' }
			}

			const typed = stats
				.map(s => ({
					schemaname: String(s.schemaname ?? s.schema ?? 'public'),
					tablename: String(s.tablename ?? s.table ?? ''),
					indexname: String(s.indexname ?? s.index ?? ''),
					scans: Number(s.scans ?? s.idx_scan ?? 0),
					tuples_read: Number(s.tuples_read ?? 0),
					tuples_fetched: Number(s.tuples_fetched ?? 0),
					size: String(s.size ?? s.index_size ?? '0 bytes')
				}))
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
			const { data, error } = await (client.rpc as any)('get_slow_query_stats' as any)
			if (!error && Array.isArray(data)) {
				const typed = data.map((q: any) => ({
					query: String(q.query ?? q.normalized_query ?? ''),
					calls: Number(q.calls ?? 0),
					total_time: Number(q.total_time ?? 0),
					mean_time: Number(q.mean_time ?? q.total_time / Math.max(1, Number(q.calls ?? 1))),
					rows: Number(q.rows ?? 0),
					hit_percent: Number(q.hit_percent ?? q.shared_blks_hit_percent ?? 0)
				}))
				// order by mean_time desc
				.sort((a, b) => b.mean_time - a.mean_time)
				.slice(0, 50)
				return { success: true, queries: typed }
			}

			// Fallback: try overview
			const { data: overview, error: ovErr } = await client.rpc('get_database_performance_stats')
			if (ovErr) {
				return { success: false, error: 'Slow query stats unavailable (pg_stat_statements disabled)' }
			}
			const queries = (overview as any)?.slow_queries
			if (Array.isArray(queries)) {
				const typed = queries.map((q: any) => ({
					query: String(q.query ?? ''),
					calls: Number(q.calls ?? 0),
					total_time: Number(q.total_time ?? 0),
					mean_time: Number(q.mean_time ?? 0),
					rows: Number(q.rows ?? 0),
					hit_percent: Number(q.hit_percent ?? 0)
				}))
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
				const { data, error } = await (client.rpc as any)('analyze_tables' as any, {
					tables: tablesToAnalyze
				})
				if (error) {
					this.logger.error('ANALYZE tables failed:', error.message)
					return { success: false, error: error.message }
				}
				analyzed = Array.isArray(data) ? data.map(String) : tablesToAnalyze
			} else {
				// Full analyze
				const { data, error } = await (client.rpc as any)('analyze_all_tables' as any)
				if (error) {
					this.logger.error('ANALYZE all tables failed:', error.message)
					return { success: false, error: error.message }
				}
				analyzed = Array.isArray(data) ? data.map(String) : []
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
			const { data, error } = await (client.rpc as any)('find_unused_indexes' as any)
			if (!error && Array.isArray(data)) {
				const typed = data.map((d: any) => ({
					schemaname: String(d.schemaname ?? 'public'),
					tablename: String(d.tablename ?? ''),
					indexname: String(d.indexname ?? ''),
					size: String(d.size ?? d.index_size ?? '0 bytes'),
					scans: Number(d.scans ?? d.idx_scan ?? 0)
				}))
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
			let health: any
			const { data, error } = await (client.rpc as any)('get_database_health_metrics' as any)
			if (!error && data && typeof data === 'object') {
				health = data
			} else {
				const { data: overview, error: ovErr } = await client.rpc(
					'get_database_performance_stats'
				)
				if (ovErr) {
					return { success: false, error: ovErr.message }
				}
				health = (overview as any)?.health ?? overview
			}

			const normalized = {
				connections: Number(health?.connections ?? 0),
				cache_hit_ratio: Number(health?.cache_hit_ratio ?? health?.cache_hit_percent ?? 0),
				table_sizes: Array.isArray(health?.table_sizes)
					? (health.table_sizes as any[]).map(t => ({
						table_name: String(t.table_name ?? t.tablename ?? ''),
						size: String(t.size ?? t.total_bytes_readable ?? '0 bytes'),
						row_count: Number(t.row_count ?? t.estimated_rows ?? 0)
					}))
					: [],
				index_sizes: Array.isArray(health?.index_sizes)
					? (health.index_sizes as any[]).map(i => ({
						index_name: String(i.index_name ?? i.index ?? ''),
						size: String(i.size ?? i.index_size ?? '0 bytes'),
						table_name: String(i.table_name ?? i.tablename ?? '')
					}))
					: []
			}

			return { success: true, health: normalized }
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.logger.error('Error getting health metrics:', error)
			return { success: false, error: errorMessage }
		}
	}
}
