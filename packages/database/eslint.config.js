import tseslint from 'typescript-eslint'

export default tseslint.config({
  files: ['**/*.ts'],
  ignores: ['src/generated/**/*', 'dist/**/*'],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      project: true
    }
  },
  rules: {
    // Very permissive rules since this package is deprecated
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off'
  }
})