#!/usr/bin/env node
/**
 * TypeScript Configuration Documentation Generator
 * Compiles all TypeScript configuration files into a single markdown document
 * for efficient review and analysis against official documentation
 */

const fs = require('fs')
const path = require('path')

// Find all TypeScript configuration files
function findTypescriptConfigs(dir = '.', configs = []) {
  const items = fs.readdirSync(dir)
  
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory()) {
      // Skip node_modules, .git, dist, build, out, .next, coverage
      if (!['node_modules', '.git', 'dist', 'build', 'out', '.next', 'coverage', '.turbo', '.vercel', '.railway'].includes(item)) {
        findTypescriptConfigs(fullPath, configs)
      }
    } else if (item.match(/^tsconfig.*\.json$/)) {
      configs.push(fullPath)
    }
  }
  
  return configs
}

// Read and parse TypeScript config file
function readTypescriptConfig(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return {
      path: filePath,
      content: content.trim(),
      // Try to parse to validate JSON
      parsed: JSON.parse(content)
    }
  } catch (error) {
    console.warn(`Warning: Could not parse ${filePath}: ${error.message}`)
    return {
      path: filePath,
      content: fs.readFileSync(filePath, 'utf8').trim(),
      parsed: null,
      error: error.message
    }
  }
}

// Determine workspace name from path
function getWorkspaceName(filePath) {
  const parts = filePath.split(path.sep)
  
  if (parts.includes('apps')) {
    const appsIndex = parts.indexOf('apps')
    return parts[appsIndex + 1] || 'unknown'
  } else if (parts.includes('packages')) {
    const packagesIndex = parts.indexOf('packages')
    return parts[packagesIndex + 1] || 'unknown'
  } else {
    return 'root'
  }
}

// Generate table of contents
function generateTableOfContents(configs) {
  return configs
    .map((config, index) => {
      const workspace = getWorkspaceName(config.path)
      const fileName = path.basename(config.path)
      const anchor = config.path.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      return `${index + 1}. [${config.path}](#${anchor}) - ${workspace}${fileName !== 'tsconfig.json' ? ` (${fileName})` : ''}`
    })
    .join('\n')
}

// Generate markdown for a single config
function generateConfigMarkdown(config) {
  const workspace = getWorkspaceName(config.path)
  const fileName = path.basename(config.path)
  const anchor = config.path.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  
  let markdown = `## ${config.path}\n\n`
  markdown += `**Workspace:** ${workspace}  \n`
  markdown += `**File:** \`${fileName}\`\n`
  
  if (config.error) {
    markdown += `**Error:** ${config.error}\n`
  }
  
  markdown += `\n\`\`\`json\n${config.content}\n\`\`\`\n\n`
  
  return markdown
}

// Main function
function main() {
  console.log('🔍 Finding all TypeScript configuration files...')
  
  const configs = findTypescriptConfigs()
  console.log(`✅ Found ${configs.length} TypeScript configuration file(s)`)
  
  if (configs.length === 0) {
    console.log('No TypeScript configuration files found.')
    return
  }
  
  console.log('📝 Reading and parsing configurations...')
  
  const configData = configs.map(readTypescriptConfig).sort((a, b) => a.path.localeCompare(b.path))
  
  console.log('💾 Writing to all-typescript-configs.md...')
  
  const timestamp = new Date().toISOString()
  
  let markdown = `# All TypeScript Configuration Files\n\n`
  markdown += `**Generated:** ${timestamp}  \n`
  markdown += `**Total Files:** ${configData.length}\n\n`
  markdown += `---\n\n`
  
  // Table of Contents
  markdown += `## Table of Contents\n\n`
  markdown += generateTableOfContents(configData)
  markdown += `\n\n---\n\n`
  
  // Individual configurations
  configData.forEach(config => {
    markdown += generateConfigMarkdown(config)
    markdown += `---\n\n`
  })
  
  const outputPath = 'all-typescript-configs.md'
  fs.writeFileSync(outputPath, markdown)
  
  console.log(`✅ Successfully generated ${path.resolve(outputPath)}`)
}

if (require.main === module) {
  main()
}