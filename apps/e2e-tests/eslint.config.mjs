/* eslint-env node */
/**
 * ESLint configuration for TenantFlow E2E Tests
 * Non-type-aware config due to Playwright/Test files
 */

import { defineConfig } from 'eslint/config'
import baseConfig from '@repo/eslint-config/base.js'

export const config = defineConfig([
	// Extend shared base configuration (includes turbo plugin via root config)
	...baseConfig,
	{
		name: 'test-files',
		files: ['**/*.ts', '**/*.spec.ts'],
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unused-vars': 'off'
		}
	}
])

export default config
