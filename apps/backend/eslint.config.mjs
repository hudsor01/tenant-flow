/**
 * Backend ESLint Configuration - NestJS with Security Focus
 * Extends shared base config with NestJS-specific overrides
 */

import baseConfig from '@repo/eslint-config/base'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  // Use shared base configuration (includes all TypeScript configs and security rules)
  ...baseConfig,
  
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
  
  // Test files - completely permissive  
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
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off'
    }
  }
)