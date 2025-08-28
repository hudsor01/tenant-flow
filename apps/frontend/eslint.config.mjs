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
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactPlugin from 'eslint-plugin-react'
import nextPlugin from '@next/eslint-plugin-next'

export default [
  // Use shared base configuration (ignores, JavaScript, TypeScript base rules)
  ...baseConfig,
  
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
  
  // Next.js configuration with official plugin
  {
    name: 'frontend/next-core-rules',
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      react: reactPlugin,
      '@next/next': nextPlugin
    },
    rules: {
      // Core Next.js rules
      'react/no-unescaped-entities': 'off', // Allow apostrophes and quotes in JSX text
      'react/jsx-key': 'error', // Require key prop in lists
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'warn', // Suggest using next/image
      '@next/next/no-sync-scripts': 'error',
      '@next/next/no-head-import-in-document': 'error',
      '@next/next/no-duplicate-head': 'error'
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
