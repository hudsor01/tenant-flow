import { defineConfig } from '@playwright/test'
import { baseConfig, smokeProjects } from './playwright.config.base.ts'

export default defineConfig({
	...baseConfig,
	// Projects - MSW mocking handles authentication
	projects: smokeProjects
})
