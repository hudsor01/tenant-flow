#!/usr/bin/env node

/**
 * Fix HTML Entity Encoding Issues
 * 
 * This script fixes HTML entities that have been incorrectly encoded in TypeScript/JSX files,
 * causing compilation failures. It replaces:
 * - &apos; with '
 * - &quot; with "
 * - &lt; with <
 * - &gt; with >
 * - &amp; with &
 */

import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const execAsync = promisify(exec)

// HTML entity mappings
const entityMappings = {
  '&apos;': "'",
  '&quot;': '"',
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&'
}

// File extensions to process
const extensions = ['.ts', '.tsx', '.js', '.jsx']

// Directories to process (relative to script location)
const targetDirs = [
  '../apps/frontend/src',
  '../apps/backend/src', 
  '../packages/shared/src'
]

let filesProcessed = 0
let entitiesReplaced = 0

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath)
  return extensions.includes(ext)
}

/**
 * Process a single file
 */
async function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false
    let fileEntitiesReplaced = 0

    // Replace HTML entities
    for (const [entity, replacement] of Object.entries(entityMappings)) {
      const regex = new RegExp(entity, 'g')
      const matches = content.match(regex)
      if (matches) {
        content = content.replace(regex, replacement)
        fileEntitiesReplaced += matches.length
        modified = true
      }
    }

    // Write back if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Fixed ${filePath} (${fileEntitiesReplaced} entities replaced)`)
      filesProcessed++
      entitiesReplaced += fileEntitiesReplaced
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
  }
}

/**
 * Recursively process directory
 */
async function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      await processDirectory(fullPath)
    } else if (entry.isFile() && shouldProcessFile(fullPath)) {
      await processFile(fullPath)
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Starting HTML entity encoding fix...\n')

  const scriptDir = __dirname
  
  for (const targetDir of targetDirs) {
    const fullDirPath = path.resolve(scriptDir, targetDir)
    
    if (fs.existsSync(fullDirPath)) {
      console.log(`📁 Processing directory: ${fullDirPath}`)
      await processDirectory(fullDirPath)
    } else {
      console.log(`⚠️  Directory not found: ${fullDirPath}`)
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   Files processed: ${filesProcessed}`)
  console.log(`   Entities replaced: ${entitiesReplaced}`)

  if (filesProcessed > 0) {
    console.log('\n✅ HTML entity encoding issues have been fixed!')
    console.log('🔄 Running TypeScript compilation check...')
    
    try {
      // Test compilation after fixes
      await execAsync('cd ../apps/frontend && npm run typecheck')
      console.log('✅ TypeScript compilation check passed!')
    } catch (error) {
      console.log('⚠️  TypeScript compilation still has issues:')
      console.log(error.stdout)
      console.log(error.stderr)
    }
  } else {
    console.log('ℹ️  No HTML entities found to replace.')
  }
}

// Run the script
main().catch(console.error)