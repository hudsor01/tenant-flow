/**
 * ESLint Anti-Duplication Plugin
 * 
 * Custom ESLint rules to prevent DRY/KISS violations and enforce single source of truth.
 * These rules are part of the CLAUDE.md architectural enforcement system.
 * 
 * Rules:
 * - no-manual-validation-schemas: Prevents manual Zod schemas when auto-generated ones exist
 * - no-duplicate-api-methods: Prevents duplicate API method implementations
 * - enforce-global-loading: Requires use of global loading component
 * - enforce-schema-generation: Ensures schemas are imported from generated files
 */

import noManualValidationSchemas from '../rules/no-manual-validation-schemas.js'
import noDuplicateApiMethods from '../rules/no-duplicate-api-methods.js'
import enforceGlobalLoading from '../rules/enforce-global-loading.js'
import enforceSchemaGeneration from '../rules/enforce-schema-generation.js'

const plugin = {
  meta: {
    name: 'eslint-plugin-anti-duplication',
    version: '1.0.0',
    namespace: 'anti-duplication'
  },
  rules: {
    'no-manual-validation-schemas': noManualValidationSchemas,
    'no-duplicate-api-methods': noDuplicateApiMethods,
    'enforce-global-loading': enforceGlobalLoading,
    'enforce-schema-generation': enforceSchemaGeneration
  }
}

// Add configs after plugin is defined to avoid circular reference
plugin.configs = {
  recommended: {
    plugins: {
      'anti-duplication': plugin
    },
    rules: {
      'anti-duplication/no-manual-validation-schemas': 'error',
      'anti-duplication/no-duplicate-api-methods': 'error', 
      'anti-duplication/enforce-global-loading': 'warn',
      'anti-duplication/enforce-schema-generation': 'error'
    }
  },
  strict: {
    plugins: {
      'anti-duplication': plugin
    },
    rules: {
      'anti-duplication/no-manual-validation-schemas': 'error',
      'anti-duplication/no-duplicate-api-methods': 'error',
      'anti-duplication/enforce-global-loading': 'error',
      'anti-duplication/enforce-schema-generation': 'error'
    }
  }
}

export default plugin