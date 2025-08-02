import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tanstackRouter from '@tanstack/eslint-plugin-router'

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
			'**/vitest.config.ts',
			'apps/frontend/src/routeTree.gen.ts',
			'apps/frontend/src/types/backend-app-router.d.ts',
			'apps/backend/test-endpoints.js',
			'apps/backend/src/auth/auth-production-diagnostic.ts',
			'.turbo/**',
			'.next/**',
			'scripts/**/*.js',
			'**/*.js',
			'**/*.mjs',
			'**/*.cjs'
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
				projectService: true,
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
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'no-debugger': 'error',
			'prefer-const': 'error',
			'no-var': 'error',
			'eqeqeq': ['error', 'always']
		}
	},
	{
		files: ['apps/frontend/**/*.{ts,tsx}'],
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
			'@tanstack/router': tanstackRouter
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			'react-refresh/only-export-components': [
				'warn',
				{ allowConstantExport: true }
			],
			'@tanstack/router/create-route-property-order': 'error'
		}
	},
	{
		files: ['apps/backend/**/*.ts'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest
			}
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/explicit-function-return-type': 'off'
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
	}
)