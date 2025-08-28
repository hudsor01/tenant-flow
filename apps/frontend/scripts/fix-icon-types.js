#!/usr/bin/env node

/**
 * Fix Icon Type Errors
 * 
 * Replaces remaining icon component references that weren't caught by the migration
 * with UnoCSS icon classes
 */

const fs = require('fs').promises
const path = require('path')
const { glob } = require('glob')

// Additional icon mappings for missed cases
const additionalIconMap = {
	'DollarSign': 'i-lucide-dollar-sign',
	'Building': 'i-lucide-building',
	'Building2': 'i-lucide-building-2',
	'Users': 'i-lucide-users',
	'BarChart3': 'i-lucide-bar-chart-3',
	'Target': 'i-lucide-target',
	'Zap': 'i-lucide-zap',
	'Heart': 'i-lucide-heart',
	'Shield': 'i-lucide-shield',
	'Award': 'i-lucide-award',
	'Mail': 'i-lucide-mail',
	'Phone': 'i-lucide-phone',
	'MessageCircle': 'i-lucide-message-circle',
	'HeadphonesIcon': 'i-lucide-headphones',
	'CreditCard': 'i-lucide-credit-card',
	'FileText': 'i-lucide-file-text',
	'Wrench': 'i-lucide-wrench',
	'Smartphone': 'i-lucide-smartphone',
	'Clock': 'i-lucide-clock',
	'BookOpen': 'i-lucide-book-open',
	'Video': 'i-lucide-video',
	'Download': 'i-lucide-download',
	'Code': 'i-lucide-code',
	'Lightbulb': 'i-lucide-lightbulb',
	'PlayCircle': 'i-lucide-play-circle'
}

async function fixIconReferences(filePath) {
	try {
		let content = await fs.readFile(filePath, 'utf-8')
		let modified = false
		const changes = []
		
		for (const [iconName, iconClass] of Object.entries(additionalIconMap)) {
			// Pattern 1: <IconName className="..." />
			const selfClosingRegex = new RegExp(`<${iconName}\\s+([^>]*?)\\s*/>`, 'g')
			if (selfClosingRegex.test(content)) {
				content = content.replace(selfClosingRegex, (match, attrs) => {
					// Extract className if it exists
					const classMatch = attrs.match(/className=["']([^"']+)["']/)
					const existingClasses = classMatch ? classMatch[1] : ''
					const otherAttrs = attrs.replace(/className=["'][^"']+["']/, '').trim()
					
					const newClasses = `${iconClass} inline-block ${existingClasses}`.trim()
					return `<i className="${newClasses}" ${otherAttrs} />`
				})
				modified = true
				changes.push(`Fixed ${iconName} self-closing usage`)
			}
			
			// Pattern 2: <IconName></IconName>
			const openCloseRegex = new RegExp(`<${iconName}>\\s*</${iconName}>`, 'g')
			if (openCloseRegex.test(content)) {
				content = content.replace(openCloseRegex, `<i className="${iconClass} inline-block" />`)
				modified = true
				changes.push(`Fixed ${iconName} open/close usage`)
			}
			
			// Pattern 3: {IconName} (as JSX expression)
			const jsxRegex = new RegExp(`{${iconName}}`, 'g')
			if (jsxRegex.test(content)) {
				content = content.replace(jsxRegex, `<i className="${iconClass} inline-block" />`)
				modified = true
				changes.push(`Fixed ${iconName} JSX expression`)
			}
		}
		
		// Write back the file if modified
		if (modified) {
			await fs.writeFile(filePath, content, 'utf-8')
		}
		
		return { 
			filePath, 
			modified, 
			changes
		}
		
	} catch (error) {
		return { filePath, error: error.message }
	}
}

async function main() {
	console.log('🔧 Fixing Icon Type Errors')
	console.log('===========================\n')
	
	// Find all TypeScript files with potential icon errors
	const files = await glob('src/**/*.{ts,tsx}', {
		cwd: path.resolve(__dirname, '..'),
		absolute: true,
		ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
	})
	
	console.log(`📁 Found ${files.length} files to check\n`)
	
	let fixed = 0
	let errors = 0
	
	for (const file of files) {
		const result = await fixIconReferences(file)
		
		if (result.error) {
			errors++
			console.log(`❌ Error: ${path.basename(result.filePath)} - ${result.error}`)
		} else if (result.modified) {
			fixed++
			console.log(`✅ Fixed: ${path.basename(result.filePath)}`)
			result.changes.forEach(change => {
				console.log(`   - ${change}`)
			})
		}
	}
	
	console.log('\n===========================')
	console.log('🎉 Icon Fix Complete!')
	console.log('===========================')
	console.log(`✅ Files fixed: ${fixed}`)
	if (errors > 0) {
		console.log(`❌ Errors: ${errors}`)
	}
}

// Run the script
main().catch(console.error)