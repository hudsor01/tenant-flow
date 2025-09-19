/**
 * Frontend ESLint Configuration - Native ESLint 9 Flat Config
 * Uses shared base config from @repo/eslint-config following official best practices
 *
 * Based on:
 * - ESLint v9 flat config documentation
 * - TypeScript ESLint v8 official recommendations
 * - Next.js 15 + React 19 compatibility
 */

import baseConfig from '@repo/eslint-config/base.js'
import antiDuplicationPlugin from '../../.eslint/plugins/anti-duplication.js'
import nextPlugin from '@next/eslint-plugin-next'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

export default [
	...baseConfig,

	{
		name: 'frontend/next.js-plugin',
		files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
		plugins: {
			'@next/next': nextPlugin
		},
		rules: {
			...nextPlugin.configs.recommended.rules,
			...nextPlugin.configs['core-web-vitals'].rules,
			'@next/next/no-img-element': 'off'
		}
	},
	{
		name: 'ignore-orphaned-test-files',
		ignores: [
			'src/components/forms/__tests__/**',
			'src/components/tenants/__tests__/**',
			'src/hooks/api/__tests__/**',
			'tests/**', // All test files outside src directory
			'src/lib/auth/__tests__/**',
			'src/smoke.spec.tsx',
			'src/test/**',
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
			parserOptions: {
				projectService: true,
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
			'@typescript-eslint/no-unsafe-argument': 'off'
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
			'**/test/**/*.tsx'
		],
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'no-console': 'off'
		}
	}
]
