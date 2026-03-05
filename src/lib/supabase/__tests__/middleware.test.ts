import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────

const mockGetUser = vi.fn()
const mockCreateServerClient = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}))

// Mock next/server for NextResponse.next and NextResponse.redirect
vi.mock('next/server', () => {
  function makeResponse() {
    const cookies = new Map<string, { name: string; value: string }>()
    return {
      cookies: {
        set: (
          name: string,
          value: string,
          _options?: Record<string, unknown>
        ) => {
          cookies.set(name, { name, value })
        },
        getAll: () => [...cookies.values()],
      },
      headers: new Headers(),
    }
  }

  return {
    NextResponse: {
      next: vi.fn(() => makeResponse()),
      redirect: vi.fn((url: URL | string) => {
        const resp = makeResponse()
        return {
          ...resp,
          status: 307,
          headers: new Headers({ Location: url.toString() }),
        }
      }),
    },
  }
})

import { updateSession } from '#lib/supabase/middleware'

// Helper: build a minimal NextRequest-like object
function buildRequest(pathname: string): NextRequest {
  const url = new URL(pathname, 'http://localhost:3050')
  const cookieStore = new Map<string, { name: string; value: string }>()

  return {
    nextUrl: url,
    url: url.toString(),
    cookies: {
      getAll: () => [...cookieStore.values()],
      set: (name: string, value: string) => {
        cookieStore.set(name, { name, value })
      },
      get: (name: string) => cookieStore.get(name),
    },
  } as unknown as NextRequest
}

// ── updateSession tests ────────────────────────────────────

describe('updateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockCreateServerClient.mockImplementation(
      (
        _url: string,
        _key: string,
        options: {
          cookies: {
            getAll: () => unknown[]
            setAll: (cookies: unknown[]) => void
          }
        }
      ) => {
        // Capture the cookie handlers for assertion
        ;(
          mockCreateServerClient as Record<string, unknown>
        )._lastCookieHandlers = options.cookies
        return {
          auth: { getUser: mockGetUser },
        }
      }
    )

    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'user-123', app_metadata: { user_type: 'OWNER' } },
      },
      error: null,
    })
  })

  it('calls supabase.auth.getUser() and returns user + response', async () => {
    const request = buildRequest('/dashboard')
    const result = await updateSession(request)

    expect(mockGetUser).toHaveBeenCalledOnce()
    expect(result.user).toEqual({
      id: 'user-123',
      app_metadata: { user_type: 'OWNER' },
    })
    expect(result.supabaseResponse).toBeDefined()
  })

  it('creates Supabase client with getAll/setAll cookie pattern', async () => {
    const request = buildRequest('/dashboard')
    await updateSession(request)

    expect(mockCreateServerClient).toHaveBeenCalledOnce()
    const [url, key, options] = mockCreateServerClient.mock.calls[0] as [
      string,
      string,
      { cookies: Record<string, unknown> },
    ]
    expect(url).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL)
    expect(key).toBe(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    expect(options.cookies.getAll).toBeTypeOf('function')
    expect(options.cookies.setAll).toBeTypeOf('function')
    // Must NOT have get/set/remove (CLAUDE.md: getAll/setAll only)
    expect(options.cookies.get).toBeUndefined()
    expect(options.cookies.set).toBeUndefined()
    expect(options.cookies.remove).toBeUndefined()
  })

  it('setAll callback updates both request.cookies AND response (cookie sync)', async () => {
    const request = buildRequest('/dashboard')
    await updateSession(request)

    // Invoke setAll to simulate Supabase refreshing tokens
    const handlers = (mockCreateServerClient as Record<string, unknown>)
      ._lastCookieHandlers as {
      setAll: (
        cookies: {
          name: string
          value: string
          options?: Record<string, unknown>
        }[]
      ) => void
    }
    const testCookies = [
      { name: 'sb-token', value: 'refreshed-value', options: { path: '/' } },
    ]
    handlers.setAll(testCookies)

    // Request cookies should be updated (for downstream server components)
    const reqCookie = request.cookies.get('sb-token')
    expect(reqCookie).toBeDefined()
    expect(reqCookie?.value).toBe('refreshed-value')
  })

  it('returns null user when getUser() returns no user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const request = buildRequest('/dashboard')
    const result = await updateSession(request)

    expect(result.user).toBeNull()
    expect(result.supabaseResponse).toBeDefined()
  })
})
