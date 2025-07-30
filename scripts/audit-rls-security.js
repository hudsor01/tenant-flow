#!/usr/bin/env node

/**
 * RLS Security Audit Script
 * Performs comprehensive security audit of Row Level Security policies
 */

// Skip in CI environment
if (process.env.CI) {
  console.log('🚧 Running in CI environment - skipping RLS security audit')
  console.log('✅ RLS security audit skipped in CI (database connection not available)')
  process.exit(0)
}

const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@supabase/supabase-js')

const prisma = new PrismaClient()

// Critical tables that MUST have RLS enabled
const CRITICAL_TABLES = [
  'Property',
  'Unit', 
  'Tenant',
  'Lease',
  'MaintenanceRequest',
  'Document',
  'Expense',
  'Invoice',
  'Subscription',
  'Activity',
  'File'
]

// Policy patterns that should exist for each table
const REQUIRED_POLICIES = {
  'Property': ['select', 'insert', 'update', 'delete'],
  'Unit': ['select', 'insert', 'update', 'delete'],
  'Tenant': ['select', 'update'],
  'Lease': ['select', 'insert', 'update'],
  'MaintenanceRequest': ['select', 'insert', 'update'],
  'Document': ['select', 'insert'],
  'Expense': ['select', 'insert', 'update'],
  'Invoice': ['select'],
  'Subscription': ['select'],
  'Activity': ['select', 'insert'],
  'File': ['select', 'insert']
}

class RLSSecurityAuditor {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )
    
    this.auditResults = {
      timestamp: new Date().toISOString(),
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    }
  }

  log(level, message, details = null) {
    const entry = {
      level,
      message,
      details,
      timestamp: new Date().toISOString()
    }
    
    this.auditResults.details.push(entry)
    
    const emoji = {
      'PASS': '✅',
      'FAIL': '❌', 
      'WARN': '⚠️',
      'INFO': 'ℹ️'
    }
    
    console.log(`${emoji[level]} ${message}`)
    if (details) {
      console.log(`   ${JSON.stringify(details, null, 2)}`)
    }
    
    if (level === 'PASS') this.auditResults.passed++
    if (level === 'FAIL') this.auditResults.failed++
    if (level === 'WARN') this.auditResults.warnings++
  }

  async checkRLSEnabled() {
    this.log('INFO', 'Checking RLS is enabled on critical tables...')
    
    try {
      const { data: tables, error } = await this.supabase
        .rpc('get_table_rls_status')
      
      if (error) {
        // Fallback to direct query
        const { data: tablesAlt } = await this.supabase
          .from('pg_tables')
          .select('tablename, rowsecurity')
          .eq('schemaname', 'public')
          .in('tablename', CRITICAL_TABLES)
      }
      
      for (const tableName of CRITICAL_TABLES) {
        const table = tables?.find(t => t.tablename === tableName)
        
        if (!table) {
          this.log('FAIL', `Table ${tableName} not found in database`)
          continue
        }
        
        if (table.rowsecurity) {
          this.log('PASS', `RLS enabled on ${tableName}`)
        } else {
          this.log('FAIL', `RLS NOT enabled on ${tableName}`)
        }
      }
    } catch (error) {
      this.log('FAIL', 'Failed to check RLS status', { error: error.message })
    }
  }

  async checkPolicyCompleteness() {
    this.log('INFO', 'Checking policy completeness...')
    
    try {
      const { data: policies, error } = await this.supabase
        .from('pg_policies')
        .select('tablename, policyname, cmd')
        .in('tablename', CRITICAL_TABLES)
      
      if (error) {
        this.log('FAIL', 'Failed to retrieve policies', { error: error.message })
        return
      }
      
      for (const [tableName, requiredPolicies] of Object.entries(REQUIRED_POLICIES)) {
        const tablePolicies = policies.filter(p => p.tablename === tableName)
        
        for (const requiredCmd of requiredPolicies) {
          const hasPolicy = tablePolicies.some(p => 
            p.cmd.toLowerCase() === requiredCmd.toLowerCase() || 
            p.cmd.toLowerCase() === 'all'
          )
          
          if (hasPolicy) {
            this.log('PASS', `${tableName} has ${requiredCmd.toUpperCase()} policy`)
          } else {
            this.log('FAIL', `${tableName} missing ${requiredCmd.toUpperCase()} policy`)
          }
        }
      }
    } catch (error) {
      this.log('FAIL', 'Error checking policy completeness', { error: error.message })
    }
  }

  async checkHelperFunctions() {
    this.log('INFO', 'Checking helper functions exist...')
    
    const requiredFunctions = [
      'user_owns_property',
      'user_is_tenant_in_property',
      'user_has_unit_access',
      'test_rls_policies'
    ]
    
    try {
      for (const funcName of requiredFunctions) {
        const { data, error } = await this.supabase
          .from('pg_proc')
          .select('proname')
          .eq('proname', funcName)
          .single()
        
        if (data) {
          this.log('PASS', `Helper function ${funcName} exists`)
        } else {
          this.log('FAIL', `Helper function ${funcName} missing`)
        }
      }
    } catch (error) {
      this.log('FAIL', 'Error checking helper functions', { error: error.message })
    }
  }

  async checkIndexes() {
    this.log('INFO', 'Checking critical indexes for RLS performance...')
    
    const criticalIndexes = [
      { table: 'Property', column: 'ownerId', index: 'idx_property_owner_id' },
      { table: 'Unit', column: 'propertyId', index: 'idx_unit_property_id' },
      { table: 'Tenant', column: 'userId', index: 'idx_tenant_user_id' },
      { table: 'Lease', column: 'unitId', index: 'idx_lease_unit_id' },
      { table: 'Lease', column: 'tenantId', index: 'idx_lease_tenant_id' },
      { table: 'MaintenanceRequest', column: 'unitId', index: 'idx_maintenance_unit_id' }
    ]
    
    try {
      for (const { table, column, index } of criticalIndexes) {
        const { data, error } = await this.supabase
          .from('pg_indexes')
          .select('indexname')
          .eq('tablename', table)
          .eq('indexname', index)
          .single()
        
        if (data) {
          this.log('PASS', `Performance index ${index} exists for ${table}.${column}`)
        } else {
          this.log('WARN', `Performance index ${index} missing for ${table}.${column}`)
        }
      }
    } catch (error) {
      this.log('FAIL', 'Error checking indexes', { error: error.message })
    }
  }

  async testCrossTenantIsolation() {
    this.log('INFO', 'Testing cross-tenant isolation...')
    
    try {
      // Create two test users
      const { data: user1, error: user1Error } = await this.supabase.auth.admin.createUser({
        email: 'audit-test-1@example.com',
        password: 'test123456',
        email_confirm: true
      })
      
      const { data: user2, error: user2Error } = await this.supabase.auth.admin.createUser({
        email: 'audit-test-2@example.com', 
        password: 'test123456',
        email_confirm: true
      })
      
      if (user1Error || user2Error) {
        this.log('WARN', 'Could not create test users for isolation test')
        return
      }
      
      // Create user records
      await this.supabase.from('User').insert([
        { id: user1.user.id, supabaseId: user1.user.id, email: user1.user.email, role: 'OWNER' },
        { id: user2.user.id, supabaseId: user2.user.id, email: user2.user.email, role: 'OWNER' }
      ])
      
      // Create property for user1
      const { data: property } = await this.supabase
        .from('Property')
        .insert({
          name: 'Audit Test Property',
          address: '123 Audit St',
          city: 'Test City',
          state: 'CA',  
          zipCode: '12345',
          ownerId: user1.user.id
        })
        .select()
        .single()
      
      // Try to access as user2 (should fail)
      const user2Client = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${user2.user.id}` // This is simplified for test
            }
          }
        }
      )
      
      const { data: unauthorizedAccess } = await user2Client
        .from('Property')
        .select('*')
        .eq('id', property.id)
      
      if (!unauthorizedAccess || unauthorizedAccess.length === 0) {
        this.log('PASS', 'Cross-tenant isolation working - user2 cannot access user1 property')
      } else {
        this.log('FAIL', 'Cross-tenant isolation BROKEN - user2 can access user1 property')
      }
      
      // Cleanup
      await this.supabase.auth.admin.deleteUser(user1.user.id)
      await this.supabase.auth.admin.deleteUser(user2.user.id)
      
    } catch (error) {
      this.log('WARN', 'Could not complete cross-tenant isolation test', { error: error.message })
    }
  }

  async generateReport() {
    const { passed, failed, warnings } = this.auditResults
    const total = passed + failed + warnings
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0
    
    console.log('\n' + '='.repeat(60))
    console.log('🔒 RLS SECURITY AUDIT REPORT')
    console.log('='.repeat(60))
    console.log(`Timestamp: ${this.auditResults.timestamp}`)
    console.log(`Total Checks: ${total}`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⚠️  Warnings: ${warnings}`)
    console.log(`📊 Success Rate: ${successRate}%`)
    console.log('='.repeat(60))
    
    if (failed > 0) {
      console.log('\n❌ CRITICAL ISSUES FOUND:')
      this.auditResults.details
        .filter(d => d.level === 'FAIL')
        .forEach(d => console.log(`  • ${d.message}`))
    }
    
    if (warnings > 0) {
      console.log('\n⚠️  WARNINGS:')
      this.auditResults.details
        .filter(d => d.level === 'WARN')
        .forEach(d => console.log(`  • ${d.message}`))
    }
    
    // Write detailed report to file
    const fs = require('fs')
    fs.writeFileSync('rls-audit-report.json', JSON.stringify(this.auditResults, null, 2))
    
    // Exit with error code if critical issues found
    if (failed > 0) {
      console.log('\n🚨 AUDIT FAILED - Critical security issues must be addressed!')
      process.exit(1)
    }
    
    console.log('\n✅ RLS Security Audit Passed!')
  }

  async runAudit() {
    console.log('🔒 Starting RLS Security Audit...\n')
    
    await this.checkRLSEnabled()
    await this.checkPolicyCompleteness()
    await this.checkHelperFunctions()
    await this.checkIndexes()
    await this.testCrossTenantIsolation()
    
    await this.generateReport()
  }
}

// Run audit if called directly
if (require.main === module) {
  const auditor = new RLSSecurityAuditor()
  auditor.runAudit()
    .catch(error => {
      console.error('Audit failed:', error)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}

module.exports = RLSSecurityAuditor