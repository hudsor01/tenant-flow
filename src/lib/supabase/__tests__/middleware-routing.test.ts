import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

// ── Mocks ──────────────────────────────────────────────────

const mockUpdateSession = vi.fn()

vi.mock('#lib/supabase/middleware', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}))

// Mock next/server for NextResponse.redirect
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
        const cookies = new Map<string, { name: string; value: string }>()
        return {
          status: 307,
          headers: new Headers({ Location: url.toString() }),
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
        }
      }),
    },
  }
})

// Import must be after mocks
import { proxy } from '#proxy'
import { NextResponse } from 'next/server'

// Helper: build a minimal NextRequest-like object
function buildRequest(pathname: string): NextRequest {
  const url = new URL(pathname, 'http://localhost:3050')
  // NextURL has a clone() method that standard URL doesn't
  const nextUrl = Object.assign(url, {
    clone: () => new URL(url.toString()),
  })
  const cookieStore = new Map<string, { name: string; value: string }>()

  return {
    nextUrl,
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

function makeUser(userType?: string, stripeCustomerId?: string): User {
  const appMetadata: Record<string, unknown> = userType ? { user_type: userType } : {}
  if (stripeCustomerId) {
    appMetadata.stripe_customer_id = stripeCustomerId
  }
  return {
    id: 'user-123',
    app_metadata: appMetadata,
    aud: 'authenticated',
    created_at: '2026-01-01',
  } as User
}

function makeSupabaseResponse() {
  const cookies = new Map<string, { name: string; value: string }>()
  return {
    _isSupabaseResponse: true,
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

// ── Routing tests ──────────────────────────────────────────

describe('proxy routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('public routes', () => {
    it.each(['/login', '/pricing', '/blog', '/blog/some-post', '/'])(
      'bypasses auth check for %s',
      async (route) => {
        const supabaseResponse = makeSupabaseResponse()
        mockUpdateSession.mockResolvedValue({
          user: null,
          supabaseResponse,
        })

        const result = await proxy(buildRequest(route))

        // Should return supabaseResponse directly (no redirect)
        expect(result).toBe(supabaseResponse)
        expect(NextResponse.redirect).not.toHaveBeenCalled()
      }
    )
  })

  describe('unauthenticated access', () => {
    it('redirects unauthenticated user on /dashboard to /login?redirect=/dashboard', async () => {
      mockUpdateSession.mockResolvedValue({
        user: null,
        supabaseResponse: makeSupabaseResponse(),
      })

      await proxy(buildRequest('/dashboard'))

      expect(NextResponse.redirect).toHaveBeenCalledOnce()
      const calls = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls
      const redirectUrl = calls[0]![0] as URL
      expect(redirectUrl.pathname).toBe('/login')
      expect(redirectUrl.searchParams.get('redirect')).toBe('/dashboard')
    })
  })

  describe('role-based enforcement', () => {
    it('redirects TENANT user on /dashboard to /tenant', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser('TENANT'),
        supabaseResponse: makeSupabaseResponse(),
      })

      await proxy(buildRequest('/dashboard'))

      expect(NextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
        .mock.calls[0]![0] as URL
      expect(redirectUrl.pathname).toBe('/tenant')
    })

    it('redirects OWNER user on /tenant to /dashboard', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser('OWNER'),
        supabaseResponse: makeSupabaseResponse(),
      })

      await proxy(buildRequest('/tenant'))

      expect(NextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
        .mock.calls[0]![0] as URL
      expect(redirectUrl.pathname).toBe('/dashboard')
    })

    it('redirects PENDING user on /dashboard to /auth/select-role', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser('PENDING'),
        supabaseResponse: makeSupabaseResponse(),
      })

      await proxy(buildRequest('/dashboard'))

      expect(NextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
        .mock.calls[0]![0] as URL
      expect(redirectUrl.pathname).toBe('/auth/select-role')
    })

    it('allows ADMIN user on /dashboard to pass through', async () => {
      const supabaseResponse = makeSupabaseResponse()
      mockUpdateSession.mockResolvedValue({
        user: makeUser('ADMIN'),
        supabaseResponse,
      })

      const result = await proxy(buildRequest('/dashboard'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(result).toBe(supabaseResponse)
    })

    it('allows authenticated OWNER with stripe_customer_id on /dashboard to pass through', async () => {
      const supabaseResponse = makeSupabaseResponse()
      mockUpdateSession.mockResolvedValue({
        user: makeUser('OWNER', 'cus_test'),
        supabaseResponse,
      })

      const result = await proxy(buildRequest('/dashboard'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(result).toBe(supabaseResponse)
    })

    it('allows authenticated TENANT on /tenant to pass through', async () => {
      const supabaseResponse = makeSupabaseResponse()
      mockUpdateSession.mockResolvedValue({
        user: makeUser('TENANT'),
        supabaseResponse,
      })

      const result = await proxy(buildRequest('/tenant'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(result).toBe(supabaseResponse)
    })
  })

  describe('subscription gate for OWNER', () => {
    it('redirects OWNER without stripe_customer_id on /dashboard to /pricing', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser('OWNER'),
        supabaseResponse: makeSupabaseResponse(),
      })

      await proxy(buildRequest('/dashboard'))

      expect(NextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
        .mock.calls[0]![0] as URL
      expect(redirectUrl.pathname).toBe('/pricing')
    })

    it('redirects OWNER without stripe_customer_id on /dashboard/properties to /pricing', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser('OWNER'),
        supabaseResponse: makeSupabaseResponse(),
      })

      await proxy(buildRequest('/dashboard/properties'))

      expect(NextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
        .mock.calls[0]![0] as URL
      expect(redirectUrl.pathname).toBe('/pricing')
    })

    it('allows OWNER without stripe_customer_id on /pricing to pass through', async () => {
      const supabaseResponse = makeSupabaseResponse()
      mockUpdateSession.mockResolvedValue({
        user: makeUser('OWNER'),
        supabaseResponse,
      })

      const result = await proxy(buildRequest('/pricing'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(result).toBe(supabaseResponse)
    })

    it('allows OWNER without stripe_customer_id on /billing/checkout to pass through', async () => {
      const supabaseResponse = makeSupabaseResponse()
      mockUpdateSession.mockResolvedValue({
        user: makeUser('OWNER'),
        supabaseResponse,
      })

      const result = await proxy(buildRequest('/billing/checkout'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(result).toBe(supabaseResponse)
    })

    it('does not affect TENANT user (no stripe check)', async () => {
      const supabaseResponse = makeSupabaseResponse()
      mockUpdateSession.mockResolvedValue({
        user: makeUser('TENANT'),
        supabaseResponse,
      })

      const result = await proxy(buildRequest('/tenant'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(result).toBe(supabaseResponse)
    })

    it('does not affect ADMIN user (no stripe check)', async () => {
      const supabaseResponse = makeSupabaseResponse()
      mockUpdateSession.mockResolvedValue({
        user: makeUser('ADMIN'),
        supabaseResponse,
      })

      const result = await proxy(buildRequest('/dashboard'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(result).toBe(supabaseResponse)
    })
  })

  describe('cookie preservation on redirects', () => {
    it('copies supabase cookies to redirect response', async () => {
      const supabaseResponse = makeSupabaseResponse()
      supabaseResponse.cookies.set('sb-token', 'session-value')

      mockUpdateSession.mockResolvedValue({
        user: null,
        supabaseResponse,
      })

      await proxy(buildRequest('/dashboard'))

      expect(NextResponse.redirect).toHaveBeenCalledOnce()

      // The proxy should copy cookies from supabaseResponse to redirect response
      const redirectResponse = (
        NextResponse.redirect as ReturnType<typeof vi.fn>
      ).mock.results[0]!.value
      const redirectCookies = redirectResponse.cookies.getAll()
      expect(redirectCookies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'sb-token', value: 'session-value' }),
        ])
      )
    })
  })
})
