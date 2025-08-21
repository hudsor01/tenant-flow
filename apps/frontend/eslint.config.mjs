import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all
})

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
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx',
			'**/__tests__/**',
			'src/test/**',
			'scripts/**',
			'jest.config.js',
			'public/**/*.js',
			'eslint.config.mjs',
			'next-sitemap.config.js',
			'postcss.config.mjs',
			'next.config.ts',
			'*.config.js',
			'*.config.mjs'
		]
	},
	...compat.extends(
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'next/core-web-vitals',
		'next/typescript'
	),
	{
		plugins: {
			'@typescript-eslint': typescriptEslint
		},

		languageOptions: {
			parser: tsParser,
			ecmaVersion: 'latest',
			sourceType: 'module',

			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: __dirname
			}
		},

		rules: {
			// Core TypeScript rules
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					ignoreRestSiblings: true
				}
			],
			'@typescript-eslint/no-namespace': 'off',
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports'
				}
			],

			// React rules
			'react/no-unescaped-entities': 'off',
			'react-hooks/exhaustive-deps': 'error',
			'react-hooks/rules-of-hooks': 'error',

			// Next.js specific
			'@next/next/no-html-link-for-pages': 'off',

			// Accessibility rules - only apply to actual img elements, not SVG components
			'jsx-a11y/alt-text': [
				'error',
				{
					elements: ['img', 'object', 'area', "input[type='image']"]
				}
			]
		}
	},
	{
		// Next.js App Router specific files - disable react-refresh warnings
		files: [
			'src/app/**/page.tsx',
			'src/app/**/page.ts',
			'src/app/**/layout.tsx',
			'src/app/**/layout.ts',
			'src/app/**/error.tsx',
			'src/app/**/loading.tsx',
			'src/app/**/not-found.tsx'
		],

		rules: {
			'react-refresh/only-export-components': 'off'
		}
	},
	{
		// API routes can use console for logging
		files: ['src/app/api/**/*.ts', 'src/app/api/**/*.tsx'],

		rules: {
			'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }]
		}
	}
]