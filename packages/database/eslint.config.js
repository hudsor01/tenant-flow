// @ts-check
import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		ignores: ['**/generated/**', '**/dist/**', '**/*.js', '**/*.d.ts']
	},
	{
		files: ['@/**/*.ts'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': 'warn'
		}
	}
])
