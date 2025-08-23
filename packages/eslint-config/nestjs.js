/**
 * NestJS + Fastify specific ESLint configuration for TenantFlow backend
 * 
 * Extends base configuration with NestJS and Node.js specific rules
 * following official NestJS TypeScript starter best practices.
 */

import globals from 'globals'
import baseConfig from './base.js'

export default [
	...baseConfig,
	{
		files: ['**/*.ts'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest
			}
		},
		rules: {
			// NestJS and backend specific rules
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-empty-interface': 'off',

			// Backend logging is acceptable
			'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],

			// Backend specific best practices
			'no-return-await': 'error',
			'no-duplicate-imports': 'error',
			'sort-imports': [
				'error',
				{
					ignoreCase: true,
					ignoreDeclarationSort: true,
					ignoreMemberSort: false,
					memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single']
				}
			]
		}
	},
	{
		// Service and controller files
		files: ['**/*.service.ts', '**/*.controller.ts'],
		rules: {
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-explicit-any': 'warn' // Slightly relaxed for decorators
		}
	},
	{
		// Configuration and module files
		files: ['**/*.config.ts', '**/*.module.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off' // Config files may need any types
		}
	},
	{
		// DTO and entity files
		files: ['**/*.dto.ts', '**/*.entity.ts', '**/*.interface.ts'],
		rules: {
			'@typescript-eslint/no-empty-interface': 'off' // DTOs may have empty interfaces
		}
	}
]