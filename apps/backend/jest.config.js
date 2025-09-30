/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */
const path = require('path')
const fs = require('fs')

// Check if setup file exists
const setupFile = path.resolve(__dirname, 'test/setup.ts')
const setupFilesAfterEnv = fs.existsSync(setupFile) ? [setupFile] : []

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
		'@/**/*.(t|j)s',
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
		'^@repo/(.*)$': '<rootDir>/../../packages/$1/src',
		'^(\\.{1,2}/.*)\\.js$': '$1'
	},
	setupFilesAfterEnv,
	testTimeout: 10000,
	maxWorkers: 1,
	verbose: false,
	silent: true,
	clearMocks: true,
	restoreMocks: true,
	bail: false,
	coverageProvider: 'v8',
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				useESM: false,
				tsconfig: {
					module: 'commonjs',
					target: 'es2022',
					moduleResolution: 'nodenext',
					allowSyntheticDefaultImports: true,
					esModuleInterop: true,
					skipLibCheck: true,
					forceConsistentCasingInFileNames: true,
					strict: true,
					isolatedModules: true
				}
			}
		]
	},
	transformIgnorePatterns: ['node_modules/(?!(@repo|@supabase)/)'],
	injectGlobals: true
}
