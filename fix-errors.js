#!/usr/bin/env node
/**
 * Ultra-simple error fix script
 * Replaces all generic Error throws with proper NestJS exceptions
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Find all files with generic Error throws
const files = execSync(
	'rg "throw new Error" /Users/richard/Developer/tenant-flow/apps/backend/src --type ts -l',
	{ encoding: 'utf-8' }
)
	.split('\n')
	.filter(f => f.trim())

const fixes = [
	{
		pattern: /throw new Error\('User not found'\)/g,
		replacement: "throw new NotFoundException('User not found')"
	},
	{
		pattern: /throw new Error\('Failed to ([^']+)'\)/g,
		replacement: "throw new InternalServerErrorException('Failed to $1')"
	},
	{
		pattern: /throw new Error\('Invalid ([^']+)'\)/g,
		replacement: "throw new BadRequestException('Invalid $1')"
	},
	{
		pattern: /throw new Error\('No ([^']+)'\)/g,
		replacement: "throw new BadRequestException('No $1')"
	},
	{
		pattern: /throw new Error\('([^']*authorization[^']*)'\)/gi,
		replacement: "throw new UnauthorizedException('$1')"
	},
	{
		pattern: /throw new Error\('([^']*customer[^']*)'\)/gi,
		replacement: "throw new NotFoundException('$1')"
	},
	{
		pattern: /throw new Error\('([^']*required[^']*)'\)/gi,
		replacement: "throw new BadRequestException('$1')"
	}
]

const imports = [
	'NotFoundException',
	'BadRequestException',
	'UnauthorizedException',
	'InternalServerErrorException'
]

files.forEach(filePath => {
	if (!fs.existsSync(filePath)) return

	let content = fs.readFileSync(filePath, 'utf-8')
	let changed = false

	// Apply fixes
	fixes.forEach(({ pattern, replacement }) => {
		if (pattern.test(content)) {
			content = content.replace(pattern, replacement)
			changed = true
		}
	})

	if (changed) {
		// Add missing imports
		const existingImports =
			content.match(/@nestjs\/common['"]/)?.[0] || null
		if (existingImports) {
			const importMatch = content.match(
				/import\s*{([^}]+)}\s*from\s*'@nestjs\/common'/
			)
			if (importMatch) {
				const currentImports = importMatch[1]
					.split(',')
					.map(i => i.trim())
				const missingImports = imports.filter(
					imp => !currentImports.includes(imp)
				)

				if (missingImports.length > 0) {
					const newImports = [
						...currentImports,
						...missingImports
					].join(', ')
					content = content.replace(
						importMatch[0],
						`import { ${newImports} } from '@nestjs/common'`
					)
				}
			}
		}

		fs.writeFileSync(filePath, content)
		console.log(`Fixed: ${filePath}`)
	}
})

console.log('All error patterns fixed!')
