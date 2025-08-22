/**
 * Root ESLint configuration for TenantFlow monorepo
 * 
 * Following official Turborepo recommendations for shared configuration
 * and optimal cache performance across all packages.
 */

import storybook from 'eslint-plugin-storybook'
import baseConfig from './packages/eslint-config/base.js'

export default [
	...baseConfig,
	{
		languageOptions: {
			parserOptions: {
				project: [
					'./tsconfig.json',
					'./apps/*/tsconfig.json',
					'./packages/*/tsconfig.json'
				],
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	{
		// Stricter rules for shared packages
		files: ['packages/**/*.ts'],
		rules: {
			'@typescript-eslint/explicit-function-return-type': [
				'error',
				{
					allowExpressions: true,
					allowTypedFunctionExpressions: true,
					allowHigherOrderFunctions: true
				}
			]
		}
	},
	// Storybook configuration
	...storybook.configs['flat/recommended']
]