/**
 * Next.js 15 specific ESLint configuration for TenantFlow frontend
 * 
 * Extends base configuration with Next.js, React, and accessibility rules
 * following official Next.js and React best practices.
 */

import nextPlugin from '@next/eslint-plugin-next'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import baseConfig from './base.js'

export default [
	...baseConfig,
	{
		files: ['**/*.ts', '**/*.tsx'],
		plugins: {
			'@next/next': nextPlugin,
			react: reactPlugin,
			'react-hooks': reactHooksPlugin,
			'jsx-a11y': jsxA11yPlugin
		},
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true
				}
			}
		},
		rules: {
			// Next.js specific rules
			'@next/next/no-html-link-for-pages': 'error',
			'@next/next/no-img-element': 'error',
			'@next/next/no-document-import-in-page': 'error',
			'@next/next/no-head-import-in-document': 'error',
			'@next/next/no-sync-scripts': 'error',
			'@next/next/no-css-tags': 'error',

			// React rules
			'react/no-unescaped-entities': 'off',
			'react/prop-types': 'off', // We use TypeScript
			'react/react-in-jsx-scope': 'off', // Next.js handles this
			'react/jsx-no-target-blank': 'error',
			'react/jsx-key': 'error',

			// React Hooks rules
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'error',

			// Accessibility rules
			'jsx-a11y/alt-text': [
				'error',
				{
					elements: ['img', 'object', 'area', "input[type='image']"]
				}
			],
			'jsx-a11y/anchor-is-valid': 'error',
			'jsx-a11y/click-events-have-key-events': 'error',
			'jsx-a11y/no-static-element-interactions': 'error',

			// Frontend-specific adjustments
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'no-console': ['warn', { allow: ['warn', 'error'] }]
		}
	},
	{
		// Next.js App Router specific files
		files: [
			'**/app/**/page.tsx',
			'**/app/**/page.ts',
			'**/app/**/layout.tsx',
			'**/app/**/layout.ts',
			'**/app/**/error.tsx',
			'**/app/**/loading.tsx',
			'**/app/**/not-found.tsx',
			'**/app/**/template.tsx'
		],
		rules: {
			// App Router pages can export async functions
			'@typescript-eslint/no-misused-promises': 'off'
		}
	},
	{
		// API routes can use console for logging
		files: ['**/app/api/**/*.ts', '**/app/api/**/*.tsx'],
		rules: {
			'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }]
		}
	}
]