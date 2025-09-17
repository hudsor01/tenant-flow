/**
 * Simplified ESLint configuration for TenantFlow monorepo
 * ESLint v9 flat config with standard presets
 */

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default /** @type {import('eslint').Linter.FlatConfig[]} */ (tseslint.config(
	// Use standard recommended configurations
	js.configs.recommended,
	...tseslint.configs.recommended,

	// Global ignores
	{
		ignores: [
			'**/dist/**',
			'**/build/**',
			'**/out/**',
			'**/.next/**',
			'**/coverage/**',
			'**/node_modules/**',
			'**/.turbo/**',
			'**/.vercel/**',
			'**/.railway/**',
			'**/*.generated.ts',
			'**/*.d.ts',
			'**/supabase/functions/**',
			'**/supabase/migrations/**',
			'**/types/frontend-only.ts',
			'**/test/production-api.test.ts'
		]
	},

	// TypeScript configuration
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			},
			globals: {
				...globals.node,
				...globals.browser,
				...globals.es2024
			}
		},
		rules: {
			// Core security and quality rules
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_'
				}
			],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports'
				}
			],
			'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
			'prefer-const': 'error',
			'no-var': 'error',
			eqeqeq: ['error', 'always']
		}
	},

	// Test files - relax some rules for mocking and testing patterns
	{
		files: [
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx'
		],
		rules: {
			// Allow console in tests (for debugging)
			'no-console': 'off',
			// Allow any for test mocks and fixtures
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			// Allow unused vars in tests (sometimes needed for mocking)
			'@typescript-eslint/no-unused-vars': 'off'
		}
	},

	// Config and script files - very permissive
	{
		files: ['**/*.config.ts', '**/*.config.js', '**/*.config.mjs', '**/scripts/**/*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'no-console': 'off'
		}
	}
))
