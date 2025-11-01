/* eslint-env node */
/**
 * Optimized ESLint configuration for TenantFlow monorepo
 * ESLint v9 flat config with standard presets
 * Enhanced for TurboRepo, Stripe, and Supabase.
 * Uses modern typescript-eslint v8+ flat config patterns.
 */

import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'
// import turboPlugin from 'eslint-plugin-turbo' // Removed - using turbo.js config instead
import globals from 'globals'
import tseslint from 'typescript-eslint'

export const config = defineConfig([
	{
		files: [
			'**/eslint-config/*.js',
			'**/eslint.config.js',
			'packages/eslint-config/*.js'
		],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
				...globals.es2024,
				process: 'readonly'
			}
		}
	},
	{
		...js.configs.recommended,
		rules: {
			...js.configs.recommended.rules,
			'no-dupe-keys': 'off' // Disabled for CSS class duplications
		}
	},
	eslintConfigPrettier,
	...tseslint.configs.recommended,

	{
		name: 'base/ignores',
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
			'**/test/production-api.test.ts',
			'Dockerfile',
			'**/stripe-signing-secret.ts',
			'**/.env.local',
			'**/.env.development.local'
		]
	},
	{
		name: 'base/typescript',
		files: ['**/*.ts', '**/*.tsx'],
		ignores: ['**/*.d.ts'],
		languageOptions: {
			parserOptions: {
				projectService: true,

				tsconfigRootDir: import.meta.dirname
			},
			globals: {
				...globals.node,
				...globals.browser,
				...globals.es2024,
				Stripe: 'readonly',
				supabase: 'readonly'
			}
		},
		rules: {
			// Disable type-aware rules that cause issues
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			// Keep non-type-aware rules
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrors: 'none'
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
	{
		name: 'base/tests',
		files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
		languageOptions: {
			parserOptions: {
				projectService: false
			}
		},
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unused-vars': 'off'
		}
	},
	{
		name: 'base/test-support-files',
		files: [
			'apps/frontend/tests/**/*.ts',
			'apps/frontend/tests/**/*.tsx',
			'tests/**/*.ts',
			'tests/**/*.tsx'
		],
		languageOptions: {
			parserOptions: {
				projectService: false
			}
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off'
		}
	},
	{
		name: 'base/config-scripts',
		files: [
			'**/*.config.ts',
			'**/*.config.js',
			'**/*.config.mjs',
			'**/scripts/**/*.ts',
			'**/scripts/**/*.cjs',
			'**/scripts/**/*.js',
			'**/stripe.config.ts',
			'**/supabase.config.ts'
		],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'no-console': 'off'
		}
	},
	{
		name: 'base/env-files',
		files: ['**/.env*.ts', '**/env*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-var-requires': 'off',
			'no-console': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off'
		}
	}
])

export default config
