/**
 * Backend ESLint Configuration - Mixed Turbo Approach
 * Uses centralized base config but with local TypeScript parsing to avoid dependency conflicts
 */

import baseConfig from '@repo/eslint-config/base'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  // Use centralized base config for common rules (ignores, JavaScript only)
  ...baseConfig.filter(config => 
    config.name === 'base/ignores' || 
    config.name === 'base/javascript'
  ),
  
  // Local TypeScript configuration with correct dependency resolution
  {
    name: 'backend/typescript',
    files: ['**/*.ts'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.node,
        ...globals.es2024,
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
        maximumTypeCheckingDepth: 5
      }
    },
    rules: {
      // Backend logging is essential
      'no-console': 'off',
      
      // NestJS specific allowances
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-interface': [
        'error',
        {
          allowSingleExtends: true
        }
      ],
      '@typescript-eslint/no-namespace': 'off', // NestJS uses namespaces for decorators
      
      // Performance overrides - disable expensive rules for existing codebase
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/prefer-as-const': 'off',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      '@typescript-eslint/no-unnecessary-type-arguments': 'off',
      
      // Disable exhaustiveness check since we handle default cases
      '@typescript-eslint/switch-exhaustiveness-check': 'off',
      
      // Already using unknown in catch blocks
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
      
  // Return await not needed for already resolved promises
  '@typescript-eslint/return-await': 'off',

  // Allow unused variables that start with an underscore (common pattern for unused params)
  '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_', 'caughtErrorsIgnorePattern': '^_' }],

  // Relax some stylistic/type rules to reduce noise during migration
  '@typescript-eslint/prefer-nullish-coalescing': 'off',
  '@typescript-eslint/no-explicit-any': 'off'
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