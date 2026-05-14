import { type NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServerClient } from '@supabase/ssr'
import { env } from '#env'
import { updateSession } from '#lib/supabase/middleware'

/** Stripe subscription statuses that grant dashboard access. */
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

/**
 * Private route prefixes that require an authenticated user. Anything NOT
 * in this list is treated as public — including unknown URLs, which then
 * fall through to Next.js so the built-in `not-found.tsx` renders a real
 * 404 page instead of a hostile "redirect to login" loop.
 *
 * Add a prefix here when you ship a new route group that gates on auth.
 * Owner-dashboard prefixes mirror the directories under `src/app/(owner)/`;
 * `/admin/*` is the (admin) route group; `/billing/*` is gated EXCEPT for
 * the checkout + plans subpaths (those are handled inside the subscription
 * gate below).
 */
const PRIVATE_ROUTE_PREFIXES = [
  '/admin',
  '/analytics',
  '/billing',
  '/dashboard',
  '/documents',
  '/financials',
  '/inspections',
  '/leases',
  '/maintenance',
  '/profile',
  '/properties',
  '/reports',
  '/settings',
  '/tenants',
  '/units',
]

function isPrivateRoute(pathname: string): boolean {
  return PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

function redirectWithCookies(
  url: URL,
  supabaseResponse: NextResponse
): NextResponse {
  const redirectResponse = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  return redirectResponse
}

// Next.js 16: proxy.ts replaces deprecated middleware.ts
export async function proxy(
  request: NextRequest
): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  const { user, supabaseResponse } = await updateSession(request)

  // Everything that isn't a known private route — public pages, unknown
  // URLs, blog slugs, comparison pages, etc. — passes through so Next.js
  // can render the matched page or its `not-found.tsx`. Auth-gating
  // arbitrary typo URLs was making `/featres` redirect to `/login` instead
  // of showing a 404, which is hostile UX.
  if (!isPrivateRoute(pathname)) {
    return supabaseResponse
  }

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return redirectWithCookies(url, supabaseResponse)
  }

  // /admin/* is admin-only. The (admin) route group's layout.tsx performs a
  // second server-side is_admin check against public.users.
  if (pathname.startsWith('/admin')) {
    const subClient = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    )
    const { data: row, error } = await subClient
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    // On DB error: fail loud with 500 rather than silently redirecting an
    // admin away. Sentry's Next.js SDK captures the thrown error server-side.
    if (error) {
      Sentry.captureException(error, {
        tags: { component: 'proxy', check: 'admin_gate' },
        extra: { userId: user.id, pathname },
      })
      throw error
    }

    if (!row?.is_admin) {
      return redirectWithCookies(
        new URL('/dashboard', request.url),
        supabaseResponse
      )
    }
  }

  // Subscription gate: authenticated non-admin users need an active or trialing
  // Stripe subscription to reach the dashboard. Allowlist /pricing and Stripe
  // checkout paths so users can subscribe.
  if (
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/pricing') &&
    !pathname.startsWith('/billing/checkout') &&
    !pathname.startsWith('/billing/plans') &&
    !pathname.startsWith('/auth/')
  ) {
    const subClient = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    )
    const { data: row, error } = await subClient
      .from('users')
      .select('subscription_status, is_admin')
      .eq('id', user.id)
      .maybeSingle()

    // Fail loud on DB error — silently redirecting admins to /pricing is
    // the exact bug Sentry flagged. A 500 is the honest response when we
    // can't determine subscription status.
    if (error) {
      Sentry.captureException(error, {
        tags: { component: 'proxy', check: 'subscription_gate' },
        extra: { userId: user.id, pathname },
      })
      throw error
    }

    if (row?.is_admin) return supabaseResponse

    const status = row?.subscription_status as string | null | undefined
    if (!status || !ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
      return redirectWithCookies(
        new URL('/pricing', request.url),
        supabaseResponse
      )
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|monitoring|api/).*)',
  ],
}
