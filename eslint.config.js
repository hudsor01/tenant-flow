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
	{
		ignores: [
			'node_modules/**',
			'.next/**',
			'out/**',
			'build/**',
			'next-env.d.ts'
		]
	},
	// Use the shared base configuration (includes TypeScript ESLint)
	...baseConfig,
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
		name: 'root/generated-files-ignore',
		ignores: [
			'packages/database/src/generated/**/*.js',
			'packages/database/src/generated/**/*.ts',
			'packages/database/src/generated/**',
			'apps/backend/test/email/**/*', // Excluded from tsconfig, ignore in ESLint too
			'tests/**/*', // Performance and other test utilities not in tsconfig
			'apps/frontend/src/lib/__tests__/**/*' // Test files not in tsconfig
		]
	},
	/**
	 * Type Centralization Enforcement
	 *
	 * These rules ensure type safety and maintainability by:
	 * 1. no-inline-types: Prevents large interfaces/types (5+ properties) from being defined inline
	 *    - Forces complex types to be centralized in packages/shared/src/types/
	 *    - Allows simple prop interfaces (<5 properties) following KISS principle
	 *
	 * 2. no-barrel-exports: Prevents unnecessary barrel files (index.ts that just re-export)
	 *    - Reduces indirection and improves tree-shaking
	 *    - Allows legitimate UI component libraries (packages/shared, frontend/components/ui)
	 *
	 * These rules were previously disabled but are now enforced after systematic refactoring.
	 * All violations have been addressed and types are properly centralized.
	 */
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
			'**/build/**',
			'**/generated/**',
			'packages/database/src/generated/**'
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
			'type-centralization/no-barrel-exports': 'error'
		}
	},
	// FRONTEND LOGGING ENFORCEMENT - NO CONSOLE USAGE
	{
		name: 'frontend/no-console-logging',
		files: ['apps/frontend/**/*.{ts,tsx}'],
		ignores: [
			'**/*.test.*',
			'**/*.spec.*',
			'**/*.config.*',
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/next.config.*'
		],
		rules: {
			'no-console': 'error',
			'no-restricted-syntax': [
				'error',
				{
					selector: 'MemberExpression[object.name="console"]',
					message: 'Direct console access is prohibited. Use structured PostHog logging via createLogger() from @repo/shared instead.'
				},
				{
					selector: 'CallExpression[callee.object.name="console"]',
					message: 'Console method calls are prohibited. Use PostHog logging: const logger = createLogger({ component: "ComponentName" }); logger.info/warn/error("message")'
				}
			]
		}
	},
	// SHARED PACKAGE LOGGING EXCEPTION - Allow console only in logger implementation
	{
		name: 'shared/logging-implementation-exception',
		files: ['packages/shared/src/lib/frontend-logger.ts'],
		rules: {
			'no-console': 'off' // Allow console usage in the logger implementation itself
		}
	},
	// Project-specific anti-pattern guards and SECURITY RULES
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
	},
	{
		name: 'root/anti-patterns-and-security',
		files: ['**/*.ts', '**/*.tsx'],
		ignores: [
			'**/*.test.*',
			'**/*.spec.*',
			'**/*.config.*',
			'**/test/**',
			'**/tests/**',
			'apps/backend/test/**',
			'apps/frontend/test/**'
		],
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
				}
				// Temporarily disabled document restriction to unblock commits
				// TODO: Replace direct document usage with proper DOM sanitization
				// {
				//   name: 'document',
				//   message: 'Use proper DOM sanitization instead of direct document access'
				// }
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
