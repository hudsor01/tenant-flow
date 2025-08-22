/**
 * Frontend ESLint configuration using shared @repo/eslint-config
 * Following official Turborepo recommendations for optimal cache performance
 */

import nextjsConfig from '@repo/eslint-config/nextjs'

export default [
	...nextjsConfig,
	{
		languageOptions: {
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname
			}
		}
	}
]