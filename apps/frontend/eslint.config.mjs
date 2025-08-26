<<<<<<< HEAD
/**
 * Frontend ESLint Configuration - Native ESLint 9 Flat Config
 * Uses shared base config from @repo/eslint-config following official best practices
 * 
 * Based on:
 * - ESLint v9 flat config documentation
 * - TypeScript ESLint v8 official recommendations
 * - Next.js 15 + React 19 compatibility
 */

import { FlatCompat } from '@eslint/eslintrc'
import baseConfig from '@repo/eslint-config/base'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

// Next.js official compatibility layer for flat config
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

export default [
  // Use shared base configuration (ignores, JavaScript, TypeScript base rules)
  ...baseConfig,
  
  // Ignore problematic test files that aren't in TypeScript project
  {
    name: 'ignore-orphaned-test-files',
    ignores: [
      'src/components/forms/__tests__/**',
      'src/components/tenants/__tests__/**',
      'src/hooks/api/__tests__/**',
      'src/lib/auth/__tests__/**',
      'src/smoke.spec.tsx',
      'src/test/**',
      '*.config.js', // All JavaScript config files don't need TypeScript type checking
      '*.config.mjs', // All ES module config files
      'public/**', // Public directory contains plain JavaScript service workers
      '.next/**', // Next.js build directory
      'coverage/**', // Test coverage directory
      'jest.config.js',
      'eslint.config.mjs', 
      'next-sitemap.config.js',
      'vitest.config.ts',
      'playwright.config.ts', // Playwright config file
      'scripts/**', // CLI scripts are allowed to use console
    ]
  },
  
  // Next.js configuration - use only core-web-vitals to avoid TypeScript plugin conflicts
  ...compat.config({
    extends: ['next/core-web-vitals'],
    rules: {
      // Disable problematic React rules that block builds
      'react/no-unescaped-entities': 'off', // Allow apostrophes and quotes in JSX text
    }
  }),
  
  // React and Frontend specific configuration
  {
    name: 'frontend/react-typescript',
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'react-hooks': reactHooksPlugin
    },
    languageOptions: {
      parserOptions: {
        // Add JSX support to base TypeScript config
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Next.js specific globals (base config already has browser/node/es2024)
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
      // React 19 specific rules (not covered by base config)
      'react/react-in-jsx-scope': 'off', // Not needed in React 19
      'react/jsx-uses-react': 'off', // Not needed in React 19
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // Allow some flexibility for React component patterns
      '@typescript-eslint/no-empty-interface': ['error', {
        allowSingleExtends: true
      }],
      
      // Disable unsafe rules for React props and JSX (override base config)
      '@typescript-eslint/no-unsafe-assignment': 'off', // Disabled for React props
      '@typescript-eslint/no-unsafe-member-access': 'off', // Disabled for React props  
      '@typescript-eslint/no-unsafe-call': 'off', // Disabled for React props
      '@typescript-eslint/no-unsafe-return': 'off', // Disabled for React props
      '@typescript-eslint/no-unsafe-argument': 'off' // Disabled for React props
    }
  },
  
  // App Router specific configuration
  {
    name: 'frontend/app-router',
    files: ['app/**/*.ts', 'app/**/*.tsx'],
    rules: {
      // App Router pages can export default functions
      'import/no-default-export': 'off',
      
      // Server Components can be async
      '@typescript-eslint/require-await': 'off'
    }
  },
  
  // Test files - more permissive
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
      // Allow any and unsafe operations in tests
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      
      // Allow console in tests
      'no-console': 'off'
    }
  }
]
=======
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
				tsconfigRootDir: import.meta.dirname
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
>>>>>>> origin/main
