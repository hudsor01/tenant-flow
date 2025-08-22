import { Command, CommandRunner, Option } from 'nest-commander'
import type { DatabaseOptimizationService } from '../database/database-optimization.service'
import { Logger } from '@nestjs/common'

interface DatabaseOptimizationOptions {
	action: 'apply' | 'stats' | 'analyze' | 'health' | 'unused'
	tables?: string
	verbose?: boolean
}

/**
 * CLI Command for Database Optimization
 * 
 * Usage:
 *   npm run cli:db -- --action apply                    # Apply all optimization indexes
 *   npm run cli:db -- --action stats                    # Show index usage statistics
 *   npm run cli:db -- --action analyze                  # Analyze table statistics
 *   npm run cli:db -- --action analyze --tables "Property,Unit"  # Analyze specific tables
 *   npm run cli:db -- --action health                   # Performance health check
 *   npm run cli:db -- --action unused                   # Find unused indexes
 */

 @Command({
	name: 'db',
	description: 'Database optimization and performance management'
})
export class DatabaseOptimizationCommand extends CommandRunner {
	private readonly logger = new Logger(DatabaseOptimizationCommand.name)

	constructor(private readonly dbOptimizationService: DatabaseOptimizationService) {
		super()
	}

	async run(
		_passedParams: string[],
		options: DatabaseOptimizationOptions
	): Promise<void> {
		const { action, tables, verbose } = options

		if (verbose) {
			this.logger.log(`Starting database optimization action: ${action}`)
		}

		try {
			switch (action) {
				case 'apply':
					await this.applyOptimizations(verbose || false)
					break
				case 'stats':
					await this.showIndexStats(verbose || false)
					break
				case 'analyze':
					await this.analyzeTables(tables, verbose || false)
					break
				case 'health':
					await this.performHealthCheck(verbose || false)
					break
				case 'unused':
					await this.findUnusedIndexes(verbose || false)
					break
				default:
					this.logger.error(`Unknown action: ${action}`)
					this.logger.log('Available actions: apply, stats, analyze, health, unused')
					process.exit(1)
			}
		} catch (error) {
			this.logger.error('Database optimization command failed:', error)
			process.exit(1)
		}
	}

	@Option({
		flags: '-a, --action <action>',
		description: 'Action to perform: apply, stats, analyze, health, unused',
		required: true
	})
	parseAction(value: string): string {
		const validActions = ['apply', 'stats', 'analyze', 'health', 'unused']
		if (!validActions.includes(value)) {
			throw new Error(`Invalid action: ${value}. Valid actions: ${validActions.join(', ')}`)
		}
		return value
	}

	@Option({
		flags: '-t, --tables <tables>',
		description: 'Comma-separated list of tables (for analyze action)',
		required: false
	})
	parseTables(value: string): string {
		return value
	}

	@Option({
		flags: '-v, --verbose',
		description: 'Enable verbose output',
		required: false
	})
	parseVerbose(): boolean {
		return true
	}

	private async applyOptimizations(verbose: boolean): Promise<void> {
		this.logger.log('🚀 Applying database optimization indexes...')
		
		const result = await this.dbOptimizationService.applyOptimizations(verbose)
		
		if (result.success) {
			this.logger.log('✅ Database optimization completed successfully')
			
			if (verbose && result.results) {
				this.logger.log('\nResults:')
				result.results.forEach((resultItem: string) => {
					this.logger.log(`  ${resultItem}`)
				})
			}
		} else {
			this.logger.error('❌ Database optimization failed')
			if (result.error) {
				this.logger.error(`  ${result.error}`)
			}
			process.exit(1)
		}
	}

	private async showIndexStats(verbose: boolean): Promise<void> {
		this.logger.log('📊 Retrieving index usage statistics...')
		
		const result = await this.dbOptimizationService.getIndexUsageStats()
		
		if (result.success && result.stats) {
			this.logger.log(`Found ${result.stats.length} indexes`)
			
			this.logger.log('📈 Index Usage Statistics:')
			this.logger.log('─'.repeat(100))
			this.logger.log(
				'Schema'.padEnd(10) + 
				'Table'.padEnd(20) + 
				'Index'.padEnd(30) + 
				'Scans'.padEnd(10) + 
				'Tuples Read'.padEnd(15) + 
				'Size'.padEnd(10)
			)
			this.logger.log('─'.repeat(100))
			
			result.stats
				.sort((a, b) => b.scans - a.scans)
				.slice(0, verbose ? 50 : 20)
				.forEach(stat => {
					this.logger.log(
						stat.schemaname.padEnd(10) +
						stat.tablename.padEnd(20) +
						stat.indexname.padEnd(30) +
						stat.scans.toString().padEnd(10) +
						stat.tuples_read.toString().padEnd(15) +
						stat.size.padEnd(10)
					)
				})
		} else {
			this.logger.error('❌ Failed to retrieve index statistics:', result.error)
			process.exit(1)
		}
	}

	private async analyzeTables(tables: string | undefined, verbose: boolean): Promise<void> {
		const tableList = tables ? tables.split(',').map(t => t.trim()) : undefined
		
		if (tableList) {
			this.logger.log(`🔍 Analyzing tables: ${tableList.join(', ')}`)
		} else {
			this.logger.log('🔍 Analyzing all main tables...')
		}
		
		const result = await this.dbOptimizationService.analyzeTables(tableList?.join(','), verbose)
		
		if (result.success) {
			this.logger.log('✅ Table analysis completed successfully')
			
			if (verbose && result.analyzed) {
				this.logger.log('\nAnalyzed tables:')
				result.analyzed.forEach((table: string) => {
					this.logger.log(`  ${table}`)
				})
			}
		} else {
			this.logger.error('❌ Table analysis failed')
			if (result.error) {
				this.logger.error(`  ${result.error}`)
			}
			process.exit(1)
		}
	}

	private async performHealthCheck(verbose: boolean): Promise<void> {
		this.logger.log('🏥 Performing database performance health check...')
		
		const result = await this.dbOptimizationService.getHealthMetrics()
		
		if (result.success) {
			this.logger.log('🏥 Database Health Check Results:')
			
			if (result.health) {
				this.logger.log(`  Connections: ${result.health.connections}`)
				this.logger.log(`  Cache Hit Ratio: ${result.health.cache_hit_ratio}%`)
				this.logger.log(`  Tables: ${result.health.table_sizes.length}`)
				this.logger.log(`  Indexes: ${result.health.index_sizes.length}`)
			}
			
			// Show detailed performance overview if verbose
			if (verbose) {
				const overview = await this.dbOptimizationService.getPerformanceOverview()
				if (overview.success && overview.overview) {
					this.logger.log('📊 Performance Overview:')
					this.logger.log(`  Database Size: ${overview.overview.database_size}`)
					this.logger.log(`  Total Tables: ${overview.overview.total_tables}`)
					this.logger.log(`  Total Indexes: ${overview.overview.total_indexes}`)
					this.logger.log(`  Cache Hit Ratio: ${overview.overview.cache_hit_ratio}%`)
					this.logger.log(`  Active Connections: ${overview.overview.active_connections}`)
				}
			}
		} else {
			this.logger.error('❌ Health check failed:', result.error)
			process.exit(1)
		}
	}

	private async findUnusedIndexes(_verbose: boolean): Promise<void> {
		this.logger.log('🔍 Finding unused indexes...')
		
		const result = await this.dbOptimizationService.findUnusedIndexes()
		
		if (result.success && result.unused_indexes) {
			if (result.unused_indexes.length === 0) {
				this.logger.log('✅ No unused indexes found!')
			} else {
				this.logger.warn(`Found ${result.unused_indexes.length} unused indexes:`)
				this.logger.log('─'.repeat(80))
				this.logger.log(
					'Schema'.padEnd(10) + 
					'Table'.padEnd(20) + 
					'Index'.padEnd(30) + 
					'Size'.padEnd(10) + 
					'Scans'.padEnd(8)
				)
				this.logger.log('─'.repeat(80))
				
				result.unused_indexes
					.sort((a, b) => {
						// Sort by size (extract number from size string)
						const aSize = parseFloat(a.size.replace(/[^0-9.]/g, ''))
						const bSize = parseFloat(b.size.replace(/[^0-9.]/g, ''))
						return bSize - aSize
					})
					.forEach(index => {
						this.logger.log(
							index.schemaname.padEnd(10) +
							index.tablename.padEnd(20) +
							index.indexname.padEnd(30) +
							index.size.padEnd(10) +
							index.scans.toString().padEnd(8)
						)
					})
				
				this.logger.log('💡 Consider dropping unused indexes to improve write performance and save storage.')
				this.logger.warn('⚠️  Always verify index usage patterns before dropping!')
			}
		} else {
			this.logger.error('❌ Failed to find unused indexes:', result.error)
			process.exit(1)
		}
	}
}
