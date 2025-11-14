// Jest configuration file - CommonJS module format required by Jest
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
		'<rootDir>/test/**/*.test.ts',
		'<rootDir>/tests/**/*.spec.ts',
		'<rootDir>/tests/**/*.test.ts'
	],
	testPathIgnorePatterns: [
		'/node_modules/',
		'/dist/',
		'/coverage/',
		'\.integration\.(spec|test)\.ts$'
	],
	collectCoverageFrom: [
		'src/**/*.{ts,js}',
		'!src/**/*.spec.ts',
		'!src/**/*.test.ts',
		'!src/main.ts',
		'!src/**/*.module.ts',
		'!src/**/*.interface.ts',
		'!src/**/*.dto.ts'
	],
	coverageDirectory: './coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	coverageThreshold: {
		global: {
			lines: 80,
			functions: 80,
			branches: 80,
			statements: 80
		}
	},
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^src/(.*)$': '<rootDir>/src/$1',
		'^@react-pdf/renderer$': '<rootDir>/__mocks__/@react-pdf__renderer.js',
		'^uuid$': '<rootDir>/__mocks__/uuid.js',
		'^@repo/shared$': '<rootDir>/../../packages/shared/src/index.ts',
		'^@repo/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
		'^@repo/database/(.*)$': '<rootDir>/../../packages/database/src/$1',
		'^@repo/testing/(.*)$': '<rootDir>/../../packages/testing/src/$1',
		'^\\.\\./(constants|types|validation|utils|config|stripe|lib)/(.*)\\.js$':
			'<rootDir>/../../packages/shared/src/$1/$2.ts'
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	extensionsToTreatAsEsm: ['.ts'],
	resolver: '<rootDir>/jest.resolver.js',
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
		'^.+\\.(ts|tsx)$': [
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
					isolatedModules: true,
					jsx: 'react'
				}
			}
		]
	},
	transformIgnorePatterns: ['node_modules/(?!(uuid|@repo|@supabase)/)'],
	injectGlobals: true
}
