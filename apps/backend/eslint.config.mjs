/**
 * Backend ESLint Configuration - NestJS with Security Focus
 * Extends shared base config with NestJS-specific overrides
 */

import { defineConfig } from 'eslint/config'
import baseConfig from '@repo/eslint-config/base.js'
import globals from 'globals'

export default defineConfig([
	...baseConfig,
	{
		name: 'backend/ignores',
		ignores: ['vitest.config.ts', 'jest.config.js', 'eslint.config.mjs']
	},
	{
	name: 'backend/nestjs-overrides',
	files: [
		'**/*.ts',
		'!**/*.spec.ts',
		'!**/*.test.ts',
		'!**/*.e2e-spec.ts',
		'!test/**/*',
		'!**/test/**/*',
		'!apps/backend/test/**/*'
	],
	languageOptions: {
		globals: {
				NodeJS: 'readonly',
				Buffer: 'readonly',
				process: 'readonly',
				global: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly'
			}
		},
		settings: {},
		rules: {
			// Console usage should be replaced with NestJS Logger
			'no-console': 'warn',
			'no-restricted-syntax': [
				'warn',
				{
					selector: 'CallExpression[callee.object.name="console"]',
					message:
						'Console method calls are discouraged. Consider using NestJS Logger: constructor(private readonly logger = new Logger(ControllerName.name)) { } then this.logger.log/warn/error("message")'
				},
				{
					selector: 'MemberExpression[object.name="console"]',
					message:
						'Direct console access is discouraged. Consider using NestJS Logger service for structured logging instead'
				}
			],
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-namespace': 'off'
		}
	},
	{
		name: 'backend/controllers',
		files: ['**/*.controller.ts', '**/*.resolver.ts', '**/*.gateway.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/ban-ts-comment': [
				'error',
				{
					'ts-expect-error': 'allow-with-description',
					'ts-ignore': false,
					'ts-nocheck': false,
					'ts-check': false
				}
			]
		}
	},
	{
		name: 'backend/dto-entities',
		files: [
			'**/*.dto.ts',
			'**/*.entity.ts',
			'**/*.interface.ts',
			'**/*.schema.ts'
		],
		rules: {
			'@typescript-eslint/no-empty-interface': 'off',
			'@typescript-eslint/no-unused-vars': 'error',
			'@typescript-eslint/consistent-indexed-object-style': ['warn', 'record'],
			'@typescript-eslint/consistent-type-definitions': ['error', 'interface']
		}
	},
	{
	name: 'backend/tests',
	files: [
		'**/*.spec.ts',
		'**/*.test.ts',
		'**/*.e2e-spec.ts',
		'test/**/*.ts',
		'**/test/**/*.ts',
		'apps/backend/test/**/*.ts'
	],
	languageOptions: {
		globals: {
				...globals.jest,
				...globals.node
			}
		},
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-explicit-any': 'off'
		}
	},
	{
		name: 'backend/javascript-node',
		files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
		languageOptions: {
			globals: {
				...globals.node,
				module: 'readonly',
				exports: 'readonly',
				require: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly',
				process: 'readonly',
				console: 'readonly',
				Buffer: 'readonly'
			},
			ecmaVersion: 'latest',
			sourceType: 'module'
		},
		rules: {
			'no-undef': 'off',
			'no-console': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-var-requires': 'off'
		}
	},
	{
		name: 'backend/config-scripts',
		files: [
			'*.config.js',
			'*.config.mjs',
			'*.config.ts',
			'scripts/**/*.js',
			'scripts/**/*.mjs',
			'scripts/**/*.ts'
		],
		languageOptions: {
			globals: {
				...globals.node
			}
		},
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-var-requires': 'off',
			'no-undef': 'off'
			}
	}
])
