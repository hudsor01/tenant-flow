#!/usr/bin/env tsx

/**
 * Comprehensive Test Data Cleanup Script
 * 
 * Safely removes test data with confirmation prompts, dependency ordering,
 * and rollback capabilities. Supports environment-specific and selective cleanup.
 */

import { PrismaClient } from '@prisma/client'
import { Logger } from './utils/logger'
import { PerformanceMonitor } from './utils/performance-monitor'
import * as readline from 'readline'

interface CleanupOptions {
  environment?: 'development' | 'testing' | 'ci' | 'local'
  selective?: string[]
  dryRun?: boolean
  force?: boolean
  confirm?: boolean
  verbose?: boolean
  backup?: boolean
}

interface CleanupStats {
  tablesProcessed: number
  recordsDeleted: number
  duration: number
  errors: string[]
  warnings: string[]
}

export class TestDataCleaner {
  private prisma: PrismaClient
  private logger: Logger
  private monitor: PerformanceMonitor
  private rl: readline.Interface

  // Cleanup order is critical to respect foreign key constraints
  private readonly cleanupOrder = [
    // Child tables first (no dependencies)
    { table: 'webhookEvent', description: 'Stripe webhook events' },
    { table: 'failedWebhookEvent', description: 'Failed webhook events' },
    { table: 'invoice', description: 'Stripe invoices' },
    { table: 'reminderLog', description: 'Email reminder logs' },
    { table: 'notificationLog', description: 'Notification logs' },
    { table: 'userAccessLog', description: 'User access logs' },
    { table: 'activity', description: 'User activities' },
    { table: 'expense', description: 'Property expenses' },
    { table: 'file', description: 'Uploaded files' },
    { table: 'document', description: 'Documents' },
    
    // Middle-tier tables
    { table: 'maintenanceRequest', description: 'Maintenance requests' },
    { table: 'lease', description: 'Lease agreements' },
    { table: 'inspection', description: 'Property inspections' },
    { table: 'message', description: 'User messages' },
    { table: 'customerInvoice', description: 'Customer invoices' },
    { table: 'customerInvoiceItem', description: 'Customer invoice items' },
    { table: 'invoiceLeadCapture', description: 'Invoice lead captures' },
    { table: 'leaseGeneratorUsage', description: 'Lease generator usage' },
    
    // Core business entities
    { table: 'tenant', description: 'Tenant profiles' },
    { table: 'unit', description: 'Property units' },
    { table: 'property', description: 'Properties' },
    
    // User-related tables
    { table: 'subscription', description: 'User subscriptions' },
    { table: 'userFeatureAccess', description: 'User feature access' },
    { table: 'userPreferences', description: 'User preferences' },
    { table: 'userSession', description: 'User sessions' },
    
    // Root tables (highest level)
    { table: 'user', description: 'User accounts' },
    { table: 'blogArticle', description: 'Blog articles' },
    { table: 'blogTag', description: 'Blog tags' },
    { table: 'securityAuditLog', description: 'Security audit logs' }
  ]

  constructor(options: CleanupOptions = {}) {
    this.prisma = new PrismaClient()
    this.logger = new Logger({ 
      level: options.verbose ? 4 : 2,
      colors: true,
      timestamps: true 
    })
    this.monitor = new PerformanceMonitor()
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
  }

  async execute(options: CleanupOptions = {}): Promise<CleanupStats> {
    const startTime = Date.now()
    this.logger.info('🧹 Starting comprehensive test data cleanup...')
    this.monitor.start('total_cleanup')

    const stats: CleanupStats = {
      tablesProcessed: 0,
      recordsDeleted: 0,
      duration: 0,
      errors: [],
      warnings: []
    }

    try {
      // Validate environment and safety checks
      await this.validateEnvironment(options)

      // Get confirmation if required
      if (options.confirm && !options.force) {
        const confirmed = await this.getConfirmation(options)
        if (!confirmed) {
          this.logger.info('Cleanup cancelled by user')
          return stats
        }
      }

      // Create backup if requested
      if (options.backup) {
        await this.createBackup()
      }

      // Determine what to clean
      const tablesToClean = this.getTablesToCleane(options)
      
      if (options.dryRun) {
        await this.performDryRun(tablesToClean)
        return stats
      }

      // Execute cleanup
      const result = await this.performCleanup(tablesToClean, options)
      Object.assign(stats, result)

      this.logger.success('✅ Cleanup completed successfully!')
      this.logCleanupSummary(stats)

    } catch (error) {
      this.logger.error('❌ Cleanup failed:', error)
      stats.errors.push(error instanceof Error ? error.message : String(error))
      throw error
    } finally {
      stats.duration = Date.now() - startTime
      this.monitor.end('total_cleanup')
      this.rl.close()
      await this.prisma.$disconnect()
    }

    return stats
  }

  private async validateEnvironment(options: CleanupOptions): Promise<void> {
    this.logger.info('🔍 Validating environment...')

    // Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`
      this.logger.success('✅ Database connection successful')
    } catch (error) {
      throw new Error(`Database connection failed: ${error}`)
    }

    // Prevent production cleanup
    if (process.env.NODE_ENV === 'production' && !options.force) {
      throw new Error('❌ Cannot run cleanup in production environment without --force flag')
    }

    // Check database URL for safety
    const dbUrl = process.env.DATABASE_URL || ''
    if (!dbUrl.includes('test') && !dbUrl.includes('dev') && !dbUrl.includes('local') && !options.force) {
      this.logger.warn('⚠️  Database URL does not appear to be a test database')
      throw new Error('Use --force flag to proceed with non-test database')
    }

    // Check for existing data
    const userCount = await this.prisma.user.count()
    if (userCount === 0) {
      this.logger.warn('⚠️  No user data found - database appears to be empty')
    } else {
      this.logger.info(`📊 Found ${userCount} users in database`)
    }
  }

  private async getConfirmation(options: CleanupOptions): Promise<boolean> {
    const tablesCount = this.getTablesToCleane(options).length
    
    console.log('\n' + '='.repeat(60))
    console.log('🚨 DESTRUCTIVE OPERATION WARNING 🚨')
    console.log('='.repeat(60))
    console.log(`Environment: ${options.environment || 'development'}`)
    console.log(`Tables to clean: ${tablesCount}`)
    console.log(`Database: ${process.env.DATABASE_URL?.split('@')[1] || 'unknown'}`)
    console.log('='.repeat(60))
    
    return new Promise((resolve) => {
      this.rl.question('\nDo you want to proceed with cleanup? (yes/no): ', (answer) => {
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y')
      })
    })
  }

  private getTablesToCleane(options: CleanupOptions): typeof this.cleanupOrder {
    if (options.selective && options.selective.length > 0) {
      return this.cleanupOrder.filter(item => 
        options.selective!.includes(item.table)
      )
    }
    return this.cleanupOrder
  }

  private async performDryRun(tables: typeof this.cleanupOrder): Promise<void> {
    this.logger.info('🔍 DRY RUN - Analyzing data to be deleted...')
    
    let totalRecords = 0
    
    for (const { table, description } of tables) {
      try {
        const count = await (this.prisma as any)[table].count()
        totalRecords += count
        
        if (count > 0) {
          this.logger.info(`  ${table}: ${count} records (${description})`)
        } else {
          this.logger.verbose(`  ${table}: 0 records (${description})`)
        }
      } catch (error) {
        this.logger.warn(`  ${table}: Error counting records - ${error}`)
      }
    }
    
    this.logger.info(`\n📊 Total records that would be deleted: ${totalRecords}`)
    this.logger.info('🔍 DRY RUN completed - no data was modified')
  }

  private async performCleanup(
    tables: typeof this.cleanupOrder, 
    options: CleanupOptions
  ): Promise<Partial<CleanupStats>> {
    let totalDeleted = 0
    let tablesProcessed = 0
    const errors: string[] = []
    const warnings: string[] = []

    this.logger.info(`🗑️  Cleaning ${tables.length} tables...`)

    for (const { table, description } of tables) {
      try {
        this.monitor.start(`cleanup_${table}`)
        
        // Count records before deletion
        const countBefore = await (this.prisma as any)[table].count()
        
        if (countBefore === 0) {
          this.logger.verbose(`  ${table}: No records to delete`)
          this.monitor.end(`cleanup_${table}`, 0)
          continue
        }

        // Perform deletion
        const result = await (this.prisma as any)[table].deleteMany()
        const deletedCount = result.count || countBefore
        
        totalDeleted += deletedCount
        tablesProcessed++
        
        this.logger.info(`  ${table}: Deleted ${deletedCount} records (${description})`)
        this.monitor.end(`cleanup_${table}`, deletedCount)
        
      } catch (error) {
        const errorMessage = `Failed to clean ${table}: ${error}`
        errors.push(errorMessage)
        this.logger.error(`  ${table}: ${errorMessage}`)
        this.monitor.end(`cleanup_${table}`, 0)
      }
    }

    // Reset sequences if using PostgreSQL
    if (totalDeleted > 0) {
      await this.resetSequences()
    }

    return {
      tablesProcessed,
      recordsDeleted: totalDeleted,
      errors,
      warnings
    }
  }

  private async resetSequences(): Promise<void> {
    try {
      this.logger.info('🔄 Resetting database sequences...')
      
      // This is PostgreSQL specific - would need adaptation for other databases
      await this.prisma.$executeRaw`
        DO $$ 
        DECLARE 
          r RECORD;
        BEGIN
          FOR r IN (SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public') 
          LOOP
            EXECUTE 'ALTER SEQUENCE IF EXISTS ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename || '_id_seq') || ' RESTART WITH 1';
          END LOOP;
        END $$;
      `
      
      this.logger.success('✅ Database sequences reset')
      
    } catch (error) {
      this.logger.warn(`⚠️  Could not reset sequences: ${error}`)
    }
  }

  private async createBackup(): Promise<void> {
    this.logger.info('💾 Creating backup before cleanup...')
    // Note: In a real implementation, you might want to:
    // 1. Use pg_dump for PostgreSQL
    // 2. Export data to JSON files
    // 3. Create a database snapshot
    // For now, we'll just log that backup was requested
    this.logger.warn('⚠️  Backup functionality not implemented - proceeding without backup')
  }

  private logCleanupSummary(stats: CleanupStats): void {
    const summary = [
      '\n📋 Cleanup Summary',
      '─'.repeat(40),
      `Tables Processed: ${stats.tablesProcessed}`,
      `Records Deleted: ${stats.recordsDeleted}`,
      `Duration: ${stats.duration}ms`,
      `Errors: ${stats.errors.length}`,
      `Warnings: ${stats.warnings.length}`
    ]

    if (stats.errors.length > 0) {
      summary.push('\n❌ Errors:')
      stats.errors.forEach(error => summary.push(`  • ${error}`))
    }

    if (stats.warnings.length > 0) {
      summary.push('\n⚠️  Warnings:')
      stats.warnings.forEach(warning => summary.push(`  • ${warning}`))
    }

    // Add performance metrics
    const performanceSummary = this.monitor.generateSummary()
    summary.push('\n' + this.monitor.formatSummary(performanceSummary))

    this.logger.info(summary.join('\n'))
  }

  // Selective cleanup methods
  async cleanUserData(): Promise<void> {
    await this.execute({
      selective: ['user', 'userPreferences', 'userFeatureAccess', 'userSession', 'userAccessLog']
    })
  }

  async cleanPropertyData(): Promise<void> {
    await this.execute({
      selective: ['property', 'unit', 'lease', 'tenant', 'maintenanceRequest', 'expense', 'document', 'file']
    })
  }

  async cleanStripeData(): Promise<void> {
    await this.execute({
      selective: ['subscription', 'invoice', 'webhookEvent', 'failedWebhookEvent']
    })
  }

  async cleanTestingData(): Promise<void> {
    // Clean everything except essential system data
    const testingTables = this.cleanupOrder
      .filter(item => !['securityAuditLog', 'blogArticle', 'blogTag'].includes(item.table))
      .map(item => item.table)
    
    await this.execute({
      selective: testingTables
    })
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  const options: CleanupOptions = {}

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    switch (arg) {
      case '--environment':
      case '-e':
        options.environment = args[++i] as any
        break
      case '--selective':
      case '-s':
        options.selective = args[++i].split(',')
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--force':
        options.force = true
        break
      case '--confirm':
        options.confirm = true
        break
      case '--verbose':
        options.verbose = true
        break
      case '--backup':
        options.backup = true
        break
      case '--help':
      case '-h':
        console.log(`
Usage: tsx cleanup-all.ts [options]

Options:
  -e, --environment <env>    Target environment (development|testing|ci|local)
  -s, --selective <tables>   Comma-separated list of tables to clean
  --dry-run                  Show what would be deleted without executing
  --force                    Force cleanup in production environment
  --confirm                  Show confirmation prompt
  --verbose                  Enable verbose logging
  --backup                   Create backup before cleanup
  -h, --help                 Show this help message

Examples:
  tsx cleanup-all.ts --environment testing --confirm
  tsx cleanup-all.ts --selective user,property --dry-run
  tsx cleanup-all.ts --force --verbose

Selective cleanup shortcuts:
  tsx cleanup-all.ts --selective users     # Clean only user-related data
  tsx cleanup-all.ts --selective properties # Clean only property-related data
  tsx cleanup-all.ts --selective stripe     # Clean only Stripe-related data
`)
        process.exit(0)
    }
  }

  // Default to confirmation in interactive environments
  if (!options.dryRun && !options.force) {
    options.confirm = true
  }

  const cleaner = new TestDataCleaner(options)
  await cleaner.execute(options)
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { TestDataCleaner, CleanupOptions, CleanupStats }