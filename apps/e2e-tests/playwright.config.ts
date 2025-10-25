import { defineConfig } from '@playwright/test'
import {
	authSetupProject,
	baseConfig,
	smokeProjects
} from './playwright.config.base.ts'

export default defineConfig({
	...baseConfig,

	// Include auth setup project
	projects: [authSetupProject, ...smokeProjects]
})
