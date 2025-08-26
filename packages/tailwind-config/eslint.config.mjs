/**
 * @type {import('eslint').Linter.Config[]}
 */
export default [
	{
		name: '@repo/tailwind-config/javascript',
		files: ['**/*.js', '**/*.mjs'],
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
			globals: {
				process: 'readonly'
			}
		},
		rules: {
			// Config files are allowed to use require if needed
			'@typescript-eslint/no-var-requires': 'off',
			'no-undef': 'off'
		}
	},
	{
		name: '@repo/tailwind-config/ignores',
		ignores: ['node_modules/', 'dist/', '*.css']
	}
]
