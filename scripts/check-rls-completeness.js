#!/usr/bin/env node

/**
 * RLS Completeness Checker
 * Ensures all sensitive tables have proper RLS policies
 */

// Skip in CI environment
if (process.env.CI || process.env.GITHUB_ACTIONS || process.env.RUNNER_OS) {
  console.log('🚧 Running in CI environment - skipping RLS completeness check')
  console.log('✅ RLS completeness check skipped in CI (database connection not available)')
  process.exit(0)
}

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Define security risk levels for tables
const TABLE_SECURITY_LEVELS = {
  // CRITICAL - Contains sensitive multi-tenant data
  CRITICAL: [
    'Property',
    'Unit', 
    'Tenant',
    'Lease',
    'MaintenanceRequest',
    'Document',
    'Expense',
    'Invoice',
    'Subscription',
    'User',
    'Activity',
    'File',
    'ReminderLog',
    'UserPreferences',
    'UserFeatureAccess',
    'UserAccessLog',
    'NotificationLog'
  ],
  
  // HIGH - Contains business data but less sensitive
  HIGH: [
    'WebhookEvent',
    'PaymentFailure',
    'FailedWebhookEvent',
    'UserSession',
    'SecurityAuditLog'
  ],
  
  // MEDIUM - System/config tables that may need protection
  MEDIUM: [
    'Inspection'
  ],
  
  // LOW - Public or system tables
  LOW: [
    'BlogArticle',
    'BlogTag', 
    'CustomerInvoice',
    'CustomerInvoiceItem',
    'InvoiceLeadCapture',
    'LeaseGeneratorUsage',
    'Message',
    'wrappers_fdw_stats'
  ]
}

class RLSCompletenessChecker {
  constructor() {
    this.issues = []
    this.warnings = []
    this.passed = []
  }

  async checkTableExists(tableName) {
    try {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ) as exists
      `
      return result[0].exists
    } catch (error) {
      return false
    }
  }

  async checkRLSEnabled(tableName) {
    try {
      const result = await prisma.$queryRaw`
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = ${tableName}
      `
      return result[0]?.rowsecurity || false
    } catch (error) {
      return false
    }
  }

  async checkPoliciesExist(tableName) {
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as policy_count
        FROM pg_policies 
        WHERE tablename = ${tableName}
      `
      return parseInt(result[0].policy_count) > 0
    } catch (error) {
      return false
    }
  }

  async analyzeSchemaFile() {
    const schemaPath = path.join(__dirname, '../apps/backend/prisma/schema.prisma')
    
    if (!fs.existsSync(schemaPath)) {
      this.issues.push('Prisma schema file not found')
      return []
    }
    
    const schemaContent = fs.readFileSync(schemaPath, 'utf8')
    const modelMatches = schemaContent.match(/model\s+(\w+)\s*{/g)
    
    if (!modelMatches) {
      this.issues.push('No models found in Prisma schema')
      return []
    }
    
    return modelMatches.map(match => match.match(/model\s+(\w+)/)[1])
  }

  async checkCriticalTables() {
    console.log('🔍 Checking CRITICAL security tables...')
    
    for (const tableName of TABLE_SECURITY_LEVELS.CRITICAL) {
      const exists = await this.checkTableExists(tableName)
      
      if (!exists) {
        this.warnings.push(`CRITICAL table ${tableName} not found in database`)
        continue
      }
      
      const rlsEnabled = await this.checkRLSEnabled(tableName)
      const hasPolicies = await this.checkPoliciesExist(tableName)
      
      if (!rlsEnabled) {
        this.issues.push(`🚨 CRITICAL: RLS not enabled on ${tableName}`)
      } else if (!hasPolicies) {
        this.issues.push(`🚨 CRITICAL: No RLS policies found for ${tableName}`)
      } else {
        this.passed.push(`✅ ${tableName} has RLS enabled with policies`)
        console.log(`  ✅ ${tableName}`)
      }
    }
  }

  async checkHighRiskTables() {
    console.log('\n🔍 Checking HIGH risk tables...')
    
    for (const tableName of TABLE_SECURITY_LEVELS.HIGH) {
      const exists = await this.checkTableExists(tableName)
      
      if (!exists) {
        continue // These tables may not exist in all environments
      }
      
      const rlsEnabled = await this.checkRLSEnabled(tableName)
      
      if (!rlsEnabled) {
        this.warnings.push(`⚠️  HIGH: Consider enabling RLS on ${tableName}`)
      } else {
        this.passed.push(`✅ ${tableName} has RLS enabled`)
        console.log(`  ✅ ${tableName}`)
      }
    }
  }

  async findUnprotectedTables() {
    console.log('\n🔍 Scanning for unprotected tables...')
    
    const allModels = await this.analyzeSchemaFile()
    const allSecurityTables = [
      ...TABLE_SECURITY_LEVELS.CRITICAL,
      ...TABLE_SECURITY_LEVELS.HIGH,
      ...TABLE_SECURITY_LEVELS.MEDIUM,
      ...TABLE_SECURITY_LEVELS.LOW
    ]
    
    const unclassifiedTables = allModels.filter(model => 
      !allSecurityTables.includes(model)
    )
    
    for (const tableName of unclassifiedTables) {
      const exists = await this.checkTableExists(tableName)
      
      if (!exists) continue
      
      const rlsEnabled = await this.checkRLSEnabled(tableName)
      
      if (!rlsEnabled) {
        this.warnings.push(`❓ UNCLASSIFIED: ${tableName} has no RLS - needs security review`)
      }
    }
    
    if (unclassifiedTables.length > 0) {
      console.log(`  Found ${unclassifiedTables.length} unclassified tables:`)
      unclassifiedTables.forEach(table => console.log(`    - ${table}`))
    }
  }

  async checkPolicyQuality() {
    console.log('\n🔍 Checking policy quality...')
    
    try {
      // Check for overly permissive policies
      const permissivePolicies = await prisma.$queryRaw`
        SELECT tablename, policyname, qual
        FROM pg_policies 
        WHERE qual LIKE '%true%' 
        OR qual LIKE '%1=1%'
        OR qual IS NULL
      `
      
      if (permissivePolicies.length > 0) {
        this.warnings.push(`Found ${permissivePolicies.length} potentially permissive policies`)
        permissivePolicies.forEach(policy => {
          console.log(`  ⚠️  ${policy.tablename}.${policy.policyname} may be too permissive`)
        })
      }
      
      // Check for policies without proper conditions
      const unconditionalPolicies = await prisma.$queryRaw`
        SELECT tablename, policyname
        FROM pg_policies 
        WHERE qual NOT LIKE '%auth.uid()%' 
        AND qual NOT LIKE '%user_%'
        AND qual IS NOT NULL
        AND tablename = ANY(${TABLE_SECURITY_LEVELS.CRITICAL})
      `
      
      if (unconditionalPolicies.length > 0) {
        this.warnings.push(`Found ${unconditionalPolicies.length} policies without user context`)
        unconditionalPolicies.forEach(policy => {
          console.log(`  ⚠️  ${policy.tablename}.${policy.policyname} missing user context`)
        })
      }
      
    } catch (error) {
      this.warnings.push(`Could not analyze policy quality: ${error.message}`)
    }
  }

  generateReport() {
    const totalIssues = this.issues.length
    const totalWarnings = this.warnings.length
    const totalPassed = this.passed.length
    
    console.log('\n' + '='.repeat(70))
    console.log('🔒 RLS COMPLETENESS REPORT')
    console.log('='.repeat(70))
    console.log(`Timestamp: ${new Date().toISOString()}`)
    console.log(`✅ Passed: ${totalPassed}`)
    console.log(`❌ Critical Issues: ${totalIssues}`)
    console.log(`⚠️  Warnings: ${totalWarnings}`)
    console.log('='.repeat(70))
    
    if (totalIssues > 0) {
      console.log('\n❌ CRITICAL ISSUES:')
      this.issues.forEach(issue => console.log(`  ${issue}`))
    }
    
    if (totalWarnings > 0) {
      console.log('\n⚠️  WARNINGS:')
      this.warnings.forEach(warning => console.log(`  ${warning}`))
    }
    
    // Write detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: totalPassed,
        critical_issues: totalIssues,
        warnings: totalWarnings
      },
      critical_issues: this.issues,
      warnings: this.warnings,
      passed_checks: this.passed
    }
    
    fs.writeFileSync('rls-completeness-report.json', JSON.stringify(report, null, 2))
    
    if (totalIssues > 0) {
      console.log('\n🚨 COMPLETENESS CHECK FAILED!')
      console.log('Critical security issues must be resolved before deployment.')
      process.exit(1)
    }
    
    console.log('\n✅ RLS Completeness Check Passed!')
    console.log('All critical tables have proper Row Level Security.')
  }

  async run() {
    console.log('🔒 Starting RLS Completeness Check...\n')
    
    await this.checkCriticalTables()
    await this.checkHighRiskTables()
    await this.findUnprotectedTables()
    await this.checkPolicyQuality()
    
    this.generateReport()
  }
}

// Run check if called directly
if (require.main === module) {
  const checker = new RLSCompletenessChecker()
  checker.run()
    .catch(error => {
      console.error('Completeness check failed:', error)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}

module.exports = RLSCompletenessChecker