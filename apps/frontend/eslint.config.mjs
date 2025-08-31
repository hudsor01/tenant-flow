/**
 * Frontend ESLint Configuration - Native ESLint 9 Flat Config
 * Uses shared base config from @repo/eslint-config following official best practices
 * 
 * Based on:
 * - ESLint v9 flat config documentation
 * - TypeScript ESLint v8 official recommendations
 * - Next.js 15 + React 19 compatibility
 */

import baseConfig from '@repo/eslint-config/base'
import antiDuplicationRules from '@repo/eslint-config/rules/anti-duplication'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactPlugin from 'eslint-plugin-react'
import nextPlugin from '@next/eslint-plugin-next'

export default [
  // Use shared base configuration (ignores, JavaScript, TypeScript base rules)
  ...baseConfig,
  
  // Anti-duplication rules configuration
  {
    name: 'frontend/anti-duplication-plugin',
    plugins: {
      'anti-duplication': antiDuplicationRules
    }
  },
  
  // Ignore problematic test files that aren't in TypeScript project
  {
    name: 'ignore-orphaned-test-files',
    ignores: [
      'src/components/forms/__tests__/**',
      'src/components/tenants/__tests__/**',
      'src/hooks/api/__tests__/**',
      'tests/e2e/**',
      'vitest.config.production.ts',
      'src/lib/auth/__tests__/**',
      'src/smoke.spec.tsx',
      'src/test/**',
      '*.config.js', // All JavaScript config files don't need TypeScript type checking
      '*.config.mjs', // All ES module config files
      '*.config.cjs', // All CommonJS config files
      'public/**', // Public directory contains plain JavaScript service workers
      '.next/**', // Next.js build directory
      'coverage/**', // Test coverage directory
      'jest.config.js',
      'eslint.config.mjs', 
      'next-sitemap.config.js',
      'vitest.config.ts',
      'playwright.config.ts', // Playwright config file
      'scripts/**', // CLI scripts are allowed to use console
    ]
  },
  
  // Next.js configuration - direct plugin usage for flat config
  // NOTE: Next.js may still show "plugin was not detected" warning during build.
  // This is a known limitation (Next.js Issue #73655) - the detection logic hasn't
  // been updated for ESLint 9 flat config yet. The configuration below is correct
  // and linting works properly. The warning is cosmetic only.
  {
    name: 'frontend/next-plugin',
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      '@next/next': nextPlugin
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // Override strict rules to match our existing patterns
      'react/no-unescaped-entities': 'off', // Allow apostrophes and quotes in JSX text
      '@next/next/no-img-element': 'warn' // Suggest using next/image but don't error
    }
  },
  
  // Anti-duplication rules for hooks and API files
  {
    name: 'frontend/anti-duplication-strict',
    files: ['src/hooks/**/*.ts', 'src/hooks/**/*.tsx', 'src/lib/api/**/*.ts'],
    rules: {
      'anti-duplication/no-duplicate-function-implementations': [
        'error',
        {
          similarity: 0.75, // Strict for hooks
          minLength: 8
        }
      ],
      'anti-duplication/no-repeated-component-logic': 'error',
      'anti-duplication/no-similar-api-endpoints': 'error'
    }
  },
  
  // Anti-duplication rules for general files
  {
    name: 'frontend/anti-duplication-general',
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Disabled per CLAUDE.md principles - these encourage unnecessary abstractions
      'anti-duplication/no-duplicate-function-implementations': 'off',
      'anti-duplication/no-repeated-config-patterns': 'off',
      'anti-duplication/no-repeated-component-logic': 'off'
    }
  },
  
  // React and Frontend specific configuration
  {
    name: 'frontend/react-typescript',
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'react-hooks': reactHooksPlugin
    },
    languageOptions: {
      parserOptions: {
        // Add JSX support to base TypeScript config
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Next.js specific globals (base config already has browser/node/es2024)
        React: 'readonly',
        JSX: 'readonly'
      }
    },
    settings: {
      react: {
        version: '19.1.1'
      },
      next: {
        rootDir: import.meta.dirname
      }
    },
    rules: {
      // React 19 specific rules (not covered by base config)
      'react/react-in-jsx-scope': 'off', // Not needed in React 19
      'react/jsx-uses-react': 'off', // Not needed in React 19
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // Allow some flexibility for React component patterns
      '@typescript-eslint/no-empty-interface': ['error', {
        allowSingleExtends: true
      }],
      
      // Disable unsafe rules for React props and JSX (override base config)
      '@typescript-eslint/no-unsafe-assignment': 'off', // Disabled for React props
      '@typescript-eslint/no-unsafe-member-access': 'off', // Disabled for React props  
      '@typescript-eslint/no-unsafe-call': 'off', // Disabled for React props
      '@typescript-eslint/no-unsafe-return': 'off', // Disabled for React props
      '@typescript-eslint/no-unsafe-argument': 'off' // Disabled for React props
    }
  },
  
  // App Router specific configuration
  {
    name: 'frontend/app-router',
    files: ['app/**/*.ts', 'app/**/*.tsx'],
    rules: {
      // App Router pages can export default functions
      'import/no-default-export': 'off',
      
      // Server Components can be async
      '@typescript-eslint/require-await': 'off'
    }
  },
  
  // Test files - more permissive
  {
    name: 'frontend/tests',
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/test/**/*.ts',
      '**/test/**/*.tsx'
    ],
    rules: {
      // Allow any and unsafe operations in tests
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      
      // Allow console in tests
      'no-console': 'off'
    }
  }
]
