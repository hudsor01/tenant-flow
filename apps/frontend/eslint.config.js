import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: [
			'dist',
			'frontend/dist/**',
			'backend/dist/**',
			'node_modules/**',
			'tests/**',
			'test/**',
			'src/test/**',
			'src/tests/**',
			'supabase/**',
			'api/**',
			'frontend/src/types/supabase-generated.ts',
			'backend/eslint.config.mjs',
			'frontend/eslint.config.js'
		]
	},
	// Frontend configuration
	{
		extends: [
			js.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.stylistic
		],
		files: ['apps/frontend/**/*.{ts,tsx,d.ts}'],
		languageOptions: {
			ecmaVersion: 2022,
			globals: globals.browser,
			parserOptions: {
				project: './apps/frontend/tsconfig.json',
				tsconfigRootDir: process.cwd(),
			},
		},
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			'react-refresh/only-export-components': [
				'warn',
				{ allowConstantExport: true }
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_' }
			],
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/no-import-type-side-effects': 'error'
		}
	},
	// Backend configuration
	{
		extends: [
			js.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.stylistic
		],
		files: ['backend/**/*.{ts,js}'],
		languageOptions: {
			ecmaVersion: 2022,
			globals: {
				...globals.node,
				...globals.jest
			},
			sourceType: 'module'
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_' }
			],
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/no-import-type-side-effects': 'error',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-floating-promises': 'warn'
		}
	},
	// Scripts and root files
	{
		extends: [
			js.configs.recommended,
			...tseslint.configs.recommended
		],
		files: ['scripts/**/*.{ts,js,cjs,mjs}'],
		languageOptions: {
			ecmaVersion: 2022,
			globals: globals.node,
			sourceType: 'module'
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_' }
			]
		}
	}
)
