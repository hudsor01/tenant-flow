/* eslint-env node */
/**
 * ESLint configuration for TenantFlow E2E Tests
 * Non-type-aware config due to Playwright/Test files
 */

import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import turboPlugin from 'eslint-plugin-turbo'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/** @type {import('eslint').Linter.FlatConfig[]} */
export const config = [
	{
		files: ['**/*.ts'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
				...globals.es2024
			},
			parserOptions: {
				projectService: false // Disable type-aware linting for e2e tests
			}
		}
	},
	js.configs.recommended,
	eslintConfigPrettier,
	...tseslint.configs.recommended,
	{
		name: 'turbo',
		plugins: {
			turbo: turboPlugin
		},
		rules: {
			'turbo/no-undeclared-env-vars': 'error'
		}
	},
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
]

export default config
