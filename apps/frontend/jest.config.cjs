const path = require('path')

module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'jest-environment-jsdom',
	rootDir: '.',
	setupFilesAfterEnv: ['<rootDir>/src/test/jest.setup.ts'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	transform: {
		'^.+\\.(ts|tsx)$': [
			'ts-jest',
			{
				tsconfig: {
					jsx: 'react-jsx',
					module: 'commonjs',
					esModuleInterop: true,
					allowSyntheticDefaultImports: true,
					target: 'ES2020',
					lib: ['ES2020', 'DOM', 'DOM.Iterable'],
					skipLibCheck: true,
					strict: false,
					moduleResolution: 'node'
				},
				diagnostics: false,
				isolatedModules: true
			}
		]
	},
	// Map workspace packages to their source for testing
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^@repo/shared$': '<rootDir>/../../packages/shared/src/index',
		'^@repo/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
		'\\.(css|less|scss|sass)$': 'identity-obj-proxy'
	},
	testMatch: [
		'<rootDir>/tests/components/**/*.test.tsx',
		'<rootDir>/src/components/**/*.test.tsx',
		'<rootDir>/tests/**/*.test.tsx',
		'<rootDir>/src/**/*.test.tsx',
		'<rootDir>/tests/**/*.spec.tsx',
		'<rootDir>/src/**/*.spec.tsx'
	],
	transformIgnorePatterns: [
		'node_modules/(?!(sucrase|@tanstack|@supabase)/)'
	],
	collectCoverageFrom: [
		'src/**/*.{ts,tsx}',
		'!src/**/*.d.ts',
		'!src/**/*.stories.tsx',
		'!src/test/**/*'
	]
}
