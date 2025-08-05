#!/usr/bin/env node

/**
 * Web Vitals Performance Analysis Script
 * 
 * This script analyzes Core Web Vitals data collected during development
 * and provides insights into performance trends and regressions.
 * 
 * Usage:
 * node scripts/analyze-web-vitals.js
 * 
 * The script reads data from localStorage (in development) or from
 * a specified data file for analysis.
 */

const fs = require('fs')
const path = require('path')

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

// Core Web Vitals thresholds
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 }
}

function getRating(metric, value) {
  const thresholds = THRESHOLDS[metric]
  if (!thresholds) return 'unknown'
  
  if (value <= thresholds.good) return 'good'
  if (value <= thresholds.needsImprovement) return 'needs-improvement'
  return 'poor'
}

function getColorForRating(rating) {
  switch (rating) {
    case 'good': return colors.green
    case 'needs-improvement': return colors.yellow
    case 'poor': return colors.red
    default: return colors.reset
  }
}

function formatValue(metric, value) {
  if (metric === 'CLS') {
    return value.toFixed(3)
  }
  return `${Math.round(value)}ms`
}

function analyzeWebVitalsData(data) {
  if (!data || data.length === 0) {
    console.log(`${colors.yellow}⚠️  No Web Vitals data found${colors.reset}`)
    return
  }

  console.log(`${colors.bright}${colors.blue}📊 Web Vitals Performance Analysis${colors.reset}`)
  console.log(`${colors.blue}=======================================${colors.reset}\n`)

  // Group data by metric
  const metricGroups = {}
  data.forEach(entry => {
    if (!metricGroups[entry.name]) {
      metricGroups[entry.name] = []
    }
    metricGroups[entry.name].push(entry)
  })

  // Analyze each metric
  Object.keys(metricGroups).forEach(metric => {
    const values = metricGroups[metric]
    const latest = values[values.length - 1]
    const average = values.reduce((sum, entry) => sum + entry.value, 0) / values.length
    const min = Math.min(...values.map(entry => entry.value))
    const max = Math.max(...values.map(entry => entry.value))
    
    const latestRating = getRating(metric, latest.value)
    const avgRating = getRating(metric, average)
    
    console.log(`${colors.bright}${metric} (${values.length} samples)${colors.reset}`)
    console.log(`  Latest: ${getColorForRating(latestRating)}${formatValue(metric, latest.value)} (${latestRating})${colors.reset}`)
    console.log(`  Average: ${getColorForRating(avgRating)}${formatValue(metric, average)} (${avgRating})${colors.reset}`)
    console.log(`  Range: ${formatValue(metric, min)} - ${formatValue(metric, max)}`)
    
    // Show trend (last 5 vs previous 5)
    if (values.length >= 10) {
      const recentAvg = values.slice(-5).reduce((sum, entry) => sum + entry.value, 0) / 5
      const olderAvg = values.slice(-10, -5).reduce((sum, entry) => sum + entry.value, 0) / 5
      const trend = recentAvg < olderAvg ? 'improving' : recentAvg > olderAvg ? 'degrading' : 'stable'
      const trendColor = trend === 'improving' ? colors.green : trend === 'degrading' ? colors.red : colors.yellow
      
      console.log(`  Trend: ${trendColor}${trend}${colors.reset} (${formatValue(metric, Math.abs(recentAvg - olderAvg))} ${recentAvg < olderAvg ? 'better' : 'worse'})`)
    }
    
    console.log()
  })

  // Overall performance score
  const overallRatings = Object.keys(metricGroups).map(metric => {
    const latest = metricGroups[metric][metricGroups[metric].length - 1]
    return getRating(metric, latest.value)
  })

  const goodCount = overallRatings.filter(r => r === 'good').length
  const totalCount = overallRatings.length
  const scorePercentage = Math.round((goodCount / totalCount) * 100)

  let scoreColor = colors.red
  if (scorePercentage >= 80) scoreColor = colors.green
  else if (scorePercentage >= 60) scoreColor = colors.yellow

  console.log(`${colors.bright}Overall Performance Score: ${scoreColor}${scorePercentage}%${colors.reset} (${goodCount}/${totalCount} metrics in "good" range)`)

  // Performance insights
  console.log(`\n${colors.bright}${colors.cyan}💡 Performance Insights${colors.reset}`)
  console.log(`${colors.cyan}========================${colors.reset}`)

  Object.keys(metricGroups).forEach(metric => {
    const latest = metricGroups[metric][metricGroups[metric].length - 1]
    const rating = getRating(metric, latest.value)
    
    if (rating === 'poor') {
      console.log(`${colors.red}⚠️  ${metric} needs immediate attention (${formatValue(metric, latest.value)})${colors.reset}`)
      
      // Provide specific recommendations
      switch (metric) {
        case 'LCP':
          console.log('   • Optimize largest contentful paint element (images, text blocks)')
          console.log('   • Implement image lazy loading and compression')
          console.log('   • Use CDN for static assets')
          break
        case 'FID':
          console.log('   • Reduce JavaScript execution time')
          console.log('   • Break up long tasks')
          console.log('   • Use code splitting')
          break
        case 'CLS':
          console.log('   • Set explicit dimensions for images and embeds')
          console.log('   • Avoid inserting content above existing content')
          console.log('   • Use transform animations instead of layout-triggering properties')
          break
        case 'FCP':
          console.log('   • Optimize server response time')
          console.log('   • Eliminate render-blocking resources')
          console.log('   • Minimize main thread work')
          break
        case 'TTFB':
          console.log('   • Optimize server performance')
          console.log('   • Use a CDN')
          console.log('   • Cache resources effectively')
          break
      }
      console.log()
    }
  })

  // URL performance breakdown
  const urlGroups = {}
  data.forEach(entry => {
    if (entry.url) {
      if (!urlGroups[entry.url]) {
        urlGroups[entry.url] = {}
      }
      if (!urlGroups[entry.url][entry.name]) {
        urlGroups[entry.url][entry.name] = []
      }
      urlGroups[entry.url][entry.name].push(entry)
    }
  })

  if (Object.keys(urlGroups).length > 1) {
    console.log(`\n${colors.bright}${colors.cyan}📍 Performance by URL${colors.reset}`)
    console.log(`${colors.cyan}=====================${colors.reset}`)
    
    Object.keys(urlGroups).forEach(url => {
      console.log(`\n${colors.bright}${url}${colors.reset}`)
      Object.keys(urlGroups[url]).forEach(metric => {
        const values = urlGroups[url][metric]
        const average = values.reduce((sum, entry) => sum + entry.value, 0) / values.length
        const rating = getRating(metric, average)
        console.log(`  ${metric}: ${getColorForRating(rating)}${formatValue(metric, average)} (${rating})${colors.reset}`)
      })
    })
  }
}

// Try to read data from a JSON file if provided as argument
const dataFile = process.argv[2]
if (dataFile && fs.existsSync(dataFile)) {
  try {
    const rawData = fs.readFileSync(dataFile, 'utf8')
    const data = JSON.parse(rawData)
    analyzeWebVitalsData(data)
  } catch (error) {
    console.error(`${colors.red}❌ Error reading data file: ${error.message}${colors.reset}`)
    process.exit(1)
  }
} else {
  // Provide instructions for collecting data
  console.log(`${colors.bright}${colors.blue}📊 Web Vitals Analysis Tool${colors.reset}`)
  console.log(`${colors.blue}=============================${colors.reset}\n`)
  
  console.log(`To analyze Web Vitals data:`)
  console.log(`\n1. Open your development site in the browser`)
  console.log(`2. Open Developer Tools > Console`)
  console.log(`3. Run this command to export data:`)
  console.log(`   ${colors.cyan}copy(JSON.stringify(JSON.parse(localStorage.getItem('webVitals') || '[]'), null, 2))${colors.reset}`)
  console.log(`4. Save the copied data to a file (e.g., web-vitals-data.json)`)
  console.log(`5. Run this script with the data file:`)
  console.log(`   ${colors.cyan}node scripts/analyze-web-vitals.js web-vitals-data.json${colors.reset}`)
  
  console.log(`\n${colors.yellow}💡 Tip: The WebVitalsMonitor component automatically collects data in development mode${colors.reset}`)
}