// Mock for @sentry/nestjs/setup in Jest tests
const { Module } = require('@nestjs/common')

// Mock SentryModule
const SentryModule = {
	forRoot: () => ({
		module: class MockSentryModule {},
		providers: [],
		exports: []
	})
}

// Mock SentryGlobalFilter
class SentryGlobalFilter {
	catch(exception, host) {
		throw exception
	}
}

module.exports = {
	SentryModule,
	SentryGlobalFilter
}
