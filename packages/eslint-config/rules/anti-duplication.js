/**
 * Anti-Duplication ESLint Configuration
 *
 * Extends base config with custom DRY/KISS enforcement rules.
 * Use this config when you want strict anti-duplication checking.
 */

import baseConfig from '../base.js'
import antiDuplicationRules from './anti-duplication.js'

export default [
	// Include all base configurations first
	...baseConfig,

	// Add custom anti-duplication plugin and rules
	{
		name: 'anti-duplication/plugin-registration',
		plugins: {
			'anti-duplication': antiDuplicationRules
		}
	},

	// Configure anti-duplication rules for TypeScript files
	{
		name: 'anti-duplication/typescript-rules',
		files: ['**/*.ts', '**/*.tsx'],
		rules: {
			// Function duplication detection (warning level to start)
			'anti-duplication/no-duplicate-function-implementations': [
				'warn',
				{
					similarity: 0.85, // 85% similarity threshold
					minLength: 10 // Minimum function length to check
				}
			],

			// Configuration pattern detection
			'anti-duplication/no-repeated-config-patterns': 'warn',

			// API endpoint similarity detection
			'anti-duplication/no-similar-api-endpoints': 'warn',

			// React component logic duplication
			'anti-duplication/no-repeated-component-logic': 'warn'
		}
	},

	// More aggressive rules for hooks directory (where reusability is critical)
	{
		name: 'anti-duplication/hooks-strict',
		files: ['**/hooks/**/*.ts', '**/hooks/**/*.tsx'],
		rules: {
			'anti-duplication/no-duplicate-function-implementations': [
				'error', // Error level for hooks
				{
					similarity: 0.75, // Lower threshold for hooks
					minLength: 5
				}
			],
			'anti-duplication/no-repeated-component-logic': 'error'
		}
	},

	// Wrapper-only enforcement for core logic (strict)
	{
		name: 'anti-duplication/no-wrapper-core',
		files: [
			'apps/**/src/app/actions/**/*.{ts,tsx}',
			'apps/**/src/lib/**/*.{ts,tsx}',
			'apps/**/src/hooks/**/*.{ts,tsx}',
			'apps/**/src/stores/**/*.{ts,tsx}',
			'apps/**/src/services/**/*.{ts,tsx}',
			'packages/shared/src/**/*.{ts,tsx}',
			'apps/backend/src/**/*.{ts,tsx}'
		],
		excludedFiles: [
			'**/*.spec.ts',
			'**/*.spec.tsx',
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.stories.tsx',
			'**/generated/**',
			'**/icons/**'
		],
		rules: {
			'anti-duplication/no-wrapper-only': [
				'error',
				{ allowMarker: '@wrapper-allowed', minLines: 2 }
			]
		}
	},

	// Wrapper-only enforcement for components (can be switched to 'warn' if desired)
	{
		name: 'anti-duplication/no-wrapper-components',
		files: ['apps/frontend/src/components/**/*.{ts,tsx}'],
		excludedFiles: ['**/*.stories.tsx', '**/generated/**', '**/icons/**'],
		rules: {
			'anti-duplication/no-wrapper-only': [
				'error',
				{ allowMarker: '@wrapper-allowed', minLines: 2 }
			]
		}
	},

	// API client files should have strict endpoint checking
	{
		name: 'anti-duplication/api-strict',
		files: ['**/api/**/*.ts', '**/api-client.ts', '**/lib/api/**/*.ts'],
		rules: {
			'anti-duplication/no-similar-api-endpoints': 'error',
			'anti-duplication/no-repeated-config-patterns': 'error'
		}
	},

	// Configuration files can have some duplication (they often need similar patterns)
	{
		name: 'anti-duplication/config-relaxed',
		files: ['**/*.config.ts', '**/*.config.js', '**/*.config.mjs'],
		rules: {
			'anti-duplication/no-repeated-config-patterns': 'off',
			'anti-duplication/no-duplicate-function-implementations': 'off'
		}
	}
]
