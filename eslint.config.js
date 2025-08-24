/**
 * Root ESLint configuration for TenantFlow monorepo
 * ESLint v9 flat config format
 * 
 * This root config uses the shared @repo/eslint-config package
 * following Turborepo best practices for monorepo configuration
 */

import baseConfig from './packages/eslint-config/base.js'

/**
 * Root-level configuration with project-specific overrides
 * Extends the base configuration from @repo/eslint-config
 */
export default [
	// Use the shared base configuration
	...baseConfig,
	
	// Root-level specific configurations
	{
		name: 'root/monorepo-files',
		files: ['*.js', '*.mjs', '*.ts'],
		rules: {
			// Allow console in root scripts
			'no-console': 'off',
			'@typescript-eslint/no-explicit-any': 'off'
		}
	},

	// Note: TypeScript project resolution is handled in packages/eslint-config/base.js

	// Ensure parser resolves tsconfig files from repo root for packages that expect it
	{
		name: 'root/tsconfig-rootdir',
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	
	// Scripts directory
	{
		name: 'root/scripts',
		files: ['scripts/**/*.js', 'scripts/**/*.mjs'],
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-var-requires': 'off'
		}
	},
	
	// Project-specific anti-pattern guards
	{
		name: 'root/anti-patterns',
		files: ['**/*.ts', '**/*.tsx'],
		ignores: ['**/*.test.*', '**/*.spec.*', '**/*.config.*'],
		rules: {
			// Prevent factory pattern reintroduction
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/factory/**', '**/*factory*', '**/*Factory*'],
							message: 'Factory patterns are prohibited. Use direct library usage instead.'
						},
						{
							group: ['**/form-patterns*', '**/form-factory*', '**/form-builder*'],
							message: 'Use React Hook Form directly. Form abstractions are prohibited.'
						},
						{
							group: ['**/query-factory*', '**/api-factory*'],
							message: 'Use TanStack Query directly. Query factories are prohibited.'
						},
						{
							group: ['jotai', '**/atoms/**'],
							message: 'Jotai was replaced with Zustand. Use stores/app-store.ts instead.'
						}
					]
				}
			]
		}
	}
]