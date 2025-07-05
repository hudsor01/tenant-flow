import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: [
			'dist',
			'tests/**',
			'test/**',
			'src/test/**',
			'src/tests/**',
			'src/types/supabase-generated.ts'
		]
	},
	{
		extends: [
			js.configs.recommended, 
			...tseslint.configs.recommended,
			...tseslint.configs.stylistic
		],
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2022,
			globals: globals.browser,
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
	}
)