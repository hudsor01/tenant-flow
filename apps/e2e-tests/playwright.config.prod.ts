import { defineConfig } from '@playwright/test'
import { baseConfig, productionProject } from './playwright.config.base'

/**
 * Playwright configuration for production monitoring tests
 *
 * Usage: pnpm test:prod
 * Runs health checks and monitoring tests against production
 */
export default defineConfig({
	...baseConfig,
	projects: [productionProject]
})
