#!/usr/bin/env node

/**
 * Fix React Entity Issues
 * 
 * This script fixes React ESLint errors related to unescaped entities in JSX.
 * It handles quotes that appear within JSX text content that need to be escaped.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// File extensions to process
const extensions = ['.tsx', '.jsx']

// Directories to process
const targetDirs = [
  '../apps/frontend/src'
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
 * Fix unescaped entities in React components
 * This handles quotes within JSX text content
 */
function fixReactEntities(content) {
  let modified = false
  let replacements = 0

  // Replace problematic patterns in JSX text content
  // Look for single quotes within JSX text (but not in attributes or strings)
  
  // Pattern 1: Text content with single quotes (between > and <)
  content = content.replace(/>(([^<>]*?)'([^<>]*?))</g, (match, before, quote, after, closeTag) => {
    // Don't replace if it's already an entity or in a code block
    if (before.includes('&') || match.includes('`') || match.includes('code')) {
      return match
    }
    replacements++
    return `>${before}&apos;${after}<`
  })

  // Pattern 2: Text content with double quotes (between > and <)
  content = content.replace(/>(([^<>]*?)"([^<>]*?))</g, (match, before, quote, after, closeTag) => {
    // Don't replace if it's already an entity or in a code block  
    if (before.includes('&') || match.includes('`') || match.includes('code')) {
      return match
    }
    replacements++
    return `>${before}&quot;${after}<`
  })

  // Pattern 3: Handle specific common cases
  const specificPatterns = [
    // Common contractions in JSX text
    {
      pattern: />([^<]*?)we're([^<]*?)</g,
      replacement: '>$1we&apos;re$2<'
    },
    {
      pattern: />([^<]*?)don't([^<]*?)</g, 
      replacement: '>$1don&apos;t$2<'
    },
    {
      pattern: />([^<]*?)can't([^<]*?)</g,
      replacement: '>$1can&apos;t$2<'
    },
    {
      pattern: />([^<]*?)won't([^<]*?)</g,
      replacement: '>$1won&apos;t$2<'
    },
    {
      pattern: />([^<]*?)it's([^<]*?)</g,
      replacement: '>$1it&apos;s$2<'
    },
    {
      pattern: />([^<]*?)you're([^<]*?)</g,
      replacement: '>$1you&apos;re$2<'
    },
    {
      pattern: />([^<]*?)that's([^<]*?)</g,
      replacement: '>$1that&apos;s$2<'
    },
    {
      pattern: />([^<]*?)let's([^<]*?)</g,
      replacement: '>$1let&apos;s$2<'
    }
  ]

  for (const { pattern, replacement } of specificPatterns) {
    const beforeReplace = content
    content = content.replace(pattern, replacement)
    if (content !== beforeReplace) {
      const matches = beforeReplace.match(pattern)
      if (matches) {
        replacements += matches.length
        modified = true
      }
    }
  }

  return { content, replacements: replacements > 0 ? replacements : (modified ? 1 : 0) }
}

/**
 * Process a single file
 */
async function processFile(filePath) {
  try {
    const originalContent = fs.readFileSync(filePath, 'utf8')
    const { content: newContent, replacements } = fixReactEntities(originalContent)

    if (newContent !== originalContent && replacements > 0) {
      fs.writeFileSync(filePath, newContent, 'utf8')
      console.log(`✅ Fixed ${filePath} (${replacements} entities fixed)`)
      filesProcessed++
      entitiesReplaced += replacements
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
  console.log('🔧 Starting React entity encoding fix...\n')

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
  console.log(`   Entities fixed: ${entitiesReplaced}`)

  if (filesProcessed > 0) {
    console.log('\n✅ React entity encoding issues have been fixed!')
  } else {
    console.log('ℹ️  No React entity issues found to fix.')
  }
}

// Run the script
main().catch(console.error)