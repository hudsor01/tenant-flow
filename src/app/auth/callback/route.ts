/**
 * Auth Callback Route
 *
 * Handles multiple Supabase auth callback flows:
 * 1. OAuth (Google) - exchanges authorization code for session
 * 2. Email confirmation - verifies token_hash from confirmation email
 * 3. Password recovery - exchanges code for session (handled by update-password page)
 *
 * For first-time Google OAuth users (user_type PENDING or unset):
 * - Checks for pending tenant invitations matching the user's email
 * - If found: auto-accepts the invitation and routes to /tenant
 * - If not found: routes to /auth/select-role for manual role selection
 *
 * CRITICAL: This route is essential for Google OAuth and email confirmation to work.
 */

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '#shared/types/supabase'
import { env } from '#env'

/**
 * Valid OTP types for Supabase auth verification.
 * AUTH-15: Validated before calling verifyOtp to prevent unnecessary network calls.
 */
export const VALID_OTP_TYPES = ['signup', 'email', 'recovery', 'magiclink', 'invite'] as const
type ValidOtpType = typeof VALID_OTP_TYPES[number]

export function isValidOtpType(type: string | null): type is ValidOtpType {
	return type !== null && type !== '' && (VALID_OTP_TYPES as readonly string[]).includes(type)
}

/**
 * Build the redirect URL using NEXT_PUBLIC_APP_URL or request origin.
 * AUTH-13: x-forwarded-host is intentionally ignored to prevent host header injection attacks.
 */
function buildRedirectUrl(
	_request: NextRequest,
	origin: string,
	path: string
): string {
	const siteUrl = process.env.NEXT_PUBLIC_APP_URL || origin
	return `${siteUrl}${path}`
}

/**
 * Determine dashboard route based on user_type from session metadata
 */
function getDashboardRoute(userType: string | undefined): string {
	if (userType === 'TENANT') return '/tenant'
	if (userType === 'PENDING' || !userType) return '/auth/select-role'
	return '/dashboard'
}

/**
 * Check for pending tenant invitations matching the user's email
 * and auto-accept if found. Uses service role for cross-tenant reads.
 *
 * Returns the invitation code if found, null otherwise.
 */
async function findAndAcceptPendingInvitation(
	userId: string,
	email: string,
	accessToken: string
): Promise<boolean> {
	try {
		const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
		if (!serviceRoleKey) {
			// Service role key not configured, skip invitation auto-linking
			return false
		}

		// Use service role to bypass RLS for reading tenant_invitations
		const serviceClient = createClient<Database>(
			env.NEXT_PUBLIC_SUPABASE_URL,
			serviceRoleKey
		)

		// Find a pending invitation for this email
		const { data: invitation } = await serviceClient
			.from('tenant_invitations')
			.select('invitation_code')
			.eq('email', email.toLowerCase())
			.eq('status', 'pending')
			.gt('expires_at', new Date().toISOString())
			.limit(1)
			.single()

		if (!invitation?.invitation_code) return false

		// Call the tenant-invitation-accept Edge Function
		const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
		const response = await fetch(
			`${supabaseUrl}/functions/v1/tenant-invitation-accept`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${accessToken}`
				},
				body: JSON.stringify({
					code: invitation.invitation_code
				})
			}
		)

		if (!response.ok) return false

		// Update user_type to TENANT in public.users
		// The sync trigger will propagate to auth.users.raw_app_meta_data
		await serviceClient
			.from('users')
			.update({ user_type: 'TENANT' })
			.eq('id', userId)

		return true
	} catch {
		// Non-fatal: if invitation check fails, user goes to role selection
		return false
	}
}

export async function GET(request: NextRequest) {
	const { searchParams, origin } = new URL(request.url)
	const code = searchParams.get('code')
	const tokenHash = searchParams.get('token_hash')
	const type = searchParams.get('type')
	const nextParam = searchParams.get('next')
	// Validate that `next` is a relative path to prevent open redirect attacks.
	// Must start with "/" but not "//" (which browsers interpret as protocol-relative URLs).
	const next =
		nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
			? nextParam
			: '/dashboard'

	const cookieStore = await cookies()

	const supabase = createServerClient<Database>(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
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

	// Handle email confirmation via token_hash
	if (tokenHash && type) {
		// AUTH-15: Validate OTP type against allowlist before calling Supabase
		if (!isValidOtpType(type)) {
			return NextResponse.redirect(buildRedirectUrl(request, origin, '/auth/callback?error=invalid_type'))
		}

		const { data, error } = await supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type
		})

		if (!error && data?.session) {
			// For signup confirmation: route to dashboard based on user_type
			if (type === 'signup' || type === 'email') {
				const userType = data.session.user.app_metadata?.user_type as
					| string
					| undefined
				const destination = getDashboardRoute(userType)
				return NextResponse.redirect(
					buildRedirectUrl(request, origin, destination)
				)
			}

			// For password recovery: route to update-password page
			if (type === 'recovery') {
				return NextResponse.redirect(
					buildRedirectUrl(request, origin, '/auth/update-password')
				)
			}
		}

		// Verification failed - redirect to confirm-email with error
		if (type === 'signup' || type === 'email') {
			return NextResponse.redirect(
				buildRedirectUrl(
					request,
					origin,
					'/auth/confirm-email?error=invalid_token'
				)
			)
		}

		// Recovery token failed - redirect to update-password with error hash
		return NextResponse.redirect(
			buildRedirectUrl(
				request,
				origin,
				'/auth/update-password#error=access_denied&error_description=This+link+has+expired+or+is+invalid'
			)
		)
	}

	// Handle OAuth code exchange (Google, etc.)
	if (code) {
		const { data, error } = await supabase.auth.exchangeCodeForSession(code)

		if (!error && data?.session) {
			// AUTH-08: OAuth provider (Google) is trusted for email verification.
			// No additional email_confirmed_at check required per user decision.
			const userType = data.session.user.app_metadata?.user_type as
				| string
				| undefined
			const userEmail = data.session.user.email
			const userId = data.session.user.id
			const accessToken = data.session.access_token

			// For PENDING or unset user_type: check for pending invitations
			if (
				(userType === 'PENDING' || !userType) &&
				userEmail
			) {
				const invitationAccepted = await findAndAcceptPendingInvitation(
					userId,
					userEmail,
					accessToken
				)

				if (invitationAccepted) {
					// Invitation auto-linked, route to tenant dashboard
					return NextResponse.redirect(
						buildRedirectUrl(request, origin, '/tenant')
					)
				}

				// No invitation found, route to role selection
				return NextResponse.redirect(
					buildRedirectUrl(request, origin, '/auth/select-role')
				)
			}

			// User has a known role, route to their dashboard
			const destination =
				userType === 'TENANT' ? '/tenant' : next

			return NextResponse.redirect(
				buildRedirectUrl(request, origin, destination)
			)
		}
	}

	// Auth error - redirect to login with error param
	return NextResponse.redirect(
		buildRedirectUrl(request, origin, '/login?error=oauth_failed')
	)
}
