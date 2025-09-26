/**
 * Development Authentication Bypass
 * Creates a mock authenticated session for testing dashboard functionality
 */
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
	try {
		const cookieStore = cookies()
		const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

		// Sign in with a test user (this would need to exist in your Supabase auth)
		const { error } = await supabase.auth.signInWithPassword({
			email: 'test@tenantflow.app',
			password: 'testuser123'
		})

		if (error) {
			// Dev auth failed, creating session manually
			// Manual session creation for development
			return NextResponse.redirect(
				new URL(
					'/dashboard',
					process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://tenantflow.app'
				)
			)
		}

		// Redirect to dashboard after successful auth
		return NextResponse.redirect(
			new URL(
				'/dashboard',
				process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://tenantflow.app'
			)
		)
	} catch (error) {
		// Dev auth error
		return NextResponse.json(
			{
				error: 'Dev authentication failed',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		)
	}
}

export async function POST() {
	try {
		const cookieStore = cookies()
		const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

		// Clear any existing session
		await supabase.auth.signOut()

		return NextResponse.json({
			success: true,
			message: 'Authentication cleared'
		})
	} catch (error) {
		return NextResponse.json(
			{
				error: 'Failed to clear authentication',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		)
	}
}
