#!/usr/bin/env tsx
/**
 * API Route Audit Script
 *
 * Purpose: Maps frontend API routes to backend endpoints and identifies:
 * 1. Active connections (frontend → backend)
 * 2. Orphaned frontend routes (no backend endpoint)
 * 3. Orphaned backend endpoints (no frontend route)
 * 4. Unused/commented routes
 *
 * Usage: tsx scripts/audit-api-routes.ts
 */

import { readFileSync } from 'node:fs'

// ANSI color codes for terminal output
const colors = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	bold: '\x1b[1m'
}

interface Route {
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
	path: string
	source: string
	line?: number
}

interface FrontendRoute extends Route {
	apiName: string
	functionName: string
}

interface BackendRoute extends Route {
	controller: string
	decorator: string
}

class ApiAudit {
	private frontendRoutes: FrontendRoute[] = []
	private backendRoutes: BackendRoute[] = []
	private readonly apiClientPath = 'apps/frontend/src/lib/api-client.ts'

	async run() {
		console.log(
			`${colors.bold}${colors.cyan}🔍 TenantFlow API Route Audit${colors.reset}\n`
		)

		// Step 1: Extract frontend routes
		console.log(
			`${colors.blue}📱 Analyzing frontend API routes...${colors.reset}`
		)
		this.extractFrontendRoutes()
		console.log(
			`   Found ${colors.green}${this.frontendRoutes.length}${colors.reset} frontend API calls\n`
		)

		// Step 2: Extract backend routes
		console.log(
			`${colors.blue}🖥️  Analyzing backend endpoints...${colors.reset}`
		)
		await this.extractBackendRoutes()
		console.log(
			`   Found ${colors.green}${this.backendRoutes.length}${colors.reset} backend endpoints\n`
		)

		// Step 3: Map connections
		console.log(`${colors.blue}🔗 Mapping connections...${colors.reset}\n`)
		this.mapConnections()

		// Step 4: Find orphans
		console.log(
			`\n${colors.blue}🔍 Identifying orphaned routes...${colors.reset}\n`
		)
		this.findOrphans()

		// Step 5: Summary
		this.printSummary()
	}

	private extractFrontendRoutes() {
		const content = readFileSync(this.apiClientPath, 'utf-8')
		const lines = content.split('\n')

		// Pattern: apiClient<Type>(`${API_BASE_URL}/path`)
		const routePattern =
			/apiClient(?:<[^>]+>)?\(\s*`\$\{API_BASE_URL\}\/([^`]+)`(?:,\s*\{[^}]*method:\s*['"](\w+)['"])?/

		let currentApi = ''
		let currentFunction = ''

		lines.forEach((line, index) => {
			// Track which API object we're in
			const apiMatch = line.match(/export const (\w+)Api = \{/)
			if (apiMatch) {
				currentApi = apiMatch[1]
			}

			// Track which function we're in
			const funcMatch = line.match(/^\s*(\w+):\s*\([^)]*\)\s*=>/)
			if (funcMatch) {
				currentFunction = funcMatch[1]
			}

			// Extract route
			const match = line.match(routePattern)
			if (match && match[1]) {
				const path = match[1]
				const method = match[2] || 'GET'
				this.frontendRoutes.push({
					method: method.toUpperCase() as FrontendRoute['method'],
					path: this.normalizePath(path),
					source: this.apiClientPath,
					line: index + 1,
					apiName: currentApi,
					functionName: currentFunction
				})
			}
		})
	}

	private async extractBackendRoutes() {
		const { execSync } = await import('node:child_process')

		// Find all controllers
		const controllers = execSync(
			'find apps/backend/src -name "*.controller.ts" -type f',
			{ encoding: 'utf-8' }
		)
			.trim()
			.split('\n')

		for (const controllerPath of controllers) {
			const content = readFileSync(controllerPath, 'utf-8')
			const lines = content.split('\n')

			// Extract @Controller('path')
			const controllerMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/)
			const basePath = controllerMatch ? controllerMatch[1] : ''

			let currentMethod: BackendRoute['method'] | null = null
			let currentPath = ''

			lines.forEach((line, index) => {
				// Match HTTP decorators: @Get(), @Post('path'), etc.
				const decoratorMatch = line.match(
					/@(Get|Post|Put|Patch|Delete)\((?:['"]([^'"]+)['"])?\)/i
				)
				if (decoratorMatch && decoratorMatch[1]) {
					currentMethod =
						decoratorMatch[1].toUpperCase() as BackendRoute['method']
					currentPath = decoratorMatch[2] || ''

					const fullPath = this.buildBackendPath(basePath, currentPath)

					this.backendRoutes.push({
						method: currentMethod,
						path: fullPath,
						source: controllerPath,
						line: index + 1,
						controller: basePath,
						decorator: decoratorMatch[0]
					})
				}
			})
		}
	}

	private buildBackendPath(controller: string, route: string): string {
		// Backend has global prefix: api/v1
		const parts = ['api/v1', controller, route].filter(Boolean)
		return this.normalizePath(parts.join('/'))
	}

	private normalizePath(path: string): string {
		// Remove query params, normalize slashes, parameter patterns
		return (
			path
				.replace(/\?.+$/, '') // Remove query strings
				.replace(/\$\{[^}]+\}/g, ':param') // Template literals → :param
				.replace(/\/+/g, '/') // Multiple slashes → single
				.replace(/\/:id/g, '/:param') // :id → :param for consistency
				// biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
				.replace(/[\n\r]/g, '') // Remove newlines
				.trim()
		)
	}

	private mapConnections() {
		let matchedCount = 0

		for (const frontendRoute of this.frontendRoutes) {
			const matches = this.backendRoutes.filter(
				backend =>
					backend.method === frontendRoute.method &&
					this.pathsMatch(backend.path, frontendRoute.path)
			)

			if (matches.length > 0 && matches[0]) {
				matchedCount++
				console.log(
					`${colors.green}✓${colors.reset} ${frontendRoute.method.padEnd(6)} ${frontendRoute.path}`
				)
				console.log(
					`  ${colors.cyan}Frontend:${colors.reset} ${frontendRoute.apiName}.${frontendRoute.functionName}()`
				)
				console.log(
					`  ${colors.cyan}Backend:${colors.reset}  ${matches[0].controller} (${matches[0].source})`
				)
				console.log()
			}
		}

		console.log(
			`${colors.bold}Matched: ${matchedCount}/${this.frontendRoutes.length} routes${colors.reset}`
		)
	}

	private pathsMatch(backendPath: string, frontendPath: string): boolean {
		// Normalize both paths for comparison
		const normBackend = backendPath.replace(/:param/g, '[PARAM]')
		const normFrontend = frontendPath.replace(/:param/g, '[PARAM]')

		return normBackend === normFrontend
	}

	private findOrphans() {
		// Orphaned frontend routes (no backend)
		const orphanedFrontend = this.frontendRoutes.filter(frontend => {
			return !this.backendRoutes.some(
				backend =>
					backend.method === frontend.method &&
					this.pathsMatch(backend.path, frontend.path)
			)
		})

		if (orphanedFrontend.length > 0) {
			console.log(
				`${colors.yellow}⚠️  Orphaned Frontend Routes (no backend endpoint):${colors.reset}`
			)
			for (const route of orphanedFrontend) {
				console.log(
					`   ${colors.red}✗${colors.reset} ${route.method.padEnd(6)} ${route.path}`
				)
				console.log(
					`     ${colors.cyan}Source:${colors.reset} ${route.apiName}.${route.functionName}() (${route.source}:${route.line})`
				)
			}
			console.log()
		} else {
			console.log(
				`${colors.green}✓ No orphaned frontend routes${colors.reset}\n`
			)
		}

		// Orphaned backend routes (no frontend)
		const orphanedBackend = this.backendRoutes.filter(backend => {
			// Skip health/status endpoints
			if (backend.path.includes('health') || backend.path.includes('status')) {
				return false
			}

			return !this.frontendRoutes.some(
				frontend =>
					frontend.method === backend.method &&
					this.pathsMatch(backend.path, frontend.path)
			)
		})

		if (orphanedBackend.length > 0) {
			console.log(
				`${colors.yellow}⚠️  Orphaned Backend Endpoints (no frontend usage):${colors.reset}`
			)
			for (const route of orphanedBackend) {
				console.log(
					`   ${colors.red}✗${colors.reset} ${route.method.padEnd(6)} ${route.path}`
				)
				console.log(
					`     ${colors.cyan}Source:${colors.reset} ${route.controller} (${route.source}:${route.line})`
				)
			}
			console.log()
		} else {
			console.log(
				`${colors.green}✓ No orphaned backend endpoints${colors.reset}\n`
			)
		}
	}

	private printSummary() {
		console.log(`\n${colors.bold}${colors.cyan}📊 Summary${colors.reset}`)
		console.log(`${'─'.repeat(50)}`)
		console.log(
			`Frontend routes:  ${colors.green}${this.frontendRoutes.length}${colors.reset}`
		)
		console.log(
			`Backend endpoints: ${colors.green}${this.backendRoutes.length}${colors.reset}`
		)

		const matched = this.frontendRoutes.filter(frontend =>
			this.backendRoutes.some(
				backend =>
					backend.method === frontend.method &&
					this.pathsMatch(backend.path, frontend.path)
			)
		).length

		const orphanedFrontend = this.frontendRoutes.length - matched
		const orphanedBackend = this.backendRoutes.filter(backend => {
			if (backend.path.includes('health') || backend.path.includes('status')) {
				return false
			}
			return !this.frontendRoutes.some(
				frontend =>
					frontend.method === backend.method &&
					this.pathsMatch(backend.path, frontend.path)
			)
		}).length

		console.log(`Matched connections: ${colors.green}${matched}${colors.reset}`)
		console.log(
			`Orphaned frontend: ${orphanedFrontend > 0 ? colors.red : colors.green}${orphanedFrontend}${colors.reset}`
		)
		console.log(
			`Orphaned backend:  ${orphanedBackend > 0 ? colors.yellow : colors.green}${orphanedBackend}${colors.reset}`
		)
		console.log(`${'─'.repeat(50)}`)

		// Health check
		if (orphanedFrontend === 0 && orphanedBackend === 0) {
			console.log(
				`\n${colors.green}${colors.bold}✓ All routes are connected!${colors.reset}`
			)
		} else {
			console.log(
				`\n${colors.yellow}⚠️  Action needed: Review orphaned routes${colors.reset}`
			)
		}
	}
}

// Run the audit
const audit = new ApiAudit()
audit.run().catch(console.error)
