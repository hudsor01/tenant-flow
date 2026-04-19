import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

const mockUpdateSession = vi.fn()

vi.mock('#lib/supabase/middleware', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}))

// Mocks the user row lookup used by proxy.ts for subscription + is_admin checks.
let mockUserRow: { subscription_status?: string | null; is_admin?: boolean } | null = null
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockUserRow, error: null }),
        }),
      }),
    }),
  }),
}))

vi.mock('#env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'http://test',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  },
}))

vi.mock('next/server', () => {
  function makeResponse() {
    const cookies = new Map<string, { name: string; value: string }>()
    return {
      cookies: {
        set: (name: string, value: string) => {
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
            set: (name: string, value: string) => {
              cookies.set(name, { name, value })
            },
            getAll: () => [...cookies.values()],
          },
        }
      }),
    },
  }
})

import { proxy } from '#proxy'
import { NextResponse } from 'next/server'

function buildRequest(pathname: string): NextRequest {
  const url = new URL(pathname, 'http://localhost:3050')
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

function makeUser(): User {
  return {
    id: 'user-123',
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01',
  } as User
}

function makeSupabaseResponse() {
  const cookies = new Map<string, { name: string; value: string }>()
  return {
    _isSupabaseResponse: true,
    cookies: {
      set: (name: string, value: string) => {
        cookies.set(name, { name, value })
      },
      getAll: () => [...cookies.values()],
    },
    headers: new Headers(),
  }
}

describe('proxy routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserRow = null
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

  describe('admin routes', () => {
    it('redirects non-admin user on /admin to /dashboard', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser(),
        supabaseResponse: makeSupabaseResponse(),
      })
      mockUserRow = { is_admin: false, subscription_status: 'active' }

      await proxy(buildRequest('/admin/analytics'))

      expect(NextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
        .mock.calls[0]![0] as URL
      expect(redirectUrl.pathname).toBe('/dashboard')
    })

    it('allows is_admin=true user on /admin to pass through', async () => {
      const supabaseResponse = makeSupabaseResponse()
      mockUpdateSession.mockResolvedValue({
        user: makeUser(),
        supabaseResponse,
      })
      mockUserRow = { is_admin: true }

      const result = await proxy(buildRequest('/admin/analytics'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(result).toBe(supabaseResponse)
    })
  })

  describe('subscription gate', () => {
    it('allows user with active subscription on /dashboard to pass through', async () => {
      const supabaseResponse = makeSupabaseResponse()
      mockUpdateSession.mockResolvedValue({
        user: makeUser(),
        supabaseResponse,
      })
      mockUserRow = { is_admin: false, subscription_status: 'active' }

      const result = await proxy(buildRequest('/dashboard'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(result).toBe(supabaseResponse)
    })

    it('allows user with trialing subscription on /dashboard to pass through', async () => {
      const supabaseResponse = makeSupabaseResponse()
      mockUpdateSession.mockResolvedValue({
        user: makeUser(),
        supabaseResponse,
      })
      mockUserRow = { is_admin: false, subscription_status: 'trialing' }

      const result = await proxy(buildRequest('/dashboard'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(result).toBe(supabaseResponse)
    })

    it('redirects user with past_due subscription to /pricing', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser(),
        supabaseResponse: makeSupabaseResponse(),
      })
      mockUserRow = { is_admin: false, subscription_status: 'past_due' }

      await proxy(buildRequest('/dashboard'))

      expect(NextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
        .mock.calls[0]![0] as URL
      expect(redirectUrl.pathname).toBe('/pricing')
    })

    it('redirects user with no subscription on /dashboard to /pricing', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser(),
        supabaseResponse: makeSupabaseResponse(),
      })
      mockUserRow = { is_admin: false, subscription_status: null }

      await proxy(buildRequest('/dashboard'))

      expect(NextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
        .mock.calls[0]![0] as URL
      expect(redirectUrl.pathname).toBe('/pricing')
    })

    it.each(['/pricing', '/billing/checkout', '/billing/plans'])(
      'allows user without subscription on %s (allowlist)',
      async (route) => {
        const supabaseResponse = makeSupabaseResponse()
        mockUpdateSession.mockResolvedValue({
          user: makeUser(),
          supabaseResponse,
        })
        mockUserRow = { is_admin: false, subscription_status: null }

        const result = await proxy(buildRequest(route))

        expect(NextResponse.redirect).not.toHaveBeenCalled()
        expect(result).toBe(supabaseResponse)
      }
    )

    it('redirects user without subscription on /settings (non-allowlisted)', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser(),
        supabaseResponse: makeSupabaseResponse(),
      })
      mockUserRow = { is_admin: false, subscription_status: null }

      await proxy(buildRequest('/settings'))

      expect(NextResponse.redirect).toHaveBeenCalledOnce()
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
        .mock.calls[0]![0] as URL
      expect(redirectUrl.pathname).toBe('/pricing')
    })

    it('admin user bypasses subscription gate', async () => {
      const supabaseResponse = makeSupabaseResponse()
      mockUpdateSession.mockResolvedValue({
        user: makeUser(),
        supabaseResponse,
      })
      mockUserRow = { is_admin: true, subscription_status: null }

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
