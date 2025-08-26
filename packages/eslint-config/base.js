/**
 * Base ESLint configuration for TenantFlow monorepo
 * ESLint v9 flat config format - Official best practices 2025
 * 
 * Based on:
 * - ESLint v9.34.0 official documentation
 * - TypeScript ESLint v8.40.0 latest recommendations
 * - Turborepo monorepo performance best practices
 * - React 19 + Next.js 15 compatibility
 */

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

/**
 * Base configuration array using ESLint v9 flat config
 * Optimized for performance in large monorepos with TypeScript
 */
const baseConfig = tseslint.config(
	// Global ignores - applied to all configurations
	{
		name: 'base/ignores',
		ignores: [
			// Build outputs
			'**/dist/**',
			'**/build/**',
			'**/out/**',
			'**/.next/**',
			'**/coverage/**',
			'**/node_modules/**',
			'**/.turbo/**',
			'**/.vercel/**',
			'**/.railway/**',
			
			// Generated files
			'**/*.generated.ts',
			'**/*.generated.js',
			'**/*.d.ts',
			'**/routeTree.gen.ts',
			'**/supabase-generated.ts',
			
			// Test artifacts
			'**/test-results/**',
			'**/playwright-report/**',
			'**/.nyc_output/**',
			'**/allure-report/**',
			'**/allure-results/**',
			
			// Environment and config files
			'**/.env*',
			'**/scripts/**/*.js',
			'**/*.config.js',
			'**/*.config.mjs',
			'**/postcss.config.*',
			
			// Supabase functions and migrations
			'**/supabase/functions/**',
			'**/supabase/migrations/**',
			
			// Backup files
			'**/*.bak*',
			'**/*.backup*',
			'**/*~'
		]
	},
	
	// JavaScript base configuration
	{
		name: 'base/javascript',
		files: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
		languageOptions: {
			ecmaVersion: 2024,
			sourceType: 'module',
			globals: {
				...globals.node,
				...globals.browser,
				...globals.es2024
			}
		},
		rules: {
			...js.configs.recommended.rules,
			'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
			'no-debugger': 'error',
			'prefer-const': 'error',
			'no-var': 'error',
			'eqeqeq': ['error', 'always'],
			'curly': ['error', 'all']
		}
	},
	
	// TypeScript configuration - using latest official presets
	{
		name: 'base/typescript',
		files: ['**/*.ts', '**/*.tsx'],
		extends: [
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylisticTypeChecked
		],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				// Use projectService for automatic TypeScript project detection
				projectService: true,
				// Ensure tsconfigRootDir is set so the parser can resolve per-package tsconfigs
				tsconfigRootDir: import.meta.dirname
			},
			globals: {
				...globals.node,
				...globals.browser,
				...globals.es2024
			}
		},
		settings: {
			// Performance optimization for TypeScript resolution
			'typescript-eslint': {
				projectService: true,
				maximumTypeCheckingDepth: 3
			}
		},
		rules: {
			// Core TypeScript rules - stricter for better code quality
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					ignoreRestSiblings: true
				}
			],
			
			// Type imports - critical for bundle size optimization
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'separate-type-imports',
					disallowTypeAnnotations: false
				}
			],
			'@typescript-eslint/no-import-type-side-effects': 'error',
			'@typescript-eslint/consistent-type-exports': [
				'error',
				{
					fixMixedExportsWithInlineTypeSpecifier: true
				}
			],
			
			// Async/Promise handling - essential for reliability
			'@typescript-eslint/no-floating-promises': [
				'error',
				{
					ignoreVoid: true,
					ignoreIIFE: true
				}
			],
			'@typescript-eslint/no-misused-promises': [
				'error',
				{
					checksVoidReturn: {
						attributes: false
					}
				}
			],
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/require-await': 'warn',
			
			// Type safety - Practical settings for real integrations
			'@typescript-eslint/no-non-null-assertion': 'off', // Allow ! when we know better than TS
			'@typescript-eslint/no-unnecessary-type-assertion': 'off', // We know better than TS with API responses
			'@typescript-eslint/no-unnecessary-condition': 'off', // Defensive programming is good
			'@typescript-eslint/switch-exhaustiveness-check': 'warn', // Enable but as warning, not error
			'@typescript-eslint/prefer-nullish-coalescing': ['warn', {
				ignoreTernaryTests: true,
				ignoreConditionalTests: true,
				ignoreMixedLogicalExpressions: true
			}],
			'@typescript-eslint/prefer-optional-chain': 'warn', // Suggest but don't error
			
			// Additional TypeScript ESLint v8 rules for better code quality
			'@typescript-eslint/array-type': [
				'error',
				{
					default: 'array-simple',
					readonly: 'array-simple'
				}
			],
			'@typescript-eslint/ban-tslint-comment': 'error',
			'@typescript-eslint/class-literal-property-style': ['error', 'fields'],
			'@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],
			'@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
			'@typescript-eslint/dot-notation': [
				'error',
				{
					allowKeywords: true,
					allowPattern: '^[a-z]+(_[a-z]+)+$',
					allowPrivateClassPropertyAccess: true,
					allowProtectedClassPropertyAccess: true,
					allowIndexSignaturePropertyAccess: false
				}
			],
			'@typescript-eslint/no-confusing-void-expression': [
				'error',
				{
					ignoreArrowShorthand: true,
					ignoreVoidOperator: true
				}
			],
			'@typescript-eslint/no-duplicate-enum-values': 'error',
			'@typescript-eslint/no-duplicate-type-constituents': 'warn',
			'@typescript-eslint/no-meaningless-void-operator': 'error',
			'@typescript-eslint/no-mixed-enums': 'error',
			'@typescript-eslint/no-redundant-type-constituents': 'warn',
			'@typescript-eslint/no-unnecessary-boolean-literal-compare': 'warn',
			'@typescript-eslint/no-unnecessary-type-arguments': 'warn',
			'@typescript-eslint/no-unnecessary-type-constraint': 'error',
			'@typescript-eslint/no-useless-empty-export': 'error',
			'@typescript-eslint/prefer-enum-initializers': 'warn',
			'@typescript-eslint/prefer-for-of': 'warn',
			'@typescript-eslint/prefer-function-type': 'error',
			'@typescript-eslint/prefer-includes': 'warn',
			'@typescript-eslint/prefer-literal-enum-member': [
				'error',
				{
					allowBitwiseExpressions: true
				}
			],
			'@typescript-eslint/prefer-reduce-type-parameter': 'warn',
			'@typescript-eslint/prefer-string-starts-ends-with': 'warn',
			'@typescript-eslint/promise-function-async': 'error',
			'@typescript-eslint/unified-signatures': 'error',
			
			// Naming conventions - updated for modern patterns
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'default',
					format: ['camelCase'],
					leadingUnderscore: 'allow',
					trailingUnderscore: 'forbid'
				},
				{
					selector: 'import',
					format: ['camelCase', 'PascalCase']
				},
				{
					selector: 'variable',
					format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
					leadingUnderscore: 'allow'
				},
				{
					selector: 'function',
					format: ['camelCase', 'PascalCase']
				},
				{
					selector: 'typeLike',
					format: ['PascalCase']
				},
				{
					selector: 'enumMember',
					format: ['UPPER_CASE', 'PascalCase']
				},
				{
					selector: 'property',
					format: null,
					leadingUnderscore: 'allow'
				},
				{
					selector: 'method',
					format: ['camelCase'],
					leadingUnderscore: 'allow'
				}
			],
			
			// Function rules - relaxed but still enforced
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			
			// General JavaScript rules
			'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
			'no-debugger': 'error',
			'prefer-const': 'error',
			'no-var': 'error',
			'eqeqeq': ['error', 'always'],
			'curly': ['error', 'all']
		}
	},
	
	// Performance-optimized type-aware rules disabled for frontend
	// Individual packages can override these for stricter checking
	{
		name: 'base/performance-overrides',
		files: ['**/*.ts', '**/*.tsx'],
		rules: {
			// Disable expensive type-aware rules by default for performance
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/unbound-method': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			'@typescript-eslint/restrict-plus-operands': 'off',
			'@typescript-eslint/no-base-to-string': 'off'
		}
	},
	
	// Test files configuration - more permissive
	{
		name: 'base/tests',
		files: [
			'**/*.test.ts', 
			'**/*.test.tsx', 
			'**/*.spec.ts', 
			'**/*.spec.tsx', 
			'**/*.test.js', 
			'**/*.spec.js',
			'**/tests/**/*.ts',
			'**/tests/**/*.tsx',
			'**/__tests__/**/*.ts',
			'**/__tests__/**/*.tsx',
			'**/test/**/*.ts',
			'**/test/**/*.tsx'
		],
		rules: {
			// Completely relax rules for test files
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/unbound-method': 'off',
			'@typescript-eslint/no-unnecessary-condition': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/await-thenable': 'off',
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'no-console': 'off'
		}
	},
	
	// Configuration files - very permissive
	{
		name: 'base/configs',
		files: [
			'**/*.config.ts', 
			'**/*.config.js', 
			'**/*.config.mjs', 
			'**/*.config.cjs',
			'**/vite.config.*', 
			'**/next.config.*',
			'**/jest.config.*',
			'**/playwright.config.*',
			'**/tailwind.config.*',
			'**/postcss.config.*',
			'**/eslint.config.*',
			'**/turbo.json'
		],
		rules: {
			// Configuration files need maximum flexibility
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-var-requires': 'off',
			'@typescript-eslint/naming-convention': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/require-await': 'off',
			'import/no-default-export': 'off',
			'no-console': 'off'
		}
	},
	
	// Package-specific overrides - handles all packages in ONE config
	{
		name: 'packages/database',
		files: ['packages/database/**/*.ts'],
		rules: {
			// Database scripts may need console output
			'no-console': 'off'
		}
	},
	{
		name: 'packages/emails', 
		files: ['packages/emails/**/*.tsx', 'packages/emails/**/*.ts'],
		rules: {
			// React Email components need flexible naming
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'function',
					format: ['camelCase', 'PascalCase'] // Allow PascalCase for React Email components
				},
				{
					selector: 'variable', 
					format: ['camelCase', 'UPPER_CASE', 'PascalCase'] // Allow PascalCase for React components
				},
				{
					selector: 'property',
					format: null // Allow any format for CSS properties, email attributes
				}
			],
			'no-console': 'off' // Email scripts may need console
		}
	},
	
	// Integration-specific overrides for third-party APIs
	{
		name: 'integrations/third-party',
		files: [
			'**/stripe/**/*.ts',
			'**/billing/**/*.ts',
			'**/supabase/**/*.ts',
			'**/database/**/*.ts',
			'**/*webhook*.ts',
			'**/*-webhook.*.ts',
			'**/resend/**/*.ts',
			'**/emails/**/*.ts'
		],
		rules: {
			// Third-party APIs return unknown shapes
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			
			// But MUST use logger instead of console
			'no-console': 'error'
		}
	}
)

export default baseConfig