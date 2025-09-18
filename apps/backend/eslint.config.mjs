/**
 * Backend ESLint Configuration - NestJS with Security Focus
 * Extends shared base config with NestJS-specific overrides
 */

import baseConfig from '@repo/eslint-config/base.js'
import globals from 'globals'

export default [
  // Use shared base configuration (includes all TypeScript configs and security rules)
  ...baseConfig,
  
  // Backend-specific ignores for files not in TypeScript project
  {
    name: 'backend/ignores',
    ignores: [
      'test/**/*',
      'vitest.config.ts',
      'jest.config.js'
    ]
  },
  
  
  // Backend-specific TypeScript configuration overrides
  {
    name: 'backend/nestjs-overrides',
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        // Override to use backend-specific tsconfig
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        // Additional Node.js specific globals (base already has node, browser, es2024)
        NodeJS: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly'
      }
    },
    settings: {
      'typescript-eslint': {
        projectService: true,
        maximumTypeCheckingDepth: 5 // Higher than base config's 3
      }
    },
    rules: {
      // Backend logging is essential (override base config)
      'no-console': 'off',
      
      // NestJS framework allowances
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off', // NestJS decorators create empty methods
      '@typescript-eslint/no-namespace': 'off', // NestJS uses namespaces for decorators
      
      // SECURITY: Keep most unsafe rules as warnings (not completely off) 
      '@typescript-eslint/no-unsafe-assignment': 'warn', // Downgrade but keep active
      '@typescript-eslint/no-unsafe-member-access': 'warn', // Downgrade but keep active
      '@typescript-eslint/no-unsafe-call': 'warn', // Downgrade but keep active
      '@typescript-eslint/no-unsafe-return': 'warn', // Downgrade but keep active
      '@typescript-eslint/no-unsafe-argument': 'warn', // Downgrade but keep active
      
      // Performance-only overrides (these don't affect security)
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-base-to-string': 'off'
    }
  },
  
  // Controllers and Decorators - very permissive
  {
    name: 'backend/controllers',
    files: ['**/*.controller.ts', '**/*.resolver.ts', '**/*.gateway.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false
        }
      ]
    }
  },
  
  // DTOs and Entities
  {
    name: 'backend/dto-entities',
    files: ['**/*.dto.ts', '**/*.entity.ts', '**/*.interface.ts', '**/*.schema.ts'],
    rules: {
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-unused-vars': 'off', // DTOs might have unused fields
      '@typescript-eslint/consistent-indexed-object-style': ['warn', 'record'],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface']
    }
  },
  
  // Test files - use production rules to catch bugs early
  {
    name: 'backend/tests',
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node
      }
    },
    rules: {
      // Only allow console in tests (for debugging)
      'no-console': 'off',
      // Test files are allowed to use unsafe operations for mocking
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off'
    }
  },
  
  // JavaScript files - Node.js environment
  {
    name: 'backend/javascript-node',
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly'
      },
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-undef': 'off', // Turn off since globals handles this
      'no-console': 'off', // Allow console in Node.js scripts
      '@typescript-eslint/no-require-imports': 'off', // Allow require in JS files
      '@typescript-eslint/no-var-requires': 'off' // Allow var requires in JS files
    }
  },
  
  // Config files and scripts - very permissive
  {
    name: 'backend/config-scripts',
    files: ['*.config.js', '*.config.mjs', '*.config.ts', 'scripts/**/*.js', 'scripts/**/*.mjs', 'scripts/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'no-undef': 'off'
    }
  }
]