/**
<<<<<<< HEAD
 * Simplified ESLint configuration for TenantFlow monorepo
 * ESLint v9 flat config with standard presets
=======
 * Base ESLint configuration for TenantFlow monorepo
 * 
 * This configuration provides common rules for TypeScript projects
 * following official ESLint v9 flat config format and industry best practices.
>>>>>>> origin/main
 */

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
<<<<<<< HEAD
	// Use standard recommended configurations
	js.configs.recommended,
	...tseslint.configs.recommended,

	// Global ignores
	{
		ignores: [
=======
	{
		ignores: [
			// Build outputs
>>>>>>> origin/main
			'**/dist/**',
			'**/build/**',
			'**/out/**',
			'**/.next/**',
			'**/coverage/**',
			'**/node_modules/**',
			'**/.turbo/**',
<<<<<<< HEAD
			'**/.vercel/**',
			'**/.railway/**',
			'**/*.generated.ts',
			'**/*.d.ts',
			'**/supabase/functions/**',
			'**/supabase/migrations/**'
		]
	},

	// TypeScript configuration
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
=======

			// Generated files
			'**/*.generated.ts',
			'**/*.generated.js',
			'**/*.d.ts',

			// Config files
			'**/vite.config.ts',
			'**/next.config.ts',
			'**/postcss.config.mjs',
			'**/tailwind.config.ts',
			'**/*.config.js',
			'**/*.config.mjs',
			'**/*.config.cjs',

			// Test artifacts
			'**/test-results/**',
			'**/playwright-report/**',
			
			// Scripts and tools
			'**/scripts/**'
		]
	},
	{
		extends: [
			js.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylistic
		],
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			ecmaVersion: 2022,
			globals: {
				...globals.node,
				...globals.browser,
				...globals.es2021
			},
>>>>>>> origin/main
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
<<<<<<< HEAD
			},
			globals: {
				...globals.node,
				...globals.browser,
				...globals.es2024
			}
		},
		rules: {
			// Core security and quality rules
=======
			}
		},
		rules: {
			// Core TypeScript rules for type safety - CRITICAL for production
>>>>>>> origin/main
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
<<<<<<< HEAD
					varsIgnorePattern: '^_'
=======
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
>>>>>>> origin/main
				}
			],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
<<<<<<< HEAD
					prefer: 'type-imports'
				}
			],
			'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
			'prefer-const': 'error',
			'no-var': 'error',
			eqeqeq: ['error', 'always']
		}
	},

	// Test files - relaxed rules
	{
		files: [
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx'
		],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'no-console': 'off'
		}
	},

	// Config files - very permissive
	{
		files: ['**/*.config.ts', '**/*.config.js', '**/*.config.mjs'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'no-console': 'off'
		}
	}
)
=======
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports'
				}
			],
			'@typescript-eslint/no-import-type-side-effects': 'error',

			// Promise handling rules - PREVENTS RACE CONDITIONS
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/await-thenable': 'error',

			// Type safety rules - PREVENTS RUNTIME ERRORS
			'@typescript-eslint/no-unsafe-assignment': 'error',
			'@typescript-eslint/no-unsafe-call': 'error',
			'@typescript-eslint/no-unsafe-member-access': 'error',
			'@typescript-eslint/no-unsafe-return': 'error',
			'@typescript-eslint/no-unsafe-argument': 'error',

			// Array and object consistency
			'@typescript-eslint/array-type': ['error', { default: 'array' }],
			'@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],

			// General code quality
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'@typescript-eslint/prefer-nullish-coalescing': 'error',
			'@typescript-eslint/prefer-optional-chain': 'error',

			// General rules
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'no-debugger': 'error',
			'prefer-const': 'error',
			'no-var': 'error',
			eqeqeq: ['error', 'always'],
			'no-throw-literal': 'error',
			curly: ['error', 'all']
		}
	},
	{
		// Test files have relaxed rules but still catch critical issues
		files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			// Keep promise rules even in tests to prevent flaky tests
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error'
		}
	}
)
>>>>>>> origin/main
