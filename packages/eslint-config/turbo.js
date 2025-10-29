/**
 * Turborepo ESLint Configuration
 * 
 * Validates environment variables used in code are declared in turbo.json
 * Prevents cache misses from undeclared environment variables
 * 
 * @see https://turbo.build/repo/docs/reference/eslint-config-turbo
 */

import turboConfig from 'eslint-config-turbo/flat'

export default turboConfig
