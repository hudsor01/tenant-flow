module.exports = {
	displayName: 'backend',
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: '.',
	testMatch: ['<rootDir>/src/**/*.(test|spec).ts'],
	collectCoverageFrom: [
		'src/**/*.(t|j)s',
		'!src/**/*.spec.ts',
		'!src/**/*.test.ts',
		'!src/main.ts',
		'!src/**/*.module.ts',
		'!src/**/*.interface.ts',
		'!src/**/*.dto.ts'
	],
	coverageDirectory: './coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^@repo/emails/(.*)$': '<rootDir>/../../packages/emails/$1',
		'^@repo/(.*)$': '<rootDir>/../../packages/$1/src'
	},
	setupFilesAfterEnv: ['<rootDir>/src/test/setup-jest.ts'],
	// Environment variables for clean test runs
	setupFiles: ['<rootDir>/src/test/disable-nestjs-logger.ts'],
	testTimeout: 10000,
	maxWorkers: 1, // Prevent race conditions in tests
	testSequencer:
		'<rootDir>/../../node_modules/@jest/test-sequencer/build/index.js',
	verbose: false,
	silent: true,
	// Force V8 coverage provider to avoid babel-plugin-istanbul conflicts
	coverageProvider: 'v8',
	// Modern ts-jest configuration (no more globals deprecation)
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				// Disable babel to avoid conflicts
				useESM: false
			}
		]
	},
	injectGlobals: true,
	// Clear cache and mocks
	clearMocks: true,
	restoreMocks: true
}
