'use client'

import { GoogleButton } from '#components/auth/google-button'
import { createLogger } from '#lib/frontend-logger.js'
import { createClient } from '#lib/supabase/client'
import { useState } from 'react'

const logger = createLogger({ component: 'LoginOAuth' })

export function LoginOAuth() {
	const [isGoogleLoading, setIsGoogleLoading] = useState(false)

	const handleGoogleLogin = async () => {
		setIsGoogleLoading(true)
		try {
			const supabase = createClient()
			const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`

			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: { redirectTo: redirectUrl }
			})

			if (error) {
				logger.error('[GOOGLE_LOGIN_FAILED]', { error: error.message })
			}
		} catch (error) {
			logger.error('[GOOGLE_LOGIN_ERROR]', {
				error: error instanceof Error ? error.message : String(error)
			})
		} finally {
			setIsGoogleLoading(false)
		}
	}

	return (
		<>
			{/* Divider */}
			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t border-border/60" />
				</div>
				<div className="relative flex justify-center text-xs">
					<span className="bg-background px-3 text-muted-foreground">
						or continue with
					</span>
				</div>
			</div>

			{/* Google Button */}
			<GoogleButton
				onClick={handleGoogleLogin}
				isLoading={isGoogleLoading}
				mode="login"
				className="w-full"
			/>
		</>
	)
}
