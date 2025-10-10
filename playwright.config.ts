import { defineConfig } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	baseConfig,
	smokeProjects,
	stagingProject,
	productionProject
} from './apps/e2e-tests/playwright.config.base'

// Default NODE_ENV for deterministic Playwright behaviour
if (!process.env.NODE_ENV) {
	;(process.env as { NODE_ENV?: string }).NODE_ENV = 'development'
}

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url))
const TEST_DIR = baseConfig.testDir ?? path.join(ROOT_DIR, 'apps/e2e-tests/tests')

const projects = [...smokeProjects]
if (process.env.PLAYWRIGHT_INCLUDE_STAGING === 'true') {
	projects.push(stagingProject)
}
if (process.env.PLAYWRIGHT_INCLUDE_PROD === 'true') {
	projects.push(productionProject)
}

export default defineConfig({
	...baseConfig,
	testDir: TEST_DIR,
	timeout: 60000,
	expect: {
		timeout: 15000,
		toHaveScreenshot: {
			maxDiffPixels: 100
		}
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	projects,
	use: {
		...baseConfig.use,
		baseURL: process.env.CI
			? 'https://tenantflow.app'
			: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
		navigationTimeout: 30000,
		actionTimeout: 15000,
		ignoreHTTPSErrors: true,
		extraHTTPHeaders: {
			...(process.env.E2E_API_TOKEN
				? { Authorization: process.env.E2E_API_TOKEN }
				: {})
		}
	},
	webServer: {
		command: 'doppler run -- pnpm --filter @repo/frontend dev',
		url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
		reuseExistingServer: true,
		timeout: 120000,
		stdout: 'pipe',
		stderr: 'pipe'
	},
	outputDir: 'test-results/',
	snapshotDir: path.join(TEST_DIR, '__snapshots__'),
	snapshotPathTemplate:
		'{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}',
	metadata: {
		project: 'TenantFlow',
		environment:
			process.env.NODE_ENV ||
			(() => {
				throw new Error(
					'NODE_ENV environment variable is required for Playwright tests'
				)
			})(),
		version: process.env.npm_package_version || undefined
	}
})
