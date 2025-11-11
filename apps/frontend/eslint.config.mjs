/**
 * Frontend ESLint Configuration - Native ESLint 9 Flat Config
 * Uses modern 2024 best practices with dedicated tsconfig.eslint.json for test file inclusion
 *
 * Based on:
 * - ESLint v9 flat config documentation
 * - TypeScript ESLint v8 official recommendations
 * - Next.js 16 + React 19.2 compatibility
 * - 2024 monorepo patterns with separate lint/build configs
 */

import { defineConfig } from 'eslint/config'
import baseConfig from '@repo/eslint-config/base.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const nextPlugin = require('@next/eslint-plugin-next')
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import tanstackQueryPlugin from '@tanstack/eslint-plugin-query'
import colorTokensConfig from './color-tokens.eslint.js'

export default defineConfig([
	// Extend shared base configuration (TypeScript, ignores, test rules)
	...baseConfig,
	{
		name: 'frontend/next.js-plugin',
		plugins: {
			'@next/next': nextPlugin
		},
		rules: {
			...nextPlugin.configs.recommended.rules,
			...nextPlugin.configs['core-web-vitals'].rules
		}
	},
	{
		name: 'frontend/next.js-overrides',
		files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
		rules: {
			'@next/next/no-img-element': 'off'
		}
	},
	{
		name: 'ignore-standard-files',
		ignores: [
			'*.config.js',
			'*.config.mjs',
			'*.config.cjs',
			'public/**',
			'.next/**',
			'coverage/**',
			'jest.config.js',
			'eslint.config.mjs',
			'next-sitemap.config.js',
			'playwright.config.ts',
			'tests/global-setup.ts',
			'tests/**.ts',
			'scripts/**',
			'playwright-report/**',
			'test-results/**'
		]
	},
	{
		name: 'frontend/react-typescript',
		files: ['**/*.ts', '**/*.tsx'],
		plugins: {
			'react-hooks': reactHooksPlugin
		},
		languageOptions: {
			// Parser already configured in base.js, just override parserOptions
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
				ecmaFeatures: {
					jsx: true
				}
			},
			globals: {
				React: 'readonly',
				JSX: 'readonly'
			}
		},
		settings: {
			react: {
				version: '19.2.0'
			},
			next: {
				rootDir: import.meta.dirname
			}
		},
		rules: {
			// Override base.js rule to allow inline import() type annotations in React components
			'@typescript-eslint/consistent-type-imports': 'off',
			'react/react-in-jsx-scope': 'off',
			'react/jsx-uses-react': 'off',
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',
			'@typescript-eslint/no-empty-interface': [
				'error',
				{
					allowSingleExtends: true
				}
			],
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_'
				}
			],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unused-expressions': 'warn'
		}
	},
	{
		name: 'frontend/app-router',
		files: ['app/**/*.ts', 'app/**/*.tsx'],
		rules: {
			'import/no-default-export': 'off',
			'@typescript-eslint/require-await': 'off'
		}
	},
	{
		name: 'frontend/tests',
		files: [
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx',
			'**/test/**/*.ts',
			'**/test/**/*.tsx',
			'tests/**/*.ts'
		],
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'no-console': 'error'
		}
	},
	{
		name: 'frontend/no-console-logging',
		files: ['**/*.ts', '**/*.tsx'],
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
			'no-console': 'warn',
			'no-restricted-syntax': [
				'warn',
				{
					selector: 'MemberExpression[object.name="console"]',
					message:
						'Direct console access is discouraged. Consider using structured logging via createLogger() from @repo/shared instead.'
				},
				{
					selector: 'CallExpression[callee.object.name="console"]',
					message:
						'Console method calls are discouraged. Consider structured logging: const logger = createLogger({ component: "ComponentName" }); logger.info/warn/error("message")'
				}
			]
		}
	},
	{
		name: 'frontend/design-system-color-tokens',
		files: ['**/*.ts', '**/*.tsx'],
		ignores: ['**/design-system/**'],
		plugins: {
			'color-tokens': colorTokensConfig
		},
		rules: {
			'color-tokens/no-hex-colors': 'error'
		}
	},
	{
		name: 'frontend/tanstack-library-exceptions',
		files: [
			'**/tenants-table.client.tsx',
			'**/data-table.tsx',
			'**/use-data-table-instance.ts'
		],
		rules: {
			'react-hooks/incompatible-library': 'off'
		}
	},
	{
		name: 'frontend/tanstack-query',
		files: ['**/*.ts', '**/*.tsx'],
		plugins: {
			'@tanstack/query': tanstackQueryPlugin
		},
		rules: {
			...tanstackQueryPlugin.configs.recommended.rules
		}
	}
])
