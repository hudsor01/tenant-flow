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

const manifestPath = path.join(__dirname, '../.next/server/app/(public)/page_client-reference-manifest.js')
const manifestDir = path.dirname(manifestPath)

// Create the directory if it doesn't exist
if (!fs.existsSync(manifestDir)) {
  fs.mkdirSync(manifestDir, { recursive: true })
}

// Create the manifest file if it doesn't exist
if (!fs.existsSync(manifestPath)) {
  console.log('🔧 Creating missing client reference manifest file for Vercel deployment...')
  fs.writeFileSync(manifestPath, 'module.exports = {};')
  console.log('✅ Created page_client-reference-manifest.js')
} else {
  console.log('✅ Client reference manifest already exists')
}