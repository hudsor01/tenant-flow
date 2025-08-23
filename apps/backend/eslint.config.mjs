/**
 * Backend ESLint configuration
 * Uses root eslint config since @repo/eslint-config doesn't exist
 */

import rootConfig from '../../eslint.config.js'

export default [
	...rootConfig,
	{
		languageOptions: {
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname
			}
		}
	}
]