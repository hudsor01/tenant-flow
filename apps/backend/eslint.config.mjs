/**
 * Backend ESLint configuration using shared @repo/eslint-config
 * Following official Turborepo recommendations for optimal cache performance
 */

import nestjsConfig from '@repo/eslint-config/nestjs'

export default [
	...nestjsConfig,
	{
		languageOptions: {
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname
			}
		}
	}
]