/**
 * Optimized NestJS + Express specific ESLint configuration for TenantFlow backend
 * ESLint v9 flat config with TypeScript ESLint v8+ optimization
 * Enhanced for Stripe, Supabase, and Monorepo performance.
 * Uses modern flat config composition without deprecated tseslint.config() wrapper.
 */

import tsParser from '@typescript-eslint/parser'
import globals from 'globals'
import baseConfig from './base.js'

/** @type {import('eslint').Linter.Config[]} */
const config = [
	...baseConfig,
	{
		name: 'nestjs/backend',
		files: ['**/*.ts'],
		ignores: [
			'**/*.spec.ts',
			'**/*.test.ts',
			'**/*.e2e-spec.ts',
			'**/supabase/functions/**/*.ts',
			'**/supabase/migrations/**/*.ts'
		],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				projectService: {
					allowDefaultProject: ['*.js', '*.mjs'],
					defaultProject: 'tsconfig.json'
				},
				tsconfigRootDir: import.meta.dirname,
				warnOnUnsupportedTypeScriptVersion: false,
				EXPERIMENTAL_useProjectService: true
			},
			globals: {
				...globals.node,
				...globals.es2024,
				Stripe: 'readonly',
				supabase: 'readonly',
				NodeJS: 'readonly',
				Buffer: 'readonly',
				process: 'readonly',
				global: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly'
			}
		},
		rules: {
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-empty-interface': [
				'error',
				{
					allowSingleExtends: true
				}
			],
			'@typescript-eslint/no-namespace': 'off',
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
			'@typescript-eslint/no-unsafe-assignment': 'error',
			'@typescript-eslint/no-unsafe-member-access': 'error',
			'@typescript-eslint/no-unsafe-call': 'error',
			'@typescript-eslint/no-unsafe-return': 'error',
			'@typescript-eslint/no-unsafe-argument': 'error',
			'@typescript-eslint/restrict-template-expressions': [
				'error',
				{
					allowNumber: true,
					allowBoolean: true,
					allowAny: false,
					allowNullish: true,
					allowRegExp: true
				}
			],
			'no-console': 'off',
			'no-return-await': 'off',
			'@typescript-eslint/return-await': ['error', 'in-try-catch'],
			'no-duplicate-imports': 'error',
			'sort-imports': 'off',
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports',
					disallowTypeAnnotations: true
				}
			],
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
						arguments: false,
						attributes: false,
						properties: false,
						returns: false,
						variables: false
					}
				}
			],
			'@typescript-eslint/promise-function-async': 'error',
			'@typescript-eslint/only-throw-error': 'error',
			'@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
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
			'@typescript-eslint/no-unnecessary-condition': 'warn',
			'@typescript-eslint/no-unnecessary-type-arguments': 'warn',
			'@typescript-eslint/prefer-reduce-type-parameter': 'warn',
			'@typescript-eslint/prefer-return-this-type': 'error',
			'@typescript-eslint/no-useless-empty-export': 'error',
			'@typescript-eslint/no-require-imports': 'error',
			'@typescript-eslint/no-duplicate-type-constituents': 'warn',
			'@typescript-eslint/no-redundant-type-constituents': 'warn',
			'@typescript-eslint/no-unnecessary-qualifier': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					args: 'after-used',
					caughtErrors: 'none'
				}
			]
		}
	},
	{
		name: 'nestjs/controllers',
		files: ['**/*.controller.ts', '**/*.resolver.ts', '**/*.gateway.ts'],
		rules: {
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-return': 'error',
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
			'@typescript-eslint/no-unsafe-assignment': 'error',
			'@typescript-eslint/no-unsafe-member-access': 'error',
			'@typescript-eslint/no-unsafe-call': 'error',
			'@typescript-eslint/no-unsafe-return': 'error',
			'@typescript-eslint/no-unsafe-argument': 'error',
			'@typescript-eslint/no-base-to-string': 'off',
			'@typescript-eslint/restrict-template-expressions': [
				'error',
				{
					allowNumber: true,
					allowBoolean: true,
					allowAny: false,
					allowNullish: true,
					allowRegExp: true
				}
			]
		}
	},
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
			'@typescript-eslint/no-unused-vars': 'error',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/consistent-indexed-object-style': ['warn', 'record'],
			'@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
			'@typescript-eslint/ban-types': [
				'error',
				{
					extendDefaults: true,
					types: {
						'{}': false
					}
				}
			]
		}
	},
	{
		name: 'nestjs/modules',
		files: ['**/*.module.ts', '**/*.config.ts', '**/main.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-var-requires': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-dynamic-delete': 'off'
		}
	},
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
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'error',
			'@typescript-eslint/unbound-method': 'off'
		}
	},
	{
		name: 'nestjs/decorators',
		files: ['**/*.decorator.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-restricted-types': 'off'
		}
	},
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
	{
		name: 'nestjs/migrations',
		files: ['**/migrations/**/*.ts', '**/seeds/**/*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/naming-convention': 'off',
			'no-console': 'off',
			'@typescript-eslint/no-unused-vars': 'off'
		}
	},
	{
		name: 'nestjs/commands',
		files: ['**/*.command.ts', '**/cli/**/*.ts'],
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-explicit-any': 'warn'
		}
	},
	{
		name: 'nestjs/stripe-webhooks',
		files: ['**/stripe/**/*.ts', '**/*stripe*.ts', '**/webhooks/**/*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrors: 'none'
				}
			],
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/no-floating-promises': 'error'
		}
	},
	{
		name: 'nestjs/supabase-integration',
		files: ['**/supabase/**/*.ts', '**/*supabase*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error'
		}
	}
]

export default config
