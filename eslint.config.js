/**
 * TenantFlow ESLint Configuration
 * Single flat config covering all project code.
 *
 * Sections:
 *   1. Global ignores
 *   2. Base TS + Prettier + barrel-file rules
 *   3. Test relaxations
 *   4. Config/script relaxations
 *   5. Next.js plugin (recommended + core-web-vitals)
 *   6. React hooks + TanStack Query
 *   7. Color tokens (design system enforcement)
 *   8. Structured logging (no-console)
 *   9. Anti-patterns + security guards
 *  10. E2E test relaxations
 */

import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import tanstackQueryPlugin from '@tanstack/eslint-plugin-query'
import { defineConfig } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'
import noBarrelFiles from 'eslint-plugin-no-barrel-files'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { createRequire } from 'module'
import colorTokensPlugin from './color-tokens.eslint.js'

const require = createRequire(import.meta.url)
const noAdminClientBypass = require('./rules/no-admin-client-bypass.cjs')

export default defineConfig([
	// ── 1. Global ignores ──────────────────────────────────────────────
	{
		name: 'global/ignores',
		ignores: [
			'**/dist/**',
			'**/build/**',
			'**/out/**',
			'**/.next/**',
			'**/coverage/**',
			'**/node_modules/**',
			'**/.vercel/**',
			'**/.railway/**',
			'**/*.generated.ts',
			'**/*.d.ts',
			'**/supabase/functions/**',
			'**/supabase/migrations/**',
			'**/types/frontend-only.ts',
			'**/test/production-api.test.ts',
			'**/stripe-signing-secret.ts',
			'**/.env.local',
			'**/.env.development.local',
			'.github/**',
			'public/**',
			'playwright-report/**',
			'test-results/**'
		]
	},

	// ── 2. Base: JS recommended + Prettier + typescript-eslint + barrel files ──
	{
		...js.configs.recommended,
		rules: {
			...js.configs.recommended.rules,
			'no-dupe-keys': 'off'
		}
	},
	eslintConfigPrettier,
	...tseslint.configs.recommended,
	noBarrelFiles.flat,

	{
		name: 'base/barrel-file-exceptions',
		files: [
			'**/test/utils/**/*.ts',
			'**/test/utils/**/*.tsx',
			'**/components/ui/**/*.tsx',
			'**/hooks/**/*.ts',
			'**/lib/formatters/**/*.ts',
			'**/lib/env/**/*.ts',
			'**/types/**/*.ts',
			'**/schemas/**/*.ts',
			'**/config/**/*.ts',
			'**/columns.tsx'
		],
		rules: {
			'no-barrel-files/no-barrel-files': 'off'
		}
	},

	// ── 2b. Base TypeScript rules (all .ts/.tsx) ───────────────────────
	{
		name: 'base/typescript',
		files: ['**/*.ts', '**/*.tsx'],
		ignores: ['**/*.d.ts'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
				...globals.es2024,
				Stripe: 'readonly',
				supabase: 'readonly'
			}
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrors: 'none'
				}
			],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ prefer: 'type-imports' }
			],
			'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
			'prefer-const': 'error',
			'no-var': 'error',
			eqeqeq: ['error', 'always']
		}
	},

	// ── 3. Test relaxations ────────────────────────────────────────────
	{
		name: 'base/tests',
		files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
		languageOptions: {
			parserOptions: { projectService: false }
		},
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unused-vars': 'off'
		}
	},
	{
		name: 'base/test-support-files',
		files: ['tests/**/*.ts', 'tests/**/*.tsx', 'src/test/**/*.ts', 'src/test/**/*.tsx'],
		languageOptions: {
			parserOptions: { projectService: false }
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off'
		}
	},

	// ── 4. Config/script relaxations ───────────────────────────────────
	{
		name: 'base/config-scripts',
		files: [
			'**/*.config.ts',
			'**/*.config.js',
			'**/*.config.mjs',
			'**/scripts/**/*.ts',
			'**/scripts/**/*.cjs',
			'**/scripts/**/*.js',
			'*.js',
			'*.mjs',
			'*.ts'
		],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-var-requires': 'off',
			'no-restricted-globals': 'off',
			'no-console': 'off'
		},
		languageOptions: {
			globals: { ...globals.node },
			parserOptions: {
				project: null,
				allowDefaultProject: true
			}
		}
	},
	{
		name: 'base/env-files',
		files: ['**/.env*.ts', '**/env*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-var-requires': 'off',
			'no-console': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off'
		}
	},
	{
		name: 'base/eslint-config-files',
		files: ['eslint.config.js', '*.config.js', '*.config.mjs'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
				...globals.es2024,
				process: 'readonly'
			}
		}
	},

	// ── 5. Next.js plugin ──────────────────────────────────────────────
	{
		name: 'nextjs/core-rules',
		files: ['src/**/*.{ts,tsx}'],
		plugins: {
			'@next/next': nextPlugin
		},
		rules: {
			...nextPlugin.configs.recommended.rules,
			...nextPlugin.configs['core-web-vitals'].rules,
			'@next/next/no-img-element': 'off'
		},
		settings: {
			next: { rootDir: import.meta.dirname }
		}
	},

	// ── 6. React hooks + TanStack Query ────────────────────────────────
	{
		name: 'frontend/react-typescript',
		files: ['src/**/*.{ts,tsx}'],
		plugins: {
			'react-hooks': reactHooksPlugin,
			'@tanstack/query': tanstackQueryPlugin
		},
		languageOptions: {
			parserOptions: {
				ecmaFeatures: { jsx: true }
			},
			globals: {
				React: 'readonly',
				JSX: 'readonly'
			}
		},
		settings: {
			react: { version: '19.2.0' }
		},
		rules: {
			'@typescript-eslint/consistent-type-imports': 'off',
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',
			'@typescript-eslint/no-empty-interface': ['error', { allowSingleExtends: true }],
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_'
				}
			],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unused-expressions': 'warn',
			...tanstackQueryPlugin.configs.recommended.rules
		}
	},
	{
		name: 'frontend/app-router',
		files: ['src/app/**/*.ts', 'src/app/**/*.tsx'],
		rules: {
			'import/no-default-export': 'off',
			'@typescript-eslint/require-await': 'off'
		}
	},
	{
		name: 'frontend/tanstack-library-exceptions',
		files: [
			'**/tenants-table.client.tsx',
			'**/data-table.tsx',
			'**/use-data-table-instance.ts'
		],
		rules: {
			'react-hooks/incompatible-library': 'off'
		}
	},

	// ── 7. Color tokens ────────────────────────────────────────────────
	{
		name: 'frontend/design-system-color-tokens',
		files: ['src/**/*.{ts,tsx}'],
		ignores: ['**/design-system/**', '**/shared/**', '**/opengraph-image.*'],
		plugins: {
			'color-tokens': colorTokensPlugin
		},
		rules: {
			'color-tokens/no-hex-colors': 'error'
		}
	},

	// ── 8. Structured logging ──────────────────────────────────────────
	{
		name: 'frontend/no-console-logging',
		files: ['src/**/*.{ts,tsx}'],
		ignores: [
			'**/*.test.*',
			'**/*.spec.*',
			'**/*.config.*',
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/next.config.*'
		],
		rules: {
			'no-console': 'warn',
			'no-restricted-syntax': [
				'warn',
				{
					selector: 'MemberExpression[object.name="console"]',
					message:
						'Direct console access is discouraged. Consider using structured logging via createLogger() instead.'
				},
				{
					selector: 'CallExpression[callee.object.name="console"]',
					message:
						'Console method calls are discouraged. Consider structured logging: const logger = createLogger({ component: "ComponentName" }); logger.info/warn/error("message")'
				}
			]
		}
	},
	{
		name: 'frontend/logging-implementation-exception',
		files: ['src/shared/lib/frontend-logger.ts'],
		rules: {
			'no-console': 'off'
		}
	},
	{
		name: 'frontend/tests-strict-no-console',
		files: [
			'src/**/*.test.ts',
			'src/**/*.test.tsx',
			'src/**/*.spec.ts',
			'src/**/*.spec.tsx'
		],
		rules: {
			'no-console': 'error'
		}
	},

	// ── 9. Anti-patterns + security guards ─────────────────────────────
	{
		name: 'security/anti-patterns',
		files: ['**/*.ts', '**/*.tsx'],
		ignores: [
			'**/*.test.*',
			'**/*.spec.*',
			'**/*.config.*',
			'**/test/**',
			'**/tests/**',
			'**/documents/templates/components/**'
		],
		plugins: {
			'no-admin-client-bypass': {
				rules: { 'no-admin-client-bypass': noAdminClientBypass }
			}
		},
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/factory/**', '**/*factory*', '**/*Factory*'],
							message: 'Factory patterns are prohibited. Use direct library usage instead.'
						},
						{
							group: ['**/form-patterns*', '**/form-factory*'],
							message: 'Use React Hook Form directly. Form abstractions are prohibited.'
						},
						{
							group: ['**/query-factory*', '**/api-factory*'],
							message: 'Use TanStack Query directly. Query factories are prohibited.'
						},
						{
							group: ['jotai', '**/atoms/**'],
							message: 'Jotai was replaced with Zustand. Use stores/app-store.ts instead.'
						},
						{
							group: ['framer-motion', 'components/*'],
							message: 'Framer Motion is not allowed. Use motion (formerly framer-motion).'
						}
					]
				}
			],
			'no-restricted-syntax': [
				'error',
				{
					selector: 'TSEnumDeclaration',
					message:
						'TypeScript enums are prohibited. Use Supabase database enums instead. See CLAUDE.md.'
				},
				{
					selector:
						'CallExpression[callee.object.property.name="useQuery"] > ObjectExpression > Property[key.name="queryFn"] CallExpression[callee.name="fetch"]',
					message:
						'Client-side fetch on mount is prohibited. Use Server Components for initial data fetching.'
				},
				{
					selector:
						'CallExpression[callee.name="useEffect"] > ArrowFunctionExpression > BlockStatement CallExpression[callee.name="fetch"]',
					message:
						'useEffect + fetch is prohibited. Use Server Components or TanStack Query hooks.'
				}
			],
			'no-restricted-globals': [
				'error',
				{ name: 'eval', message: 'eval() is dangerous and should not be used' }
			],
			'no-eval': 'error',
			'no-implied-eval': 'error',
			'no-script-url': 'error',
			'no-new-func': 'error',
			'no-prototype-builtins': 'error',
			'guard-for-in': 'error',
			radix: 'error'
		}
	},
	{
		name: 'security/enum-exception',
		files: ['src/shared/types/security.ts'],
		rules: {
			'no-restricted-syntax': 'off'
		}
	},

	// ── 10. E2E test relaxations ───────────────────────────────────────
	{
		name: 'e2e/test-files',
		files: ['tests/e2e/**/*.ts'],
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unused-vars': 'off'
		}
	},
	{
		name: 'e2e/logging-exception',
		files: ['tests/e2e/lib/frontend-logger.ts'],
		rules: {
			'no-console': 'off'
		}
	}
])
