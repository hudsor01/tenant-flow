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
  
  const nextDir = path.join(__dirname, '../.next')
  const serverAppDir = path.join(nextDir, 'server/app')

  // Check if .next directory exists
  if (!fs.existsSync(nextDir)) {
    console.log('❌ .next directory does not exist, skipping manifest fix')
    console.log('ℹ️  This is expected if the build hasn\'t completed yet or failed')
    process.exit(0)
  }

  if (!fs.existsSync(serverAppDir)) {
    console.log('ℹ️  server/app directory not found. Nothing to fix.')
    process.exit(0)
  }

  // Recursively walk directories and ensure manifest files exist where appropriate
  /** @param {string} dir */
  const walk = (dir) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch (e) {
      return
    }

    const files = entries.filter((e) => e.isFile()).map((e) => e.name)
    const hasPage = files.some((f) => /^page\.(m?js|cjs|mjs)$/.test(f))
    const hasLayout = files.some((f) => /^layout\.(m?js|cjs|mjs)$/.test(f))

    // Create client-reference manifests if missing
    if (hasPage) {
      const pageManifest = path.join(dir, 'page_client-reference-manifest.js')
      if (!fs.existsSync(pageManifest)) {
        try {
          fs.writeFileSync(pageManifest, 'module.exports = {};')
          console.log('✅ Created', pageManifest)
        } catch (e) {
          console.log('⚠️  Could not create', pageManifest, e.message)
        }
      }
    }
    if (hasLayout) {
      const layoutManifest = path.join(dir, 'layout_client-reference-manifest.js')
      if (!fs.existsSync(layoutManifest)) {
        try {
          fs.writeFileSync(layoutManifest, 'module.exports = {};')
          console.log('✅ Created', layoutManifest)
        } catch (e) {
          console.log('⚠️  Could not create', layoutManifest, e.message)
        }
      }
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name))
      }
    }
  }

  walk(serverAppDir)

  console.log('🎉 Manifest fix completed successfully')
} catch (error) {
  console.error('❌ Error in fix-client-manifest script:', error.message)
  console.error('🔍 Error details:', error)
  
  // Don't fail the build - this is a workaround script
  console.log('⚠️  Continuing build despite manifest fix error')
  process.exit(0)
}
