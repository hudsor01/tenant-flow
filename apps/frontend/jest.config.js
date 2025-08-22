const nextJest = require('next/jest')

const createJestConfig = nextJest({
	// Provide the path to your Next.js app to load next.config.js and .env files
	dir: './'
})

// Add any custom config to be passed to Jest
const customJestConfig = {
	displayName: 'frontend',
	setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
	moduleNameMapper: {
		// Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
		'^@/(.*)$': '<rootDir>/src/$1',
		// Handle shared package subdirectory imports
		'^@repo/shared/validation$':
			'<rootDir>/../../packages/shared/src/validation/index',
		'^@repo/shared/validation/(.*)$':
			'<rootDir>/../../packages/shared/src/validation/$1',
		'^@repo/shared/config/(.*)$':
			'<rootDir>/../../packages/shared/src/config/$1',
		'^@repo/shared/config$':
			'<rootDir>/../../packages/shared/src/config/index',
		'^@repo/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
		'^@repo/(.*)$': '<rootDir>/../../packages/$1/src'
	},
	// Automatically mock UI components using __mocks__ directory
	automock: false,
	testEnvironment: 'jest-environment-jsdom',
	testMatch: [
		'<rootDir>/src/**/*.(test|spec).(t|j)s?(x)',
		'<rootDir>/tests/unit/**/*.(test|spec).(t|j)s?(x)'
	],
	testPathIgnorePatterns: [
		'<rootDir>/.next/',
		'<rootDir>/node_modules/',
		'<rootDir>/tests/production/',
		'<rootDir>/tests/visual/',
		'<rootDir>/tests/e2e/',
		'<rootDir>/tests/integration/'
	],
	collectCoverageFrom: [
		'src/**/*.(t|j)s?(x)',
		'!src/**/*.stories.(t|j)s?(x)',
		'!src/**/*.test.(t|j)s?(x)',
		'!src/**/*.spec.(t|j)s?(x)',
		'!src/test/**',
		'!src/**/node_modules/**',
		'!**/coverage/**'
	],
	coverageDirectory: './coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	coverageThreshold: {
		global: {
			branches: 50,
			functions: 50,
			lines: 50,
			statements: 50
		}
	},
	testTimeout: 10000,
	// Use V8 coverage provider instead of babel-plugin-istanbul (Next.js 15+ recommended)
	coverageProvider: 'v8',
	// Clear cache before coverage runs to avoid stale babel transforms
	clearMocks: true,
	restoreMocks: true
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
