import { defineConfig } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	authSetupProject,
	baseConfig,
	productionProject,
	smokeProjects,
	stagingProject
} from './apps/e2e-tests/playwright.config.base'

// Default NODE_ENV for deterministic Playwright behaviour
if (!process.env.NODE_ENV) {
	;(process.env as { NODE_ENV?: string }).NODE_ENV = 'development'
}

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url))
const TEST_DIR =
	baseConfig.testDir ?? path.join(ROOT_DIR, 'apps/e2e-tests/tests')

// Build projects array with auth setup first
const projects = [
	authSetupProject, // Always run auth setup first
	...smokeProjects
]

// Conditionally add staging/production projects
if (process.env.PLAYWRIGHT_INCLUDE_STAGING === 'true') {
	projects.push(stagingProject)
}
if (process.env.PLAYWRIGHT_INCLUDE_PROD === 'true') {
	projects.push(productionProject)
}

export default defineConfig({
	...baseConfig,
	testDir: TEST_DIR,

	// Ignore frontend test files (these are not E2E tests)
	testIgnore: ['**/apps/frontend/tests/**', '**/node_modules/**'],

	// Project-specific settings
	projects,

	// Base URL depends on environment
	use: {
		...baseConfig.use,
		baseURL: process.env.CI
			? 'https://tenantflow.app'
			: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
		ignoreHTTPSErrors: true,
		extraHTTPHeaders: {
			...(process.env.E2E_API_TOKEN
				? { Authorization: process.env.E2E_API_TOKEN }
				: {})
		}
	},

	// Auto-start web server in local development
	// Allow overriding port via PLAYWRIGHT_PORT so local dev machines can choose a different port
	webServer: process.env.CI
		? undefined // Don't start server in CI (already running)
		: (() => {
				const port = process.env.PLAYWRIGHT_PORT || '3000'
				const url =
					process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`
				return {
					// Forward the desired port via env so doppler/next receive it consistently.
					command: `pnpm --filter @repo/frontend dev`,
					url,
					reuseExistingServer: true,
					timeout: 120000,
					stdout: 'pipe',
					stderr: 'pipe',
					env: {
						...process.env,
						PORT: port
					}
				}
			})(),

	// Snapshot configuration
	snapshotDir: path.join(TEST_DIR, '__snapshots__'),
	snapshotPathTemplate:
		'{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}',

	// Metadata for reporting
	metadata: {
		project: 'TenantFlow',
		environment: process.env.NODE_ENV || 'development',
		version: process.env.npm_package_version || '1.0.0'
	}
})
