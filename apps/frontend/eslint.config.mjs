/**
 * Frontend ESLint Configuration - Native ESLint 9 Flat Config
 * Uses shared base config from @repo/eslint-config following official best practices
 * 
 * Based on:
 * - ESLint v9 flat config documentation
 * - TypeScript ESLint v8 official recommendations
 * - Next.js 15 + React 19 compatibility
 */

import { FlatCompat } from '@eslint/eslintrc'
import baseConfig from '@repo/eslint-config/base'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

// Next.js official compatibility layer for flat config
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

export default tseslint.config(
  // Use shared base configuration (ignores, JavaScript, TypeScript base rules)
  ...baseConfig,
  
  // Ignore problematic test files that aren't in TypeScript project
  {
    name: 'ignore-orphaned-test-files',
    ignores: [
      'src/components/forms/__tests__/**',
      'src/smoke.spec.tsx',
      'src/test/**',
    ]
  },
  
  // Next.js official configuration (following Next.js docs)
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript'],
    rules: {
      // Disable problematic React rules that block builds
      'react/no-unescaped-entities': 'off', // Allow apostrophes and quotes in JSX text
      '@typescript-eslint/ban-ts-comment': 'warn', // Allow @ts-ignore but with warnings
      
      // Downgrade TypeScript unsafe warnings to not block builds
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    }
  }),
  
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
      
      // Relax some rules for React props and JSX (override base config)
      '@typescript-eslint/no-unsafe-assignment': 'warn', // Downgraded for React props
      '@typescript-eslint/no-unsafe-member-access': 'warn' // Downgraded for React props
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
      // Allow any in tests
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      
      // Allow console in tests
      'no-console': 'off'
    }
  }
)