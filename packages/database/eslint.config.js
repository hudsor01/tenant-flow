import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: ['**/generated/**', '**/dist/**', '**/*.js', '**/*.d.ts']
	},
	...tseslint.configs.recommended,
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parserOptions: {
				project: true
			}
		},
		rules: {
			// Very permissive rules since this package is deprecated
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': 'warn'
		}
	}
)
