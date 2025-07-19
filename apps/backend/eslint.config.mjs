import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
// import turbo from 'eslint-plugin-turbo' // Temporarily disabled for ESLint 9 compatibility

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
	// TypeScript files
	{
		extends: [
			js.configs.recommended, 
			...tseslint.configs.recommended,
			...tseslint.configs.stylistic
			// turbo.configs.recommended // Temporarily disabled for ESLint 9 compatibility
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
