/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
	displayName: 'backend',
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: '.',
	
	// Test discovery
	testMatch: [
		'<rootDir>/src/**/*.spec.ts',
		'<rootDir>/src/**/*.test.ts',
		'<rootDir>/test/**/*.spec.ts',
		'<rootDir>/test/**/*.e2e-spec.ts'
	],
	testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
	
	// Coverage configuration
	collectCoverageFrom: [
		'src/**/*.{ts,js}',
		'!src/**/*.spec.ts',
		'!src/**/*.test.ts',
		'!src/**/*.e2e-spec.ts',
		'!src/main.ts',
		'!src/**/*.module.ts',
		'!src/**/*.interface.ts',
		'!src/**/*.dto.ts',
		'!src/**/*.d.ts'
	],
	coverageDirectory: './coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80
		}
	},
	
	// Module resolution for monorepo
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^@repo/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
		'^@repo/emails/(.*)$': '<rootDir>/../../packages/emails/$1',
		'^@repo/database/(.*)$': '<rootDir>/../../packages/database/$1',
		'^@repo/(.*)$': '<rootDir>/../../packages/$1/src'
	},
	
	// Test setup
	setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
	testTimeout: 15000,
	maxWorkers: 1, // Prevents database conflicts during parallel test execution
	
	// Jest configuration
	verbose: true,
	silent: false,
	clearMocks: true,
	restoreMocks: true,
	resetMocks: true,
	
	// TypeScript configuration (updated to remove deprecations)
	transform: {
		'^.+\\.(ts|tsx)$': [
			'ts-jest',
			{
				tsconfig: '<rootDir>/tsconfig.json',
				useESM: false,
				jsx: 'react-jsx'
			}
		]
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	
	// Performance
	maxConcurrency: 5,
	forceExit: true,
	detectOpenHandles: true,
	
	// Ignore patterns
	transformIgnorePatterns: [
		'/node_modules/(?!(@supabase|@repo)/)'
	]
}