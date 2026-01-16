// Mock for @sentry/nestjs in Jest tests
module.exports = {
	init: jest.fn(),
	captureException: jest.fn(),
	captureMessage: jest.fn(),
	setTag: jest.fn(),
	setUser: jest.fn(),
	setContext: jest.fn(),
	addBreadcrumb: jest.fn(),
	startSpan: jest.fn((_, callback) => callback()),
	SentryCron: () => () => {},
	withScope: jest.fn(callback => callback({ setTag: jest.fn() }))
}
