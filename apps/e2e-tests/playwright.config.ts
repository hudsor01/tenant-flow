import { defineConfig } from '@playwright/test'
import { baseConfig, smokeProjects } from './playwright.config.base.ts'

export default defineConfig({
	...baseConfig,

	// Projects use session reuse for fast login (no auth-setup needed)
	projects: smokeProjects
})
