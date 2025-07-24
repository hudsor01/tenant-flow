import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: [
			'dist',
			'node_modules',
			'eslint.config.mjs',
			'test/**',
			'tests/**',
			'supabase/**',
			'src/api/**/*.js',
			'test-endpoints.js',
			'**/*.test.ts',
			'**/*.spec.ts',
			'**/*.d.ts'
		]
	},
	{
		extends: [
			js.configs.recommended, 
			...tseslint.configs.recommended,
			...tseslint.configs.stylistic
		],
		files: ['src/**/*.ts'],
		languageOptions: {
			ecmaVersion: 2022,
			globals: {
				...globals.node,
				...globals.jest
			},
			sourceType: 'module',
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_' }
			],
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/no-import-type-side-effects': 'error',
			'@typescript-eslint/no-explicit-any': 'warn'
		}
	}
)
