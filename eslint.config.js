// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: [
			'**/dist/**',
			'**/node_modules/**',
			'**/coverage/**',
			'**/*.test.*',
			'**/*.spec.*',
			'**/*.d.ts',
			'**/vite.config.ts',
			'apps/frontend/src/routeTree.gen.ts',
			'apps/frontend/src/types/backend-app-router.d.ts',
			'apps/backend/test-endpoints.js',
			'apps/backend/src/auth/auth-production-diagnostic.ts',
			'apps/backend/supabase/functions/**/*',
			'apps/backend/test/email/**/*',
			'.turbo/**',
			'.next/**',
			'scripts/**/*.js',
			'**/*.js',
			'**/*.mjs',
			'**/*.cjs',
			'apps/frontend/.next/**',
			'apps/frontend/src/test/**',
			'apps/frontend/tests/**',
			'apps/frontend/scripts/**',
			'**/playwright-report/**',
			'**/test-results/**'
		]
	},
	{
		extends: [
			js.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.stylistic
		],
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			ecmaVersion: 2022,
			globals: {
				...globals.node,
				...globals.browser,
				...globals.es2021
			},
			parser: tseslint.parser,
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports'
				}
			],
			'@typescript-eslint/no-import-type-side-effects': 'error',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'no-debugger': 'error',
			'prefer-const': 'error',
			'no-var': 'error',
			eqeqeq: ['error', 'always']
		}
	},
	{
		files: ['packages/**/*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
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
	storybook.configs['flat/recommended']
)
