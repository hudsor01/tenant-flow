/**
 * Next.js API Route Authentication Utilities (Cookie-Based)

 * ️ IMPORTANT: This file is ONLY for Next.js API routes (e.g., /api/security/csp-report)
 * DO NOT USE for backend API authentication (Railway NestJS backend)

 * Architecture:
 * - Next.js API routes: Use this file (cookie-based, same-domain)
 * - Backend API routes: Use clientFetch() with Authorization headers (cross-domain)

 * Official Supabase pattern for Next.js App Router API routes:
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	SUPABASE_URL,
	SUPABASE_PUBLISHABLE_KEY
} from '@repo/shared/config/supabase'

const logger = createLogger({ component: 'ApiAuth' })

/**
 * Authentication result for API routes
 */
export interface ApiAuthResult {
	user: User | null
	error?: string
	supabase: ReturnType<typeof createServerClient<Database>>
}

/**
 * Create authenticated Supabase client for API routes
 * Following official Supabase App Router pattern
 */
export async function createApiClient(): Promise<ApiAuthResult> {
	const cookieStore = await cookies()

	const supabase = createServerClient<Database>(
		SUPABASE_URL,
		SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options)
						)
					} catch {
						// The `setAll` method was called from a Server Component.
						// This can be ignored if you have middleware refreshing
						// user sessions.
					}
				}
			}
		}
	)

	try {
		const {
			data: { user },
			error
		} = await supabase.auth.getUser()

	if (error) {
		logger.warn('Supabase auth.getUser returned an error', {
			errorCode: error.code,
			errorStatus: error.status
		})

		return {
			user: null,
			error: 'Authentication validation failed',
			supabase
		}
	}

		return {
			user,
			supabase
		}
	} catch (error) {
		const familiarName =
			error instanceof Error ? error.name || error.constructor.name : typeof error
		logger.error('Unexpected error validating Supabase session', {
			error: familiarName
		})

		return {
			user: null,
			error: 'Authentication validation failed',
			supabase
		}
	}
}

/**
 * Require authentication for API route
 * Returns 401 response if user is not authenticated
 */
export async function requireAuth(): Promise<
	| { user: User; supabase: ReturnType<typeof createServerClient<Database>> }
	| NextResponse
> {
	const { user, error, supabase } = await createApiClient()

	if (!user || error) {
		return NextResponse.json(
			{
				success: false,
				error: 'Authentication required',
				message: error || 'User not authenticated'
			},
			{ status: 401 }
		)
	}

	return { user, supabase }
}

/**
 * Create error response for API routes
 */
export function createApiError(
	message: string,
	status: number = 400,
	error?: string
): NextResponse {
	return NextResponse.json(
		{
			success: false,
			error: error || 'Request failed',
			message
		},
		{ status }
	)
}

/**
 * Create success response for API routes
 */
export function createApiSuccess<T = unknown>(
	data: T,
	message?: string
): NextResponse {
	return NextResponse.json({
		success: true,
		data,
		...(message && { message })
	})
}
