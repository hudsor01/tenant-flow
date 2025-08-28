/**
 * NestJS + Fastify specific ESLint configuration for TenantFlow backend
 * ESLint v9 flat config with TypeScript ESLint v8.40.0 optimization
 *
 * Latest Updates:
 * - Enhanced TypeScript ESLint v8 type-aware rules for better reliability
 * - NestJS 11+ and Fastify 11+ specific optimizations
 * - Performance tuning for large backend codebases
 * - Improved async/await handling and error management
 */

import globals from 'globals'
import tseslint from 'typescript-eslint'
import baseConfig from './base.js'

export default /** @type {import('eslint').Linter.FlatConfig[]} */ (tseslint.config(
	...baseConfig,

	// Enhanced NestJS backend configuration with TypeScript ESLint v8
	{
		name: 'nestjs/backend',
		files: ['**/*.ts'],
		ignores: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.es2024,
				NodeJS: 'readonly',
				Buffer: 'readonly',
				process: 'readonly',
				global: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly'
			},
			parser: tseslint.parser,
			parserOptions: {
				projectService: {
					allowDefaultProject: ['*.js', '*.mjs'],
					defaultProject: 'tsconfig.json'
				},
				tsconfigRootDir: import.meta.dirname,
				warnOnUnsupportedTypeScriptVersion: false,
				// Performance optimization for backend
				EXPERIMENTAL_useProjectService: true
			}
		},
		settings: {
			// Backend-specific optimizations
			'typescript-eslint': {
				projectService: true,
				maximumTypeCheckingDepth: 5 // Higher for backend complexity
			}
		},
		rules: {
			// Core TypeScript ESLint rules - enhanced for backend reliability
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-empty-interface': [
				'error',
				{
					allowSingleExtends: true
				}
			],
			'@typescript-eslint/no-namespace': 'off', // NestJS uses namespaces for decorators

			// Enhanced type-aware rules for backend safety
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/no-for-in-array': 'error',
			'@typescript-eslint/no-unnecessary-type-assertion': 'error',
			'@typescript-eslint/prefer-as-const': 'error',
			'@typescript-eslint/prefer-namespace-keyword': 'error',
			'@typescript-eslint/no-confusing-void-expression': [
				'error',
				{
					ignoreArrowShorthand: true,
					ignoreVoidOperator: true
				}
			],
			'@typescript-eslint/no-duplicate-enum-values': 'error',
			'@typescript-eslint/no-meaningless-void-operator': 'error',
			'@typescript-eslint/no-mixed-enums': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': 'error',
			'@typescript-eslint/unified-signatures': 'error',

			// Backend-specific type checking (enable key safety rules))
			'@typescript-eslint/no-unsafe-assignment': 'warn', // Warn instead of off for backend safety
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/restrict-template-expressions': [
				'warn',
				{
					allowNumber: true,
					allowBoolean: true,
					allowAny: false, // Backend should be stricter
					allowNullish: true,
					allowRegExp: true
				}
			],

			// Backend logging is essential
			'no-console': 'off', // Backend needs console for logging

			// Backend specific best practices
			'no-return-await': 'off', // TypeScript handles this better
			'@typescript-eslint/return-await': ['error', 'in-try-catch'],
			'no-duplicate-imports': 'error',

			// Import organization (less strict for NestJS due to decorators)
			'sort-imports': 'off', // Too strict for NestJS imports
			'@typescript-eslint/consistent-type-imports': [
				'warn',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports',
					disallowTypeAnnotations: true
				}
			],

			// Enhanced async/Promise handling for backend reliability
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
						arguments: false, // Allow in Fastify handlers
						attributes: false,
						properties: false,
						returns: false,
						variables: false
					}
				}
			],
			'@typescript-eslint/promise-function-async': 'error', // Backend should be explicit about async

			// Enhanced error handling for backend
			'@typescript-eslint/only-throw-error': 'error',
			'@typescript-eslint/use-unknown-in-catch-callback-variable':
				'error',

			// Performance optimizations
			'@typescript-eslint/prefer-for-of': 'warn',
			'@typescript-eslint/prefer-includes': 'warn',
			'@typescript-eslint/prefer-string-starts-ends-with': 'warn',
			'@typescript-eslint/prefer-optional-chain': 'error',
			'@typescript-eslint/prefer-nullish-coalescing': [
				'warn',
				{
					ignoreTernaryTests: false,
					ignoreConditionalTests: true,
					ignoreMixedLogicalExpressions: true
				}
			],

			// Code quality with TypeScript ESLint v8
			'@typescript-eslint/no-unnecessary-condition': 'warn',
			'@typescript-eslint/no-unnecessary-type-arguments': 'warn',
			'@typescript-eslint/prefer-reduce-type-parameter': 'warn',
			'@typescript-eslint/prefer-return-this-type': 'error',
'@typescript-eslint/no-useless-empty-export': 'error',
'@typescript-eslint/no-require-imports': 'error',
'@typescript-eslint/no-duplicate-type-constituents': 'warn',
			'@typescript-eslint/no-redundant-type-constituents': 'warn',
			'@typescript-eslint/no-unnecessary-qualifier': 'warn'
		}
	},

	// Controllers and Decorators with TypeScript ESLint
	{
		name: 'nestjs/controllers',
		files: ['**/*.controller.ts', '**/*.resolver.ts', '**/*.gateway.ts'],
		rules: {
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-explicit-any': 'off', // Decorators often need any
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/ban-ts-comment': [
				'error',
				{
					'ts-expect-error': 'allow-with-description',
					'ts-ignore': true,
					'ts-nocheck': true,
					'ts-check': false
				}
			]
		}
	},

	// Services and Repositories with moderate TypeScript rules
	{
		name: 'nestjs/services',
		files: ['**/*.service.ts', '**/*.repository.ts', '**/*.provider.ts'],
		rules: {
			'@typescript-eslint/explicit-function-return-type': [
				'warn',
				{
					allowExpressions: true,
					allowTypedFunctionExpressions: true,
					allowHigherOrderFunctions: true,
					allowDirectConstAssertionInArrowFunctions: true,
					allowConciseArrowFunctionExpressionsStartingWithVoid: true
				}
			],
			'@typescript-eslint/no-explicit-any': 'warn',
			// Relax type-aware rules for existing codebase
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-base-to-string': 'off',
			'@typescript-eslint/restrict-template-expressions': [
				'warn',
				{
					allowNumber: true,
					allowBoolean: true,
					allowAny: true, // Allow any for existing code
					allowNullish: true,
					allowRegExp: true
				}
			]
		}
	},

	// DTOs and Entities with TypeScript ESLint
	{
		name: 'nestjs/dto-entities',
		files: [
			'**/*.dto.ts',
			'**/*.entity.ts',
			'**/*.interface.ts',
			'**/*.schema.ts'
		],
		rules: {
			'@typescript-eslint/no-empty-interface': 'off',
			'@typescript-eslint/no-unused-vars': 'off', // DTOs might have unused fields
			'@typescript-eslint/no-explicit-any': 'off', // DTOs might need any for flexibility
			'@typescript-eslint/consistent-indexed-object-style': [
				'warn',
				'record'
			],
			'@typescript-eslint/consistent-type-definitions': [
				'error',
				'interface'
			]
		}
	},

	// Modules and Configuration
	{
		name: 'nestjs/modules',
		files: ['**/*.module.ts', '**/*.config.ts', '**/main.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-var-requires': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-dynamic-delete': 'off'
		}
	},

	// Guards, Interceptors, Filters, Pipes - TypeScript ESLint optimized
	{
		name: 'nestjs/middleware',
		files: [
			'**/*.guard.ts',
			'**/*.interceptor.ts',
			'**/*.filter.ts',
			'**/*.pipe.ts',
			'**/*.middleware.ts'
		],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/unbound-method': 'off'
		}
	},

	// Decorators with TypeScript ESLint
	{
		name: 'nestjs/decorators',
		files: ['**/*.decorator.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			// Decorators often need Function and Object types
			'@typescript-eslint/no-restricted-types': 'off'
		}
	},

	// Test files with TypeScript ESLint
	{
		name: 'nestjs/tests',
		files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],
		languageOptions: {
			globals: {
				...globals.jest,
				...globals.node
			}
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/unbound-method': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'no-console': 'off'
		}
	},

	// Migration files with TypeScript ESLint
	{
		name: 'nestjs/migrations',
		files: ['**/migrations/**/*.ts', '**/seeds/**/*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/naming-convention': 'off', // Migrations often have specific naming
			'no-console': 'off'
		}
	},

	// CLI Commands with TypeScript ESLint
	{
		name: 'nestjs/commands',
		files: ['**/*.command.ts', '**/cli/**/*.ts'],
		rules: {
			'no-console': 'off', // CLI commands need console
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-explicit-any': 'warn'
}
}
))
