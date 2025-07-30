#!/usr/bin/env node

/**
 * RLS Health Monitor
 * Continuously monitors RLS policies in production for security and performance
 */

const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@supabase/supabase-js')

const prisma = new PrismaClient()

class RLSHealthMonitor {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    
    this.alertThresholds = {
      queryTime: 1000, // ms
      errorRate: 0.05, // 5%
      failedPolicies: 0
    }
    
    this.metrics = {
      timestamp: new Date().toISOString(),
      rlsEnabled: 0,
      rlsDisabled: 0,
      policiesCount: 0,
      avgQueryTime: 0,
      errorRate: 0,
      alerts: []
    }
  }

  async checkRLSStatus() {
    console.log('🔍 Checking RLS status...')
    
    try {
      const { data: tables } = await this.supabase
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('schemaname', 'public')
      
      const critical_tables = [
        'Property', 'Unit', 'Tenant', 'Lease', 'MaintenanceRequest',
        'Document', 'Expense', 'Invoice', 'Subscription'
      ]
      
      let enabled = 0
      let disabled = 0
      
      for (const table of critical_tables) {
        const tableInfo = tables?.find(t => t.tablename === table)
        
        if (tableInfo?.rowsecurity) {
          enabled++
        } else {
          disabled++
          this.metrics.alerts.push({
            level: 'CRITICAL',
            message: `RLS not enabled on critical table: ${table}`,
            timestamp: new Date().toISOString()
          })
        }
      }
      
      this.metrics.rlsEnabled = enabled
      this.metrics.rlsDisabled = disabled
      
      console.log(`✅ RLS enabled on ${enabled} tables`)
      if (disabled > 0) {
        console.log(`❌ RLS disabled on ${disabled} critical tables`)
      }
      
    } catch (error) {
      this.metrics.alerts.push({
        level: 'ERROR',
        message: `Failed to check RLS status: ${error.message}`,
        timestamp: new Date().toISOString()
      })
    }
  }

  async checkPolicyCount() {
    console.log('📊 Checking policy count...')
    
    try {
      const { data: policies } = await this.supabase
        .from('pg_policies')
        .select('tablename, policyname')
      
      this.metrics.policiesCount = policies?.length || 0
      
      console.log(`📋 Found ${this.metrics.policiesCount} RLS policies`)
      
      // Check for missing policies on critical tables
      const critical_tables = ['Property', 'Unit', 'Tenant', 'Lease']
      const required_operations = ['select', 'insert', 'update', 'delete']
      
      for (const table of critical_tables) {
        const tablePolicies = policies?.filter(p => p.tablename === table) || []
        
        if (tablePolicies.length === 0) {
          this.metrics.alerts.push({
            level: 'CRITICAL',
            message: `No RLS policies found for critical table: ${table}`,
            timestamp: new Date().toISOString()
          })
        }
      }
      
    } catch (error) {
      this.metrics.alerts.push({
        level: 'ERROR',
        message: `Failed to check policies: ${error.message}`,
        timestamp: new Date().toISOString()
      })
    }
  }

  async measureQueryPerformance() {
    console.log('⚡ Measuring query performance...')
    
    const testQueries = [
      {
        name: 'Property SELECT',
        query: () => this.supabase.from('Property').select('id, name').limit(10)
      },
      {
        name: 'Unit with Property JOIN',
        query: () => this.supabase.from('Unit').select('id, Property(name)').limit(10)
      },
      {
        name: 'Lease with relations',
        query: () => this.supabase
          .from('Lease')
          .select('id, Unit(unitNumber), Tenant(name)')
          .limit(10)
      }
    ]
    
    const queryTimes = []
    
    for (const test of testQueries) {
      try {
        const start = Date.now()
        await test.query()
        const duration = Date.now() - start
        
        queryTimes.push(duration)
        
        if (duration > this.alertThresholds.queryTime) {
          this.metrics.alerts.push({
            level: 'WARNING',
            message: `Slow query detected: ${test.name} took ${duration}ms`,
            timestamp: new Date().toISOString()
          })
        }
        
      } catch (error) {
        this.metrics.alerts.push({
          level: 'ERROR',
          message: `Query failed: ${test.name} - ${error.message}`,
          timestamp: new Date().toISOString()
        })
      }
    }
    
    this.metrics.avgQueryTime = queryTimes.length > 0 
      ? Math.round(queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length)
      : 0
    
    console.log(`⏱️  Average query time: ${this.metrics.avgQueryTime}ms`)
  }

  async checkSecurityViolations() {
    console.log('🛡️  Checking for security violations...')
    
    try {
      // Check for overly permissive policies
      const { data: permissivePolicies } = await this.supabase
        .from('pg_policies')
        .select('tablename, policyname, qual')
        .or('qual.is.null,qual.like.%true%,qual.like.%1=1%')
      
      if (permissivePolicies && permissivePolicies.length > 0) {
        this.metrics.alerts.push({
          level: 'WARNING',
          message: `Found ${permissivePolicies.length} potentially permissive policies`,
          timestamp: new Date().toISOString(),
          details: permissivePolicies.map(p => `${p.tablename}.${p.policyname}`)
        })
      }
      
      // Check for policies without user context on user tables
      const { data: contextlessPolicies } = await this.supabase
        .from('pg_policies')
        .select('tablename, policyname, qual')
        .in('tablename', ['Property', 'Unit', 'Tenant', 'Lease'])
        .not('qual', 'like', '%auth.uid()%')
        .not('qual', 'like', '%user_%')
        .not('qual', 'is', null)
      
      if (contextlessPolicies && contextlessPolicies.length > 0) {
        this.metrics.alerts.push({
          level: 'WARNING',
          message: `Found ${contextlessPolicies.length} policies without user context`,
          timestamp: new Date().toISOString(),
          details: contextlessPolicies.map(p => `${p.tablename}.${p.policyname}`)
        })
      }
      
    } catch (error) {
      this.metrics.alerts.push({
        level: 'ERROR',
        message: `Failed to check security violations: ${error.message}`,
        timestamp: new Date().toISOString()
      })
    }
  }

  async sendAlerts() {
    const criticalAlerts = this.metrics.alerts.filter(a => a.level === 'CRITICAL')
    const errorAlerts = this.metrics.alerts.filter(a => a.level === 'ERROR')
    const warningAlerts = this.metrics.alerts.filter(a => a.level === 'WARNING')
    
    if (criticalAlerts.length > 0 || errorAlerts.length > 0) {
      console.log('\n🚨 CRITICAL SECURITY ALERTS:')
      [...criticalAlerts, ...errorAlerts].forEach(alert => {
        console.log(`  ❌ ${alert.message}`)
      })
      
      // Send to monitoring system
      if (process.env.SLACK_WEBHOOK_URL) {
        await this.sendSlackAlert(criticalAlerts, errorAlerts)
      }
      
      if (process.env.SECURITY_DASHBOARD_URL) {
        await this.sendToDashboard()
      }
    }
    
    if (warningAlerts.length > 0) {
      console.log('\n⚠️  WARNINGS:')
      warningAlerts.forEach(alert => {
        console.log(`  ⚠️  ${alert.message}`)
      })
    }
  }

  async sendSlackAlert(critical, errors) {
    try {
      const message = {
        text: '🚨 RLS Security Alert',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 RLS Security Alert'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Critical Issues:* ${critical.length}\n*Errors:* ${errors.length}\n*Environment:* ${process.env.NODE_ENV || 'unknown'}`
            }
          }
        ]
      }
      
      if (critical.length > 0) {
        message.blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Critical Issues:*\n' + critical.map(a => `• ${a.message}`).join('\n')
          }
        })
      }
      
      const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })
      
      if (response.ok) {
        console.log('📱 Slack alert sent successfully')
      }
      
    } catch (error) {
      console.error('Failed to send Slack alert:', error.message)
    }
  }

  async sendToDashboard() {
    try {
      const response = await fetch(`${process.env.SECURITY_DASHBOARD_URL}/api/rls-health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SECURITY_DASHBOARD_TOKEN}`
        },
        body: JSON.stringify(this.metrics)
      })
      
      if (response.ok) {
        console.log('📊 Metrics sent to security dashboard')
      }
      
    } catch (error) {
      console.error('Failed to send to dashboard:', error.message)
    }
  }

  generateReport() {
    const { alerts } = this.metrics
    const critical = alerts.filter(a => a.level === 'CRITICAL').length
    const errors = alerts.filter(a => a.level === 'ERROR').length
    const warnings = alerts.filter(a => a.level === 'WARNING').length
    
    console.log('\n' + '='.repeat(60))
    console.log('🔒 RLS HEALTH MONITORING REPORT')
    console.log('='.repeat(60))
    console.log(`Timestamp: ${this.metrics.timestamp}`)
    console.log(`RLS Enabled Tables: ${this.metrics.rlsEnabled}`)
    console.log(`RLS Disabled Tables: ${this.metrics.rlsDisabled}`)
    console.log(`Total Policies: ${this.metrics.policiesCount}`)
    console.log(`Avg Query Time: ${this.metrics.avgQueryTime}ms`)
    console.log(`Critical Alerts: ${critical}`)
    console.log(`Errors: ${errors}`)
    console.log(`Warnings: ${warnings}`)
    console.log('='.repeat(60))
    
    // Overall health score
    let healthScore = 100
    healthScore -= (critical * 25) // -25 per critical issue
    healthScore -= (errors * 10)   // -10 per error
    healthScore -= (warnings * 5)  // -5 per warning
    
    if (this.metrics.rlsDisabled > 0) {
      healthScore -= (this.metrics.rlsDisabled * 20) // -20 per disabled table
    }
    
    if (this.metrics.avgQueryTime > this.alertThresholds.queryTime) {
      healthScore -= 10 // -10 for slow queries
    }
    
    healthScore = Math.max(0, healthScore)
    
    console.log(`\n🏥 OVERALL HEALTH SCORE: ${healthScore}/100`)
    
    if (healthScore >= 90) {
      console.log('✅ RLS security is healthy!')
    } else if (healthScore >= 70) {
      console.log('⚠️  RLS security needs attention')
    } else {
      console.log('❌ RLS security has critical issues!')
    }
    
    // Save report
    const fs = require('fs')
    fs.writeFileSync('rls-health-report.json', JSON.stringify({
      ...this.metrics,
      healthScore
    }, null, 2))
    
    return healthScore
  }

  async monitor() {
    console.log('🔒 Starting RLS Health Monitoring...\n')
    
    await this.checkRLSStatus()
    await this.checkPolicyCount()
    await this.measureQueryPerformance()
    await this.checkSecurityViolations()
    await this.sendAlerts()
    
    const healthScore = this.generateReport()
    
    // Exit with error if health is poor
    if (healthScore < 70) {
      process.exit(1)
    }
  }
}

// Run monitoring if called directly
if (require.main === module) {
  const monitor = new RLSHealthMonitor()
  monitor.monitor()
    .catch(error => {
      console.error('Monitoring failed:', error)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}

module.exports = RLSHealthMonitor