/**
 * @jest-environment jsdom
 */

import { createLogger } from '../../../packages/shared/src/lib/frontend-logger'

const originalNodeEnv = process.env.NODE_ENV

// Mock PostHog
const mockCapture = jest.fn()
const mockPostHog = {
  capture: mockCapture,
}

// Mock console methods
const originalConsole = {
  info: console.info,
  warn: console.warn,
  error: console.error,
}

const mockConsole = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

describe('Frontend Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset console
    console.info = mockConsole.info
    console.warn = mockConsole.warn
    console.error = mockConsole.error

    // Clear window.posthog
    delete (window as any).posthog
    process.env.NODE_ENV = originalNodeEnv ?? 'test'
  })

  afterEach(() => {
    // Restore console
    console.info = originalConsole.info
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    process.env.NODE_ENV = originalNodeEnv ?? 'test'
  })

  describe('PostHog Integration', () => {
    beforeEach(() => {
      // Mock PostHog available on window
      ;(window as any).posthog = mockPostHog
      process.env.NODE_ENV = 'development'
    })

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv ?? 'test'
    })

    it('should send logs to PostHog when available', () => {
      const logger = createLogger({ component: 'TestComponent' })

      logger.info('Test message', {
        action: 'test_action',
        metadata: { key: 'value' }
      })

      expect(mockCapture).toHaveBeenCalledWith('frontend_log', {
        level: 'INFO',
        message: 'Test message',
        component: 'TestComponent',
        action: 'test_action',
        userId: undefined,
        sessionId: undefined,
        metadata: { key: 'value' },
        timestamp: expect.any(String),
        url: 'http://localhost/',
        userAgent: expect.any(String)
      })
    })

    it('should handle PostHog errors gracefully', () => {
      mockCapture.mockImplementation(() => {
        throw new Error('PostHog error')
      })

      const logger = createLogger({ component: 'TestComponent' })

      // Should not throw
      expect(() => {
        logger.info('Test message', { action: 'test' })
      }).not.toThrow()

      // Should fall back to console in development
      expect(mockConsole.info).toHaveBeenCalled()
    })

    it('should include all log levels', () => {
      const logger = createLogger({ component: 'TestComponent' })

      logger.info('Info message', { action: 'info_test' })
      logger.warn('Warn message', { action: 'warn_test' })
      logger.error('Error message', { action: 'error_test' })

      expect(mockCapture).toHaveBeenCalledTimes(3)
      expect(mockCapture).toHaveBeenNthCalledWith(1, 'frontend_log', expect.objectContaining({
        level: 'INFO',
        message: 'Info message'
      }))
      expect(mockCapture).toHaveBeenNthCalledWith(2, 'frontend_log', expect.objectContaining({
        level: 'WARN',
        message: 'Warn message'
      }))
      expect(mockCapture).toHaveBeenNthCalledWith(3, 'frontend_log', expect.objectContaining({
        level: 'ERROR',
        message: 'Error message'
      }))
    })
  })

  describe('Console Fallback', () => {
    beforeEach(() => {
      // No PostHog available
      delete (window as any).posthog
      // Set development environment
      process.env.NODE_ENV = 'development'
    })

    it('should fall back to console when PostHog not available', () => {
      const logger = createLogger({ component: 'TestComponent' })

      logger.info('Test message', { action: 'test', metadata: { key: 'value' } })

      expect(mockCapture).not.toHaveBeenCalled()
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO][TestComponent] Test message'),
        { key: 'value' }
      )
    })

    it('should use appropriate console methods for different levels', () => {
      const logger = createLogger({ component: 'TestComponent' })

      logger.info('Info message', { action: 'info' })
      logger.warn('Warn message', { action: 'warn' })
      logger.error('Error message', { action: 'error' })

      expect(mockConsole.info).toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalled()
      expect(mockConsole.error).toHaveBeenCalled()
    })

    it('should not log debug messages in production', () => {
      process.env.NODE_ENV = 'production'
      const logger = createLogger({ component: 'TestComponent' })

      logger.debug('Debug message', { action: 'debug' })

      expect(mockConsole.info).not.toHaveBeenCalled()
      expect(mockCapture).not.toHaveBeenCalled()
    })
  })

  describe('Context Handling', () => {
    it('should merge default and provided context', () => {
      ;(window as any).posthog = mockPostHog
      const logger = createLogger({
        component: 'TestComponent',
        userId: 'user123'
      })

      logger.info('Test message', {
        action: 'test_action',
        sessionId: 'session456',
        metadata: { extra: 'data' }
      })

      expect(mockCapture).toHaveBeenCalledWith('frontend_log', expect.objectContaining({
        component: 'TestComponent',
        userId: 'user123',
        action: 'test_action',
        sessionId: 'session456',
        metadata: { extra: 'data' }
      }))
    })

    it('should handle missing context gracefully', () => {
      ;(window as any).posthog = mockPostHog
      const logger = createLogger()

      logger.info('Test message')

      expect(mockCapture).toHaveBeenCalledWith('frontend_log', expect.objectContaining({
        message: 'Test message',
        component: undefined,
        action: undefined,
        metadata: undefined
      }))
    })
  })
})
