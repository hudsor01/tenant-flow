#!/usr/bin/env node

/**
 * Detect legacy Tailwind classes in the codebase.
 * This script should be run in CI to prevent regression.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Common Tailwind class patterns to detect
const tailwindPatterns = [
	// Spacing
	/\b(p|m|px|py|mx|my|pt|pb|pl|pr|mt|mb|ml|mr)-\d+/,
	// Width/Height
	/\b(w|h)-(full|screen|\d+|auto|min|max)/,
	// Display
	/\b(flex|grid|block|inline|hidden)/,
	// Typography
	/\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)/,
	// Colors (Tailwind specific)
	/\b(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/,
	// Layout
	/\b(container|mx-auto)/,
	// Flexbox/Grid
	/\b(justify|items|content|self)-(start|end|center|between|around|evenly)/,
	// Borders
	/\bborder(-\d+)?/,
	// Shadows
	/\bshadow(-sm|-md|-lg|-xl|-2xl|-inner|-none)?/,
	// Rounded
	/\brounded(-sm|-md|-lg|-xl|-2xl|-3xl|-full|-none)?/
]

function detectTailwindClasses(dir) {
	const files = execSync(
		`find ${dir} -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | grep -v node_modules | grep -v .next`,
		{ encoding: 'utf8' }
	)
		.trim()
		.split('\n')
		.filter(Boolean)

	let violations = []

	files.forEach(file => {
		const content = fs.readFileSync(file, 'utf8')
		const lines = content.split('\n')

		lines.forEach((line, index) => {
			// Skip comments and imports
			if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.includes('import ')) {
				return
			}

			// Check for className or class attributes
			const classMatch = line.match(/(?:className|class)=["'{]([^"'}]*)/g)
			if (classMatch) {
				classMatch.forEach(match => {
					tailwindPatterns.forEach(pattern => {
						if (pattern.test(match)) {
							violations.push({
								file,
								line: index + 1,
								content: line.trim(),
								pattern: pattern.toString()
							})
						}
					})
				})
			}
		})
	})

	return violations
}

// Run detection
console.log('🔍 Scanning for Tailwind classes...')
const violations = detectTailwindClasses('src')

if (violations.length > 0) {
	console.error('❌ Found Tailwind classes in the following locations:\n')
	violations.forEach(v => {
		console.error(`  ${v.file}:${v.line}`)
		console.error(`    Pattern: ${v.pattern}`)
		console.error(`    Line: ${v.content}\n`)
	})
	console.error(`\n❌ Found ${violations.length} Tailwind class violations!`)
	console.error('Please convert these to UnoCSS classes or design tokens.\n')
	process.exit(1)
} else {
	console.log('✅ No Tailwind classes detected!')
	process.exit(0)
}