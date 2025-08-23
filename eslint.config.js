// Enhanced ESLint config aligned with simplified frontend methodology
// Prevents reintroduction of anti-patterns eliminated during refactoring

import storybook from "eslint-plugin-storybook";
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config({
    ignores: [
        '**/dist/**',
        '**/node_modules/**',
        '**/coverage/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.d.ts',
        '**/vite.config.ts',
        'apps/frontend/src/routeTree.gen.ts',
        'apps/frontend/src/types/backend-app-router.d.ts',
        'apps/backend/test-endpoints.js',
        'apps/backend/src/auth/auth-production-diagnostic.ts',
        'apps/backend/supabase/functions/**/*',
        'apps/backend/test/email/**/*',
        '.turbo/**',
        '.next/**',
        'scripts/**/*.js',
        '**/*.js',
        '**/*.mjs',
        '**/*.cjs',
        'apps/frontend/.next/**',
        'apps/frontend/src/test/**',
        'apps/frontend/tests/**',
        'apps/frontend/scripts/**',
        '**/playwright-report/**',
        '**/test-results/**'
    ]
}, {
    extends: [
        js.configs.recommended,
        ...tseslint.configs.recommended,
        ...tseslint.configs.stylistic
    ],
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
        ecmaVersion: 2022,
        globals: {
            ...globals.node,
            ...globals.browser,
            ...globals.es2021
        },
        parser: tseslint.parser,
        parserOptions: {
            project: true,
            tsconfigRootDir: import.meta.dirname
        }
    },
    rules: {
        // ============================================================================
        // EXISTING RULES (ENHANCED)
        // ============================================================================
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_'
            }
        ],
        '@typescript-eslint/consistent-type-imports': [
            'error',
            {
                prefer: 'type-imports',
                fixStyle: 'inline-type-imports'
            }
        ],
        '@typescript-eslint/no-import-type-side-effects': 'error',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'no-debugger': 'error',
        'prefer-const': 'error',
        'no-var': 'error',
        'eqeqeq': ['error', 'always'],

        // ============================================================================
        // NEW ANTI-PATTERN GUARDS (DRY/KISS/No-Abstractions)
        // ============================================================================

        // Prevent thin wrapper functions around useAtomValue/useSetAtom
        'no-restricted-syntax': [
            'error',
            {
                selector: 'ExportNamedDeclaration ArrowFunctionExpression[params.length=0] CallExpression[callee.name="useAtomValue"]',
                message: 'Avoid thin wrapper functions around useAtomValue. Use useAtomValue directly in components.'
            },
            {
                selector: 'ExportNamedDeclaration ArrowFunctionExpression[params.length=0] CallExpression[callee.name="useSetAtom"]',
                message: 'Avoid thin wrapper functions around useSetAtom. Use useSetAtom directly in components.'
            },
            {
                selector: 'ExportNamedDeclaration ArrowFunctionExpression[params.length=0] CallExpression[callee.name="useAtom"]',
                message: 'Avoid thin wrapper functions around useAtom. Use useAtom directly in components.'
            }
        ],

        // Prevent factory pattern reintroduction
        'no-restricted-patterns': [
            'error',
            {
                group: ['**/factory/**', '**/*factory*', '**/*Factory*'],
                message: 'Factory patterns are prohibited. Use direct library usage instead.'
            }
        ],

        // Enforce direct React Hook Form usage
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    {
                        group: ['**/form-patterns*', '**/form-factory*', '**/form-builder*'],
                        message: 'Use React Hook Form directly. Form abstractions are prohibited.'
                    },
                    {
                        group: ['**/query-factory*', '**/api-factory*'],
                        message: 'Use TanStack Query directly. Query factories are prohibited.'
                    },
                    {
                        group: ['**/useCheckout*'],
                        message: 'useCheckout.ts was eliminated. Use api/use-billing.ts hooks instead.'
                    }
                ]
            }
        ],

        // Enforce TanStack Query direct usage
        'prefer-direct-query-usage': 'off', // Custom rule placeholder

        // Prevent duplicate API patterns
        'no-duplicate-api-methods': 'off', // Custom rule placeholder

        // ============================================================================
        // REACT 19 + MODERN PATTERNS
        // ============================================================================

        // Prefer React 19 use() hook over custom wrappers
        'prefer-react-19-patterns': 'off', // Custom rule placeholder

        // Encourage Server Components where possible
        'prefer-server-components': 'off', // Custom rule placeholder

        // ============================================================================
        // PERFORMANCE & BUNDLE SIZE
        // ============================================================================

        // Warn on large imports that could be tree-shaken
        'import/no-namespace': 'off', // Would need eslint-plugin-import

        // Prefer specific imports over barrel exports for better tree-shaking
        'prefer-specific-imports': 'off', // Custom rule placeholder

        // ============================================================================
        // SECURITY & PRODUCTION READINESS
        // ============================================================================

        // Enhanced security rules
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-script-url': 'error',

        // Prevent unsafe DOM manipulation
        'no-innerHTML': 'off', // Would need custom rule

        // Enforce proper error handling
        '@typescript-eslint/prefer-promise-reject-errors': 'error',
        'prefer-promise-reject-errors': 'off',

        // ============================================================================
        // NAMING CONVENTIONS (SIMPLIFIED)
        // ============================================================================

        '@typescript-eslint/naming-convention': [
            'error',
            {
                selector: 'variableLike',
                format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
                leadingUnderscore: 'allow'
            },
            {
                selector: 'typeLike',
                format: ['PascalCase']
            },
            {
                selector: 'function',
                filter: {
                    regex: '^use[A-Z]',
                    match: true
                },
                format: ['camelCase'],
                custom: {
                    regex: '^use[A-Z][a-zA-Z]*$',
                    match: true
                }
            }
        ]
    }
}, {
    // Stricter rules for shared packages
    files: ['packages/**/*.ts'],
    rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/explicit-function-return-type': [
            'error',
            {
                allowExpressions: true,
                allowTypedFunctionExpressions: true,
                allowHigherOrderFunctions: true
            }
        ]
    }
}, {
    // Frontend-specific rules
    files: ['apps/frontend/**/*.{ts,tsx}'],
    rules: {
        // Prevent anti-patterns specific to frontend
        'no-restricted-syntax': [
            'error',
            {
                selector: 'ImportDeclaration[source.value=/factory/i]',
                message: 'Factory pattern imports are prohibited. Use direct library usage.'
            },
            {
                selector: 'ImportDeclaration[source.value=/wrapper/i]',
                message: 'Wrapper pattern imports are prohibited. Use libraries directly.'
            },
            {
                selector: 'CallExpression[callee.name=/Factory$/]',
                message: 'Factory function calls are prohibited. Use direct instantiation.'
            }
        ],

        // Enforce proper hook usage
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',

        // Prevent state management anti-patterns
        'no-multiple-state-managers': 'off', // Custom rule placeholder
    }
}, storybook.configs["flat/recommended"]);