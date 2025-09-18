/**
 * Optimized Next.js 15 specific ESLint configuration for a Monorepo
 * ESLint v9 flat config format with React 19.1.1 optimization
 * Tailored for Turborepo with NestJS/Fastify backend, Stripe, and Supabase.
 */

import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import tsEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import eslintConfigPrettier from 'eslint-config-prettier'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import globals from 'globals'
import baseConfig from './base.js'

/**
 * A custom ESLint configuration for libraries that use Next.js.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const nextJsConfig = [
	...baseConfig,
	js.configs.recommended,
	eslintConfigPrettier,
	{
		files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true
				},
				ecmaVersion: 2024,
				sourceType: 'module',
				project: true
			},
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2024,
				React: 'readonly',
				JSX: 'readonly'
			}
		},
		plugins: {
			'@next/next': nextPlugin,
			react: reactPlugin,
			'react-hooks': reactHooksPlugin,
			'jsx-a11y': jsxA11yPlugin,
			'@typescript-eslint': tsEslint
		},
		settings: {
			react: { version: 'detect' },
			next: {
				rootDir: true
			}
		},
		rules: {
			...nextPlugin.configs.recommended.rules,
			...nextPlugin.configs['core-web-vitals'].rules,
			...reactPlugin.configs.recommended.rules,
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
			'react/no-unescaped-entities': 'off',
			'react/jsx-no-target-blank': [
				'error',
				{
					enforceDynamicLinks: 'always',
					warnOnSpreadAttributes: true
				}
			],
			'react/jsx-key': [
				'error',
				{
					checkFragmentShorthand: true,
					checkKeyMustBeforeSpread: true,
					warnOnDuplicates: true
				}
			],
			'react/no-array-index-key': 'warn',
			'react/jsx-no-useless-fragment': ['warn', { allowExpressions: true }],
			'react/jsx-fragments': ['warn', 'syntax'],
			'react/self-closing-comp': ['error', { component: true, html: true }],
			...reactHooksPlugin.configs.recommended.rules,
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': [
				'warn',
				{
					additionalHooks:
						'(useActionState|useOptimistic|useFormStatus|use|useTransition|useDeferredValue)'
				}
			],
			...tsEslint.configs.recommended.rules,
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'default',
					format: ['camelCase'],
					leadingUnderscore: 'allow',
					trailingUnderscore: 'forbid'
				},
				{
					selector: 'import',
					format: ['camelCase', 'PascalCase']
				},
				{
					selector: 'variable',
					format: ['camelCase', 'PascalCase'],
					leadingUnderscore: 'forbid'
				},
				{
					selector: 'function',
					format: ['camelCase', 'PascalCase']
				},
				{
					selector: 'typeLike',
					format: ['PascalCase']
				},
				{
					selector: 'enumMember',
					format: ['UPPER_CASE']
				},
				{
					selector: 'property',
					format: null,
					leadingUnderscore: 'allow'
				},
				{
					selector: 'method',
					format: ['camelCase'],
					leadingUnderscore: 'allow'
				}
			],
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-empty-function': 'warn'
		}
	},
	{
		name: 'nextjs/server-components',
		files: [
			'**/app/**/page.tsx',
			'**/app/**/page.ts',
			'**/app/**/layout.tsx',
			'**/app/**/layout.ts',
			'**/app/**/error.tsx',
			'**/app/**/loading.tsx',
			'**/app/**/not-found.tsx',
			'**/app/**/template.tsx',
			'**/app/**/default.tsx',
			'**/app/**/global-error.tsx',
			'**/app/**/@*/**/page.tsx',
			'**/app/**/(.*)/page.tsx',
			'**/app/**/route.ts',
			'**/app/**/opengraph-image.tsx',
			'**/app/**/twitter-image.tsx',
			'**/app/**/icon.tsx',
			'**/app/**/apple-icon.tsx'
		],
		rules: {
			'react-hooks/rules-of-hooks': 'off',
			'react-hooks/exhaustive-deps': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/promise-function-async': 'off'
		}
	},
	{
		name: 'nextjs/api-routes',
		files: [
			'**/app/api/**/*.ts',
			'**/app/**/route.ts',
			'**/middleware.ts',
			'**/instrumentation.ts'
		],
		rules: {
			'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/no-floating-promises': 'off'
		}
	}
]
