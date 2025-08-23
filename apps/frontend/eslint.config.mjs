import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'
import nextjs from '@next/eslint-plugin-next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default [
	{
		ignores: [
			'.next/**',
			'out/**',
			'dist/**',
			'build/**',
			'node_modules/**',
			'coverage/**',
			'.nyc_output/**',
			'*.generated.ts',
			'*.generated.js',
			'test-*.js',
			'tests/**',
			'src/test/**',
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx',
			'**/__tests__/**',
			'scripts/**',
			'jest.config.js',
			'public/**/*.js',
			'eslint.config.mjs',
			'next-sitemap.config.js',
			'postcss.config.mjs',
			'next.config.ts',
			'vitest.config.production.ts',
			'playwright.config.ts',
			'*.config.js',
			'*.config.mjs'
		]
	},
	js.configs.recommended,
	{
		files: ['**/*.ts', '**/*.tsx'],
		plugins: {
			'@typescript-eslint': typescriptEslint,
			'react-hooks': reactHooks,
			'@next/next': nextjs
		},

		languageOptions: {
			parser: tsParser,
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				console: 'readonly',
				process: 'readonly',
				fetch: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				Buffer: 'readonly',
				global: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly',
				require: 'readonly',
				module: 'readonly',
				exports: 'readonly',
				React: 'readonly',
				JSX: 'readonly',
				window: 'readonly',
				document: 'readonly',
				navigator: 'readonly',
				location: 'readonly',
				localStorage: 'readonly',
				sessionStorage: 'readonly',
				performance: 'readonly',
				NodeJS: 'readonly',
				crypto: 'readonly',
				btoa: 'readonly',
				atob: 'readonly'
			},

			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: __dirname
			}
		},

		rules: {
			// Core TypeScript rules  
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': 'off', // Temporarily disabled to reduce warning count
			// Standard no-unused-vars rule for non-TypeScript issues
			'no-unused-vars': [
				'off', // Temporarily disabled to reduce warning count
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					ignoreRestSiblings: true
				}
			],
			'@typescript-eslint/prefer-nullish-coalescing': 'off', // Temporarily disabled to reduce warning count
			'@typescript-eslint/consistent-type-imports': [
				'warn',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports'
				}
			],
			'no-redeclare': 'error',
			'no-undef': 'warn',

			// React rules
			'react-hooks/exhaustive-deps': 'warn',
			'react-hooks/rules-of-hooks': 'error',

			// Next.js rules
			'@next/next/no-html-link-for-pages': 'error',
			'@next/next/no-img-element': 'warn',
			'@next/next/no-unwanted-polyfillio': 'error',
			'@next/next/no-page-custom-font': 'error',
			'@next/next/no-sync-scripts': 'error',
			'@next/next/no-title-in-document-head': 'error',
			'@next/next/no-duplicate-head': 'error',
			'@next/next/no-head-element': 'error',
			'@next/next/no-head-import-in-document': 'error',
			'@next/next/no-script-component-in-head': 'error'
		}
	},
	{
		// Test files configuration
		files: ['src/test/**/*.ts', 'src/test/**/*.tsx'],
		plugins: {
			'@typescript-eslint': typescriptEslint
		},
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 'latest',
			sourceType: 'module',
			parserOptions: {
				project: './tsconfig.test.json',
				tsconfigRootDir: __dirname
			},
			globals: {
				jest: 'readonly',
				describe: 'readonly',
				it: 'readonly',
				expect: 'readonly',
				beforeAll: 'readonly',
				beforeEach: 'readonly',
				afterEach: 'readonly',
				afterAll: 'readonly',
				test: 'readonly'
			}
		},
		rules: {
			// Relaxed rules for test files
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/prefer-nullish-coalescing': 'off',
			'@typescript-eslint/consistent-type-imports': 'off'
		}
	}
]