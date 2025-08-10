module.exports = {
  root: true,
  env: {
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '*.css',
    '.eslintrc.js',
  ],
  rules: {
    // Config files are allowed to use require
    '@typescript-eslint/no-var-requires': 'off',
    'no-undef': 'off',
  },
}