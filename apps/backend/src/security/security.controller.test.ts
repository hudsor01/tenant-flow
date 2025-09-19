import { SecurityController } from './security.controller'
import type { Logger } from '@nestjs/common'

describe('SecurityController', () => {
  let controller: SecurityController
  let mockLogger: { warn: jest.Mock; log: jest.Mock; error: jest.Mock; debug: jest.Mock } & Logger

  beforeEach(() => {
    mockLogger = {
      warn: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    } as unknown as typeof mockLogger & Logger

    controller = new SecurityController(mockLogger as unknown as Logger)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('handles CSP report and logs warnings', async () => {
    const report = {
      'csp-report': {
        'document-uri': 'https://example.com/page',
        referrer: '',
        'violated-directive': "script-src 'self'",
        'effective-directive': 'script-src',
        'original-policy': "default-src 'none'; script-src 'self'",
        disposition: 'report',
        'blocked-uri': 'https://malicious.example.com/script.js',
        'line-number': 10,
        'column-number': 5,
        'source-file': 'https://example.com/app.js',
        'status-code': 200,
        'script-sample': ''
      }
    }

    await expect(controller.handleCSPReport(report as any)).resolves.toBeUndefined()
    expect(mockLogger.warn).toHaveBeenCalled()
    // first warn call is the summary
    expect(mockLogger.warn.mock.calls[0][0]).toBe('CSP violation reported')
    // second warn call logs detailed CSP Violation
    expect(mockLogger.warn.mock.calls[1][0]).toBe('CSP Violation:')
  })

  it('returns security metrics structure', async () => {
    const res = await controller.getSecurityMetrics()
    expect(res).toHaveProperty('success', true)
    expect(res).toHaveProperty('data')
    expect(res.data).toHaveProperty('events')
    expect(res).toHaveProperty('timestamp')
    expect(mockLogger.log).toHaveBeenCalledWith('Security metrics requested', expect.any(Object))
  })

  it('resolves a security event and logs resolution', async () => {
    const eventId = 'evt-123'
    const body = { resolution: 'marked as false positive' }
    const res = await controller.resolveSecurityEvent(eventId, body)
    expect(res).toHaveProperty('success', true)
    expect(res).toHaveProperty('eventId', eventId)
    expect(res).toHaveProperty('message', 'Security event resolved')
    // verify logging occurred for resolution
    expect(mockLogger.log).toHaveBeenCalled()
    // one of the log calls should include the resolution string
    const logged = mockLogger.log.mock.calls.flat().join(' ')
    expect(logged).toContain(body.resolution)
  })

  it('returns security health with status and alerts', async () => {
    const res = await controller.getSecurityHealth()
    expect(res).toHaveProperty('status')
    expect(res).toHaveProperty('alerts')
    expect(Array.isArray(res.alerts)).toBe(true)
    expect(res).toHaveProperty('metrics')
    expect(res).toHaveProperty('timestamp')
  })

  it('returns dashboard data with overview and trends', async () => {
    const res = await controller.getSecurityDashboard()
    expect(res).toHaveProperty('success', true)
    expect(res).toHaveProperty('data')
    expect(res.data).toHaveProperty('overview')
    expect(res.data).toHaveProperty('trends')
    expect(res).toHaveProperty('timestamp')
  })

  it('returns security status with components and environment', async () => {
    const res = await controller.getSecurityStatus()
    expect(res).toHaveProperty('success', true)
    expect(res).toHaveProperty('components')
    expect(res).toHaveProperty('securityLevel')
    expect(res).toHaveProperty('environment')
    expect(res).toHaveProperty('timestamp')
  })
})
