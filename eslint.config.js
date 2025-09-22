/**
 * Root ESLint configuration for TenantFlow monorepo
 * ESLint v9 flat config format
 *
 * This root config uses the shared @repo/eslint-config package
 * following Turborepo best practices for monorepo configuration
 */

import globals from 'globals'
import noBarrelExports from './.eslint/rules/no-barrel-exports.js'
import noInlineTypes from './.eslint/rules/no-inline-types.js'
import baseConfig from './packages/eslint-config/base.js'

/**
 * Root-level configuration with project-specific overrides
 * Extends the base configuration from @repo/eslint-config
 * Using ESLint 9 flat config format (no defineConfig wrapper needed)
 */
export default [
	// Use the shared base configuration
	...baseConfig, // Root-level specific configurations
	{
		name: 'root/monorepo-files',
		files: ['*.js', '*.mjs', '*.ts'],
		rules: {
			'no-console': 'off'
		}
	},
	{
		name: 'root/scripts',
		files: [
			'scripts/**/*.{js,mjs,cjs,ts}',
			'apps/*/scripts/**/*.{js,mjs,cjs,ts}'
		],
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-var-requires': 'off',
			'no-restricted-globals': 'off',
			'no-eval': 'off'
		},
		languageOptions: {
			globals: {
				...globals.node
			},
			parserOptions: {
				project: null,
				allowDefaultProject: true
			}
		}
	},
	{
		name: 'root/github-scripts-ignore',
		ignores: ['.github/**/*.ts', '.github/**/*.js']
	},
	{
		name: 'apps/type-centralization',
		files: ['apps/frontend/**/*.{ts,tsx}', 'apps/backend/**/*.ts'],
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
			'type-centralization/no-inline-types': 'error',
			'type-centralization/no-barrel-exports': [
				'error',
				{
					allowedBarrels: ['packages/shared/src/index.ts']
				}
			]
		}
	},
	{
		name: 'root/test-files',
		files: ['**/*.test.*', '**/*.spec.*'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unsafe-argument': 'error',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'error',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unused-vars': 'error'
		}
	}, // Project-specific anti-pattern guards and SECURITY RULES
	{
		name: 'root/anti-patterns-and-security',
		files: ['**/*.ts', '**/*.tsx'],
		ignores: ['**/*.test.*', '**/*.spec.*', '**/*.config.*'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/factory/**', '**/*factory*', '**/*Factory*'],
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
						},
						{
							group: ['framer-motion', 'components/*'],
							message:
								'Framer Motion is not allowed. Framer Motion was replaced with react-spring/web. Migrate to react-spring/web.'
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
]
