/**
 * Backend ESLint Configuration - NestJS with Security Focus
 * Extends shared base config with NestJS-specific overrides
 */

import baseConfig from '@repo/eslint-config/base.js'
import globals from 'globals'

export default [
	...baseConfig,
	{
		name: 'backend/ignores',
		ignores: ['test/**/*', 'vitest.config.ts', 'jest.config.js']
	},
	{
		name: 'backend/nestjs-overrides',
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				project: ['./tsconfig.eslint.json'],
				tsconfigRootDir: import.meta.dirname
			},
			globals: {
				NodeJS: 'readonly',
				Buffer: 'readonly',
				process: 'readonly',
				global: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly'
			}
		},
		settings: {
			'typescript-eslint': {
				projectService: true,
				maximumTypeCheckingDepth: 5 // Higher than base config's 3
			}
		},
		rules: {
			'no-console': 'off',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-namespace': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/await-thenable': 'off',
			'@typescript-eslint/unbound-method': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			'@typescript-eslint/no-base-to-string': 'off'
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
		files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
		languageOptions: {
			globals: {
				...globals.jest,
				...globals.node
			}
		},
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off'
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
]
