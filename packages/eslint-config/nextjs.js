/**
 * Next.js 15 specific ESLint configuration for TenantFlow frontend
<<<<<<< HEAD
 * ESLint v9 flat config format with React 19.1.1 optimization
 *
 * Latest Updates:
 * - Next.js 15.5.0 with ESLint v9 flat config support
 * - React 19.1.1 compatibility with new hooks and features
 * - Direct plugin usage for better compatibility
 * - Performance optimizations for Turbopack
 * - Accessibility improvements for modern React patterns
=======
 * 
 * Extends base configuration with Next.js, React, and accessibility rules
 * following official Next.js and React best practices.
>>>>>>> origin/main
 */

import nextPlugin from '@next/eslint-plugin-next'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
<<<<<<< HEAD
import globals from 'globals'
=======
>>>>>>> origin/main
import baseConfig from './base.js'

export default [
	...baseConfig,
<<<<<<< HEAD

	// Next.js 15 and React 19 Configuration
	{
		name: 'nextjs/core',
		files: ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'],
=======
	{
		files: ['**/*.ts', '**/*.tsx'],
>>>>>>> origin/main
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
<<<<<<< HEAD
				},
				ecmaVersion: 2024,
				sourceType: 'module'
			},
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2024,
				React: 'readonly',
				JSX: 'readonly'
			}
		},
		settings: {
			react: {
				version: '19.1.1',
				pragma: 'React',
				pragmaFrag: 'React.Fragment'
			},
			next: {
				rootDir: true
			}
		},
		rules: {
			// Next.js core rules
			...nextPlugin.configs.recommended.rules,
			...nextPlugin.configs['core-web-vitals'].rules,

			// React 19 specific rules
			'react/no-unescaped-entities': 'off',
			'react/prop-types': 'off', // TypeScript provides better type checking
			'react/react-in-jsx-scope': 'off', // React 19 automatic JSX runtime
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
			'react/jsx-no-useless-fragment': [
				'warn',
				{ allowExpressions: true }
			],
			'react/jsx-fragments': ['warn', 'syntax'],
			'react/self-closing-comp': [
				'error',
				{ component: true, html: true }
			],

			// React Hooks rules for React 19
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': [
				'warn',
				{
					// React 19 new hooks
					additionalHooks:
						'(useActionState|useOptimistic|useFormStatus|use|useTransition|useDeferredValue)'
				}
			],
=======
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
>>>>>>> origin/main

			// Accessibility rules
			'jsx-a11y/alt-text': [
				'error',
				{
<<<<<<< HEAD
					elements: ['img', 'object', 'area', 'input[type="image"]'],
					img: ['Image', 'NextImage'],
					object: [],
					area: [],
					'input[type="image"]': []
				}
			],
			'jsx-a11y/anchor-is-valid': [
				'error',
				{
					components: ['Link', 'NextLink'],
					specialLink: ['hrefLeft', 'hrefRight'],
					aspects: ['invalidHref', 'preferButton']
				}
			],
			'jsx-a11y/click-events-have-key-events': 'warn',
			'jsx-a11y/no-static-element-interactions': 'warn',
			'jsx-a11y/role-has-required-aria-props': 'error',
			'jsx-a11y/role-supports-aria-props': 'error',
			'jsx-a11y/aria-props': 'error',
			'jsx-a11y/aria-proptypes': 'error',
			'jsx-a11y/aria-unsupported-elements': 'error',
			'jsx-a11y/heading-has-content': 'error',
			'jsx-a11y/img-redundant-alt': 'warn',
			'jsx-a11y/no-redundant-roles': 'warn'
		}
	},

	// Additional customizations for TenantFlow
	{
		name: 'nextjs/customizations',
		files: ['**/*.ts', '**/*.tsx'],
		rules: {
			// React 19 enhanced features
			'react-hooks/exhaustive-deps': [
				'warn',
				{
					// React 19 new hooks
					additionalHooks:
						'(useActionState|useOptimistic|useFormStatus|use|useTransition|useDeferredValue)'
				}
			],

			// Override naming convention for React components
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
					format: ['camelCase', 'UPPER_CASE', 'PascalCase'], // Allow PascalCase for React components
					leadingUnderscore: 'allow'
				},
				{
					selector: 'function',
					format: ['camelCase', 'PascalCase'] // Allow PascalCase for React functional components
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
					format: null, // Allow any format for properties (e.g., CSS properties, API responses)
					leadingUnderscore: 'allow'
				},
				{
					selector: 'method',
					format: ['camelCase'],
					leadingUnderscore: 'allow'
				}
			],

			// Console usage in frontend
			'no-console': ['warn', { allow: ['warn', 'error'] }],

			// TypeScript adjustments for React components
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-empty-function': 'off'
		}
	},

	// Next.js App Router Server Components
	{
		name: 'nextjs/server-components',
=======
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
>>>>>>> origin/main
		files: [
			'**/app/**/page.tsx',
			'**/app/**/page.ts',
			'**/app/**/layout.tsx',
			'**/app/**/layout.ts',
			'**/app/**/error.tsx',
			'**/app/**/loading.tsx',
			'**/app/**/not-found.tsx',
<<<<<<< HEAD
			'**/app/**/template.tsx',
			'**/app/**/default.tsx',
			'**/app/**/global-error.tsx',
			'**/app/**/@*/**/page.tsx', // Parallel routes
			'**/app/**/(.*)/page.tsx', // Route groups
			'**/app/**/route.ts', // Route handlers
			'**/app/**/opengraph-image.tsx',
			'**/app/**/twitter-image.tsx',
			'**/app/**/icon.tsx',
			'**/app/**/apple-icon.tsx'
		],
		rules: {
			// Server Components specific rules
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
			// Server components don't use hooks
			'react-hooks/rules-of-hooks': 'off',
			'react-hooks/exhaustive-deps': 'off',
			// Allow async components
			'@typescript-eslint/promise-function-async': 'off'
		}
	},

	// API Routes and Route Handlers
	{
		name: 'nextjs/api-routes',
		files: [
			'**/app/api/**/*.ts',
			'**/app/**/route.ts',
			'**/pages/api/**/*.ts', // Legacy Pages Router support
			'**/middleware.ts',
			'**/instrumentation.ts'
		],
		rules: {
			'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
			// API routes can use any for flexibility with request/response
			'@typescript-eslint/no-explicit-any': 'warn'
		}
	}
]
=======
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
>>>>>>> origin/main
