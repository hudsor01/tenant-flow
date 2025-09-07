#!/usr/bin/env node

/**
 * ESLint Coverage Validation Script
 * Ensures ESLint is checking ALL directories and files in the monorepo
 */

const { execSync } = require('child_process')
const { existsSync, readdirSync, statSync, readFileSync } = require('fs')
const { join, relative, extname } = require('path')

// Colors for output
const colors = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	gray: '\x1b[90m',
	bold: '\x1b[1m'
}

const log = {
	success: msg => console.log(`${colors.green}PASS${colors.reset} ${msg}`),
	error: msg => console.log(`${colors.red}FAIL${colors.reset} ${msg}`),
	warning: msg => console.log(`${colors.yellow}WARN${colors.reset} ${msg}`),
	info: msg => console.log(`${colors.blue}INFO${colors.reset} ${msg}`),
	section: msg =>
		console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`),
	gray: msg => console.log(`${colors.gray}  ${msg}${colors.reset}`)
}

// File extensions that should be linted
const LINTABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

// Directories to ignore
const IGNORE_DIRS = [
	'node_modules',
	'.git',
	'.next',
	'.turbo',
	'dist',
	'build',
	'coverage',
	'.nyc_output',
	'storybook-static',
	'.vercel',
	'.swc',
	'public',
	'test-results'
]

// Known test file patterns
const TEST_PATTERNS = [
	'.test.ts',
	'.test.tsx',
	'.spec.ts',
	'.spec.tsx',
	'.test.js',
	'.spec.js',
	'e2e-spec.ts',
	'__tests__',
	'__mocks__'
]

class ESLintCoverageChecker {
	constructor() {
		this.stats = {
			totalDirs: 0,
			totalFiles: 0,
			lintedDirs: new Set(),
			lintedFiles: new Set(),
			missedDirs: new Set(),
			missedFiles: new Set(),
			ignoredDirs: new Set(),
			testFiles: new Set(),
			configErrors: []
		}
	}

	/**
	 * Get all directories recursively
	 */
	getAllDirs(dir, baseDir = dir) {
		const dirs = []

		try {
			const items = readdirSync(dir)

			for (const item of items) {
				const fullPath = join(dir, item)
				const relativePath = relative(baseDir, fullPath)

				// Skip ignored directories
				if (
					IGNORE_DIRS.some(
						ignore =>
							item === ignore || relativePath.includes(ignore)
					)
				) {
					this.stats.ignoredDirs.add(relativePath)
					continue
				}

				if (statSync(fullPath).isDirectory()) {
					dirs.push(fullPath)
					dirs.push(...this.getAllDirs(fullPath, baseDir))
				}
			}
		} catch (e) {
			// Ignore permission errors
		}

		return dirs
	}

	/**
	 * Get all lintable files in a directory
	 */
	getLintableFiles(dir, baseDir = dir) {
		const files = []

		try {
			const items = readdirSync(dir)

			for (const item of items) {
				const fullPath = join(dir, item)
				const relativePath = relative(baseDir, fullPath)

				if (statSync(fullPath).isFile()) {
					const ext = extname(item)
					if (LINTABLE_EXTENSIONS.includes(ext)) {
						files.push(fullPath)

						// Track test files separately
						if (
							TEST_PATTERNS.some(
								pattern =>
									item.includes(pattern) ||
									relativePath.includes(pattern)
							)
						) {
							this.stats.testFiles.add(relativePath)
						}
					}
				}
			}
		} catch (e) {
			// Ignore permission errors
		}

		return files
	}

	/**
	 * Check what ESLint will actually lint
	 */
	checkESLintCoverage(targetDir, configFile) {
		const relativePath = relative(process.cwd(), targetDir)
		log.section(`Checking: ${relativePath || 'root'}`)

		try {
			// Use ESLint to list files it would lint
			const cmd = configFile
				? `npx eslint ${targetDir} --config ${configFile} --format json --no-error-on-unmatched-pattern`
				: `npx eslint ${targetDir} --format json --no-error-on-unmatched-pattern`

			const output = execSync(cmd, {
				encoding: 'utf8',
				stdio: 'pipe',
				maxBuffer: 10 * 1024 * 1024 // 10MB buffer
			})

			let results
			try {
				results = JSON.parse(output)
			} catch (e) {
				// Sometimes ESLint outputs non-JSON when there are config errors
				if (output.includes('Oops!') || output.includes('Error')) {
					this.stats.configErrors.push(
						`${relativePath}: Configuration error`
					)
					log.error(`Configuration error in ${relativePath}`)
					return
				}
				results = []
			}

			// Track linted files
			results.forEach(result => {
				const filePath = relative(process.cwd(), result.filePath)
				this.stats.lintedFiles.add(filePath)

				const dirPath = relative(
					process.cwd(),
					join(result.filePath, '..')
				)
				this.stats.lintedDirs.add(dirPath)
			})

			log.success(`Found ${results.length} files`)
		} catch (error) {
			if (error.stdout) {
				try {
					const results = JSON.parse(error.stdout.toString())
					results.forEach(result => {
						const filePath = relative(
							process.cwd(),
							result.filePath
						)
						this.stats.lintedFiles.add(filePath)
					})
					log.warning(`Linted with errors: ${results.length} files`)
				} catch (e) {
					log.error(
						`Failed to check ${relativePath}: ${error.message}`
					)
				}
			} else {
				log.error(`Failed to check ${relativePath}: ${error.message}`)
			}
		}
	}

	/**
	 * Analyze coverage for a workspace
	 */
	analyzeWorkspace(workspacePath, name) {
		log.section(`\nPACKAGE: ${name}`)

		// Get all directories and files
		const allDirs = this.getAllDirs(workspacePath, process.cwd())
		const allFiles = []

		allDirs.forEach(dir => {
			const files = this.getLintableFiles(dir, process.cwd())
			allFiles.push(...files)
		})

		// Add to total stats
		allDirs.forEach(dir => {
			const relativePath = relative(process.cwd(), dir)
			this.stats.totalDirs++
		})

		allFiles.forEach(file => {
			const relativePath = relative(process.cwd(), file)
			this.stats.totalFiles++
		})

		log.info(`Total directories: ${allDirs.length}`)
		log.info(`Total lintable files: ${allFiles.length}`)

		// Check ESLint coverage
		this.checkESLintCoverage(workspacePath, null)

		// Find missed files
		const missedInWorkspace = allFiles.filter(file => {
			const relativePath = relative(process.cwd(), file)
			return !this.stats.lintedFiles.has(relativePath)
		})

		if (missedInWorkspace.length > 0) {
			log.warning(`Missed ${missedInWorkspace.length} files:`)
			missedInWorkspace.slice(0, 10).forEach(file => {
				const relativePath = relative(process.cwd(), file)
				this.stats.missedFiles.add(relativePath)
				log.gray(relativePath)
			})
			if (missedInWorkspace.length > 10) {
				log.gray(`... and ${missedInWorkspace.length - 10} more`)
			}
		}
	}

	/**
	 * Run the full coverage check
	 */
	run() {
		console.log(
			colors.bold +
				colors.blue +
				`
╔════════════════════════════════════════════════╗
║     ESLint Coverage Validation Report          ║
╚════════════════════════════════════════════════╝
` +
				colors.reset
		)

		// Check main workspaces
		const workspaces = [
			{ path: './apps/frontend', name: 'Frontend (Next.js)' },
			{ path: './apps/backend', name: 'Backend (NestJS)' },
			{ path: './apps/storybook', name: 'Storybook' },
			{ path: './packages/shared', name: 'Shared Package' },
			{ path: './packages/database', name: 'Database Package' },
			{ path: './packages/eslint-config', name: 'ESLint Config' },
			{ path: './packages/typescript-config', name: 'TypeScript Config' },
			{ path: './packages/tailwind-config', name: 'Tailwind Config' }
		]

		workspaces.forEach(workspace => {
			if (existsSync(workspace.path)) {
				this.analyzeWorkspace(workspace.path, workspace.name)
			}
		})

		// Generate report
		this.generateReport()
	}

	/**
	 * Generate coverage report
	 */
	generateReport() {
		log.section('\nSTATS: COVERAGE SUMMARY')
		console.log('═'.repeat(50))

		const totalFilesChecked = this.stats.lintedFiles.size
		const totalFilesMissed = this.stats.missedFiles.size
		const coveragePercent =
			Math.round((totalFilesChecked / this.stats.totalFiles) * 100) || 0

		console.log(`
${colors.bold}File Coverage:${colors.reset}
  Total Files: ${this.stats.totalFiles}
  Files Linted: ${colors.green}${totalFilesChecked}${colors.reset}
  Files Missed: ${totalFilesMissed > 0 ? colors.red : colors.green}${totalFilesMissed}${colors.reset}
  Test Files: ${this.stats.testFiles.size}
  Coverage: ${coveragePercent >= 90 ? colors.green : coveragePercent >= 70 ? colors.yellow : colors.red}${coveragePercent}%${colors.reset}

${colors.bold}Directory Coverage:${colors.reset}
  Total Directories: ${this.stats.totalDirs}
  Directories with Linted Files: ${this.stats.lintedDirs.size}
  Ignored Directories: ${this.stats.ignoredDirs.size}
`)

		if (this.stats.configErrors.length > 0) {
			log.section('WARNING: Configuration Errors')
			this.stats.configErrors.forEach(error => log.error(error))
		}

		if (this.stats.missedFiles.size > 0) {
			log.section('ERROR: Missed Files (Top 20)')
			Array.from(this.stats.missedFiles)
				.slice(0, 20)
				.forEach(file => {
					log.error(file)
				})
		}

		// Check specific important directories
		log.section('TARGET: Critical Directory Coverage')
		const criticalDirs = [
			'apps/frontend/src/app',
			'apps/frontend/src/components',
			'apps/frontend/src/hooks',
			'apps/frontend/src/lib',
			'apps/backend/src/auth',
			'apps/backend/src/billing',
			'apps/backend/src/stripe',
			'apps/backend/src/shared',
			'packages/shared/src/types',
			'packages/shared/src/validation'
		]

		criticalDirs.forEach(dir => {
			const hasLintedFiles = Array.from(this.stats.lintedFiles).some(
				file => file.startsWith(dir)
			)
			if (hasLintedFiles) {
				log.success(`${dir}`)
			} else if (existsSync(dir)) {
				log.error(`${dir} - NOT COVERED!`)
			} else {
				log.gray(`${dir} - does not exist`)
			}
		})

		// Recommendations
		log.section('TIP: Recommendations')
		if (coveragePercent < 100) {
			console.log(`
1. Check if missed files are in .eslintignore or ignore patterns
2. Verify ESLint config includes all file extensions: ${LINTABLE_EXTENSIONS.join(', ')}
3. Ensure test files are included in tsconfig.json
4. Check for configuration errors in specific workspaces
`)
		}

		if (coveragePercent >= 95) {
			log.success(
				'Excellent coverage! ESLint is checking almost all files.'
			)
		} else if (coveragePercent >= 80) {
			log.warning('Good coverage, but some files are being missed.')
		} else {
			log.error('Poor coverage - many files are not being linted!')
		}

		// Save detailed report
		const report = {
			timestamp: new Date().toISOString(),
			coverage: {
				percentage: coveragePercent,
				totalFiles: this.stats.totalFiles,
				lintedFiles: totalFilesChecked,
				missedFiles: totalFilesMissed
			},
			missedFiles: Array.from(this.stats.missedFiles),
			configErrors: this.stats.configErrors,
			testFiles: Array.from(this.stats.testFiles)
		}

		try {
			require('fs').writeFileSync(
				'./eslint-coverage-report.json',
				JSON.stringify(report, null, 2)
			)
			console.log(
				`\n${colors.blue}Detailed report saved to eslint-coverage-report.json${colors.reset}`
			)
		} catch (e) {
			// Silent fail
		}
	}
}

// Run the checker
const checker = new ESLintCoverageChecker()
checker.run()
