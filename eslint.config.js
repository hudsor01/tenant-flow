/**
 * Root ESLint configuration for TenantFlow monorepo
 * ESLint v9 flat config format
 *
 * This root config uses the shared @repo/eslint-config package
 * following Turborepo best practices for monorepo configuration
 */

import { defineConfig } from 'eslint/config'
import baseConfig from './packages/eslint-config/base.js'
import noInlineTypes from './.eslint/rules/no-inline-types.js'
import noBarrelExports from './.eslint/rules/no-barrel-exports.js'

/**
 * Root-level configuration with project-specific overrides
 * Extends the base configuration from @repo/eslint-config
 * Using official ESLint 9 defineConfig() helper
 */
export default defineConfig([
	// Use the shared base configuration
	...baseConfig,

	// Root-level specific configurations
	{
		name: 'root/monorepo-files',
		files: ['*.js', '*.mjs', '*.ts'],
		rules: {
			// Allow console in root scripts
			'no-console': 'off'
			// NOTE: Removed @typescript-eslint/no-explicit-any override - now enforced
		}
	},

	// Note: TypeScript project resolution is handled in packages/eslint-config/base.js

	// Scripts directory (excluding .github scripts)
	{
		name: 'root/scripts',
		files: ['scripts/**/*.{js,mjs,ts}'],
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-var-requires': 'off'
		},
		languageOptions: {
			parserOptions: {
				project: null, // Don't use TypeScript project for scripts
				allowDefaultProject: true
			}
		}
	},

	// Ignore .github scripts entirely - CI specific scripts
	{
		name: 'root/github-scripts-ignore',
		ignores: ['.github/**/*.ts', '.github/**/*.js']
	},

	// Type centralization enforcement - ONLY for application code
	{
		name: 'apps/type-centralization',
		files: [
			'apps/frontend/**/*.{ts,tsx}',
			'apps/backend/**/*.ts'
		],
		ignores: [
			'**/*.test.*', 
			'**/*.spec.*', 
			'**/*.config.*',
			'**/*.d.ts',
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**'
		],
		plugins: {
			'type-centralization': {
				rules: {
					'no-inline-types': noInlineTypes,
					'no-barrel-exports': noBarrelExports
				}
			}
		},
		rules: {
			// Warn instead of error during transition period
			'type-centralization/no-inline-types': 'warn',
			'type-centralization/no-barrel-exports': ['warn', {
				allowedBarrels: [
					'packages/shared/src/index.ts',
					'apps/frontend/src/components/ui/index.ts', // UI component library
					'apps/frontend/src/hooks/api/index.ts' // API hooks barrel for convenience
				]
			}]
		}
	},

	// Project-specific anti-pattern guards and SECURITY RULES
	{
		name: 'root/anti-patterns-and-security',
		files: ['**/*.ts', '**/*.tsx'],
		ignores: ['**/*.test.*', '**/*.spec.*', '**/*.config.*'],
		rules: {
			// Prevent factory pattern reintroduction
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'**/factory/**',
								'**/*factory*',
								'**/*Factory*'
							],
							message:
								'Factory patterns are prohibited. Use direct library usage instead.'
						},
						{
							group: [
								'**/form-patterns*',
								'**/form-factory*',
								'**/form-builder*'
							],
							message:
								'Use React Hook Form directly. Form abstractions are prohibited.'
						},
						{
							group: ['**/query-factory*', '**/api-factory*'],
							message:
								'Use TanStack Query directly. Query factories are prohibited.'
						},
						{
							group: ['jotai', '**/atoms/**'],
							message:
								'Jotai was replaced with Zustand. Use stores/app-store.ts instead.'
						}
					]
				}
			],

			// SECURITY: Prevent dangerous global variables
			'no-restricted-globals': [
				'error',
				{
					name: 'eval',
					message: 'eval() is dangerous and should not be used'
				},
				{
					name: 'document',
					message:
						'Use proper DOM sanitization instead of direct document access'
				}
			],

			// SECURITY: Prevent dangerous syntax
			'no-eval': 'error',
			'no-implied-eval': 'error',
			'no-script-url': 'error',
			'no-new-func': 'error',

			// SECURITY: Additional safety measures
			'no-prototype-builtins': 'error',
			'guard-for-in': 'error',
			radix: 'error'
		}
	}
])
