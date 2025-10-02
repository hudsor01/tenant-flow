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
			{ tsconfig: path.resolve(__dirname, 'tsconfig.test.json') }
		]
	},
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1'
	},
	// Map workspace packages to their source for testing
	moduleNameMapper: Object.assign(
		{},
		{
			'^@/(.*)$': '<rootDir>/src/$1',
			'^@repo/shared$': '<rootDir>/../../packages/shared/src/index',
			'^@repo/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1'
		}
	)
}
