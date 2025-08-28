#!/usr/bin/env node
/**
 * Fix Client Reference Manifest for Vercel Deployment
 * 
 * This script creates missing client reference manifest files that Vercel's
 * file tracing expects to exist. This is a workaround for a known issue in
 * Next.js 15 with route groups where the build succeeds but Vercel's file
 * tracing fails to find expected manifest files.
 * 
 * See: https://github.com/vercel/next.js/issues/53569
 */

const fs = require('fs')
const path = require('path')

try {
  console.log('🔧 Starting client reference manifest fix...')
  console.log('📂 Current working directory:', process.cwd())
  console.log('📂 Script directory:', __dirname)
  
  const manifestPath = path.join(__dirname, '../.next/server/app/(public)/page_client-reference-manifest.js')
  const manifestDir = path.dirname(manifestPath)
  
  console.log('📂 Target manifest path:', manifestPath)
  console.log('📂 Target manifest directory:', manifestDir)

  // Check if .next directory exists
  const nextDir = path.join(__dirname, '../.next')
  if (!fs.existsSync(nextDir)) {
    console.log('❌ .next directory does not exist, skipping manifest fix')
    console.log('ℹ️  This is expected if the build hasn\'t completed yet or failed')
    process.exit(0)
  }

  // Create the directory if it doesn't exist
  if (!fs.existsSync(manifestDir)) {
    console.log('📁 Creating manifest directory...')
    fs.mkdirSync(manifestDir, { recursive: true })
    console.log('✅ Created directory:', manifestDir)
  }

  // Create the manifest file if it doesn't exist
  if (!fs.existsSync(manifestPath)) {
    console.log('🔧 Creating missing client reference manifest file for Vercel deployment...')
    fs.writeFileSync(manifestPath, 'module.exports = {};')
    console.log('✅ Created page_client-reference-manifest.js')
  } else {
    console.log('✅ Client reference manifest already exists')
  }
  
  console.log('🎉 Manifest fix completed successfully')
} catch (error) {
  console.error('❌ Error in fix-client-manifest script:', error.message)
  console.error('🔍 Error details:', error)
  
  // Don't fail the build - this is a workaround script
  console.log('⚠️  Continuing build despite manifest fix error')
  process.exit(0)
}