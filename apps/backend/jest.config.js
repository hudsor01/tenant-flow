const path = require('path');

module.exports = {
	displayName: 'backend',
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: '.',
	testMatch: [
		'<rootDir>/src/**/*.spec.ts',
		'<rootDir>/src/**/*.test.ts',
		'<rootDir>/test/**/*.spec.ts',
		'<rootDir>/test/**/*.test.ts'
	],
	testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
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
        '^@repo/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
		'^@repo/emails/(.*)$': '<rootDir>/../../packages/emails/$1',
		'^@repo/(.*)$': '<rootDir>/../../packages/$1/src'
	},
	setupFilesAfterEnv: [path.resolve(__dirname, 'test', 'setup.ts')],
	// 'setupFiles': ['<rootDir>/test/disable-nestjs-logger.ts'],
	testTimeout: 10000,
	maxWorkers: 1,
	testSequencer:
		'<rootDir>/../../node_modules/@jest/test-sequencer/build/index.js',
	verbose: false,
	silent: true,
	clearMocks: true,
	restoreMocks: true,
	bail: false,
	coverageProvider: 'v8',
	transform: {
		'^.+\.ts$': [
			'ts-jest',
			{
				useESM: false
			}
		]
	},
	injectGlobals: true,
	clearMocks: true,
	restoreMocks: true
}