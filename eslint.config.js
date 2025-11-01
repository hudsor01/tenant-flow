/**
 * Root ESLint configuration for TenantFlow monorepo
 * ESLint v9 flat config format
 *
 * This root config uses the shared @repo/eslint-config package
 * following Turborepo best practices for monorepo configuration
 */

import { defineConfig } from 'eslint/config'
import globals from 'globals'
import baseConfig from './packages/eslint-config/base.js'
import turboConfig from './packages/eslint-config/turbo.js'
import nextPlugin from '@next/eslint-plugin-next'

/**
 * Root-level configuration with project-specific overrides
 * Extends the base configuration from @repo/eslint-config
 * Using ESLint 9 flat config format with defineConfig for type safety
 */
export default defineConfig([
	// Use the shared base configuration (includes TypeScript ESLint, global ignores, test rules)
	...baseConfig,
	// Next.js ESLint plugin for framework-specific rules (flat config format)
	{
		name: 'nextjs/core-rules',
		files: ['apps/frontend/**/*.{js,jsx,ts,tsx}'],
		plugins: {
			'@next/next': nextPlugin
		},
		rules: {
			...nextPlugin.configs.recommended.rules,
			...nextPlugin.configs['core-web-vitals'].rules
		}
	},
	// Turborepo environment variable validation
	...turboConfig,
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

			// ARCHITECTURE: Database-first enum pattern (CLAUDE.md Enum Standardization)
			'no-restricted-syntax': [
				'error',
				{
					selector: 'TSEnumDeclaration',
					message:
						'TypeScript enums are prohibited. Use Supabase database enums instead. See CLAUDE.md Enum Standardization section for workflow.'
				},
				{
					selector:
						'CallExpression[callee.object.property.name="useQuery"] > ObjectExpression > Property[key.name="queryFn"] CallExpression[callee.name="fetch"]',
					message:
						'Client-side fetch on mount is prohibited. Use Server Components (async function) for initial data fetching. See CLAUDE.md Server Component vs Client Component Decision Tree.'
				},
				{
					selector:
						'CallExpression[callee.name="useEffect"] > ArrowFunctionExpression > BlockStatement CallExpression[callee.name="fetch"]',
					message:
						'useEffect + fetch is prohibited. Use Server Components for initial data or TanStack Query hooks (useQuery/useMutation) for client-side data. See CLAUDE.md.'
				}
			],

			// SECURITY: Prevent dangerous global variables
			'no-restricted-globals': [
				'error',
				{
					name: 'eval',
					message: 'eval() is dangerous and should not be used'
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
	},
	// EXCEPTION: Allow TypeScript enums ONLY in security monitoring (packages/shared/src/types/security.ts)
	{
		name: 'shared/security-enum-exception',
		files: ['packages/shared/src/types/security.ts'],
		rules: {
			'no-restricted-syntax': 'off' // Allow SecurityEventType and SecurityEventSeverity enums
		}
	}
])
