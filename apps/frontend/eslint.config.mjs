/**
 * Frontend ESLint Configuration - Native ESLint 9 Flat Config
 * Uses modern 2024 best practices with dedicated tsconfig.eslint.json for test file inclusion
 *
 * Based on:
 * - ESLint v9 flat config documentation
 * - TypeScript ESLint v8 official recommendations
 * - Next.js 15 + React 19 compatibility
 * - 2024 monorepo patterns with separate lint/build configs
 */

import { FlatCompat } from '@eslint/eslintrc'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import colorTokensConfig from './color-tokens.eslint.js'

const compat = new FlatCompat({
	baseDirectory: import.meta.dirname
})

export default [
	// Next.js plugin using FlatCompat (official Next.js 15 + ESLint 9 pattern)
	...compat.config({
		extends: ['next/core-web-vitals', 'next/typescript']
	}),
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
			'react-hooks': reactHooksPlugin,
			'@typescript-eslint': tseslint
		},
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: './tsconfig.eslint.json',
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
				version: '19.1.1'
			},
			next: {
				rootDir: import.meta.dirname
			}
		},
		rules: {
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
			'@typescript-eslint/no-unused-vars': 'error',
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
			// PRODUCTION LOGGING ENFORCEMENT - Prefer shared logger instead of console
			// Import: import { createLogger } from '@repo/shared'
			// Usage: const logger = createLogger({ component: 'ComponentName' }); logger.info('message', { metadata })
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
	}
]
