#!/usr/bin/env node

/**
 * Script to update all UI components with design tokens
 * This script will replace hardcoded values with token references
 */

const fs = require('fs')
const path = require('path')

// Token replacements mapping
const tokenReplacements = [
	// Color replacements
	{ from: /text-primary(?!-)/g, to: 'text-[var(--color-label-primary)]' },
	{ from: /text-secondary(?!-)/g, to: 'text-[var(--color-label-secondary)]' },
	{ from: /text-muted-foreground/g, to: 'text-[var(--color-label-tertiary)]' },
	{ from: /bg-primary(?!-)/g, to: 'bg-[var(--color-accent-main)]' },
	{ from: /bg-secondary(?!-)/g, to: 'bg-[var(--color-fill-secondary)]' },
	{ from: /bg-muted/g, to: 'bg-[var(--color-fill-primary)]' },
	{ from: /border-border/g, to: 'border-[var(--color-separator)]' },
	{ from: /border-input/g, to: 'border-[var(--color-separator)]' },

	// Shadow replacements
	{ from: /shadow-xs/g, to: 'shadow-[var(--shadow-xs)]' },
	{ from: /shadow-sm/g, to: 'shadow-[var(--shadow-small)]' },
	{ from: /shadow-md/g, to: 'shadow-[var(--shadow-medium)]' },
	{ from: /shadow-lg/g, to: 'shadow-[var(--shadow-large)]' },
	{ from: /shadow-xl/g, to: 'shadow-[var(--shadow-premium-lg)]' },

	// Radius replacements
	{ from: /rounded-sm/g, to: 'rounded-[var(--radius-small)]' },
	{ from: /rounded-md/g, to: 'rounded-[var(--radius-medium)]' },
	{ from: /rounded-lg/g, to: 'rounded-[var(--radius-large)]' },
	{ from: /rounded-xl/g, to: 'rounded-[var(--radius-xlarge)]' },
	{ from: /rounded-2xl/g, to: 'rounded-[var(--radius-xxlarge)]' },

	// Duration replacements
	{ from: /duration-150/g, to: 'duration-[var(--duration-150)]' },
	{ from: /duration-200/g, to: 'duration-[var(--duration-quick)]' },
	{ from: /duration-300/g, to: 'duration-[var(--duration-standard)]' },
	{ from: /duration-500/g, to: 'duration-[var(--duration-slow)]' },

	// Spacing replacements (common patterns)
	{ from: /\bp-2\b/g, to: 'p-[var(--spacing-2)]' },
	{ from: /\bp-3\b/g, to: 'p-[var(--spacing-3)]' },
	{ from: /\bp-4\b/g, to: 'p-[var(--spacing-4)]' },
	{ from: /\bp-6\b/g, to: 'p-[var(--spacing-6)]' },
	{ from: /\bgap-2\b/g, to: 'gap-[var(--spacing-2)]' },
	{ from: /\bgap-3\b/g, to: 'gap-[var(--spacing-3)]' },
	{ from: /\bgap-4\b/g, to: 'gap-[var(--spacing-4)]' },
	{ from: /\bgap-6\b/g, to: 'gap-[var(--spacing-6)]' },

	// Focus ring replacements
	{
		from: /focus-visible:ring-ring/g,
		to: 'focus-visible:ring-[var(--focus-ring-color)]'
	},
	{
		from: /focus-visible:ring-2/g,
		to: 'focus-visible:ring-[var(--focus-ring-width)]'
	},
	{
		from: /focus-visible:ring-offset-2/g,
		to: 'focus-visible:ring-offset-[var(--focus-ring-offset)]'
	}
]

// Components directory
const componentsDir = path.join(__dirname, '../src/components/ui')

// Function to process a file
function processFile(filePath) {
	try {
		let content = fs.readFileSync(filePath, 'utf8')
		let modified = false

		// Apply token replacements
		tokenReplacements.forEach(({ from, to }) => {
			const originalContent = content
			content = content.replace(from, to)
			if (content !== originalContent) {
				modified = true
			}
		})

		// Add data-tokens attribute to component roots
		if (!content.includes('data-tokens=')) {
			// Add data-tokens attribute to main component elements
			content = content.replace(
				/className={cn\(/g,
				'data-tokens="applied" className={cn('
			)
			modified = true
		}

		if (modified) {
			fs.writeFileSync(filePath, content, 'utf8')
			console.log(`✅ Updated: ${path.basename(filePath)}`)
			return true
		}

		return false
	} catch (error) {
		console.error(`❌ Error processing ${filePath}:`, error.message)
		return false
	}
}

// Function to process all components
function processAllComponents() {
	console.log('🎨 Updating UI components with design tokens...\n')

	if (!fs.existsSync(componentsDir)) {
		console.error(`❌ Components directory not found: ${componentsDir}`)
		process.exit(1)
	}

	const files = fs
		.readdirSync(componentsDir)
		.filter(file => file.endsWith('.tsx'))

	console.log(`Found ${files.length} component files\n`)

	let updatedCount = 0

	files.forEach(file => {
		const filePath = path.join(componentsDir, file)
		if (processFile(filePath)) {
			updatedCount++
		}
	})

	console.log(
		`\n✨ Updated ${updatedCount} out of ${files.length} components with design tokens`
	)
}

// Run the script
if (require.main === module) {
	processAllComponents()
}

module.exports = { processFile, processAllComponents }
