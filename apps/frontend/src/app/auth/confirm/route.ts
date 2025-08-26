import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
<<<<<<< HEAD
	const tokenHash = searchParams.get('token_hash')
=======
	const token_hash = searchParams.get('token_hash')
>>>>>>> origin/main
	const type = searchParams.get('type') as EmailOtpType | null
	const _next = searchParams.get('next')
	const next = _next?.startsWith('/') ? _next : '/'

<<<<<<< HEAD
	if (tokenHash && type) {
=======
	if (token_hash && type) {
>>>>>>> origin/main
		const { supabase } = createClient(request)

		const { error } = await supabase.auth.verifyOtp({
			type,
<<<<<<< HEAD
			token_hash: tokenHash
=======
			token_hash
>>>>>>> origin/main
		})
		if (!error) {
			// redirect user to specified redirect URL or root of app
			redirect(next)
		} else {
			// redirect the user to an error page with some instructions
<<<<<<< HEAD
			redirect(`/auth/error?error=${error.message}`)
=======
			redirect(`/auth/error?error=${error?.message}`)
>>>>>>> origin/main
		}
	}

	// redirect the user to an error page with some instructions
	redirect(`/auth/error?error=No token hash or type`)
}
