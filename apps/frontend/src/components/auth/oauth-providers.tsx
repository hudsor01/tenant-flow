'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface OAuthProvidersProps {
	disabled?: boolean
	onProviderClick?: (_provider: string) => void
}

export function OAuthProviders({
    disabled = false,
    onProviderClick
}: OAuthProvidersProps) {
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    type SupaAuthLike = {
        auth?: {
            signInWithOAuth?: (opts: { provider: string; options?: { redirectTo?: string } }) => Promise<{ error?: { message?: string } }>
        }
    }
    const supa = supabase as unknown as SupaAuthLike
    const canOAuth = Boolean(supa?.auth?.signInWithOAuth)

    const handleGoogleLogin = async () => {
        if (disabled || isGoogleLoading) {
            return
        }

        onProviderClick?.('Google')
        setIsGoogleLoading(true)
        try {
            if (!canOAuth || !supa.auth?.signInWithOAuth) {
                toast.error('OAuth is unavailable in this environment.')
                setIsGoogleLoading(false)
                return
            }

            const _result = await supa.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`
                }
            })
			if (_result.error) {
				toast.error(
					_result.error.message ?? 'Failed to sign in with Google'
				)
				setIsGoogleLoading(false)
			}
			// If successful, Supabase will redirect to the callback URL
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to sign in with Google'
			toast.error(message)
			setIsGoogleLoading(false)
		}
	}

	return (
		<div className="space-y-4">
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
			>
				<Button
					type="button"
					variant="outline"
					className={cn(
						'group relative h-12 w-full overflow-hidden border-2 text-base font-semibold transition-all duration-300',
						'border-input hover:border-primary/30 bg-white hover:bg-gray-1/80',
						'hover:shadow-primary/10 shadow-sm hover:shadow-lg',
						'focus:border-primary focus:shadow-primary/20 focus:shadow-lg',
						isGoogleLoading && 'animate-pulse',
						disabled && 'cursor-not-allowed op-50'
					)}
					onClick={handleGoogleLogin}
                disabled={disabled || isGoogleLoading || !canOAuth}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
				>
					{/* Subtle background animation */}
					<motion.div
						className="absolute inset-0 bg-gradient-to-r from-blue-1/30 via-green-1/30 to-red-1/30 op-0 group-hover:op-100"
						animate={{
							opacity: isHovered ? 0.5 : 0,
							scale: isHovered ? 1.05 : 1
						}}
						transition={{ duration: 0.3 }}
					/>

					<div className="relative flex items-center justify-center gap-3">
						<motion.div
							animate={{
								rotate: isGoogleLoading ? 360 : 0,
								scale: isHovered ? 1.1 : 1
							}}
							transition={{
								rotate: {
									duration: 1,
									repeat: isGoogleLoading ? Infinity : 0,
									ease: 'linear'
								},
								scale: { duration: 0.2 }
							}}
						>
							<svg
								className="h-5 w-5 flex-shrink-0"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									fill="#4285F4"
								/>
								<path
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									fill="#34A853"
								/>
								<path
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									fill="#FBBC05"
								/>
								<path
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									fill="#EA4335"
								/>
							</svg>
						</motion.div>

						<motion.span
							className="text-foreground group-hover:text-primary font-semibold transition-colors duration-200"
							animate={{ x: isHovered ? 2 : 0 }}
							transition={{ duration: 0.2 }}
						>
                        {isGoogleLoading
                            ? 'Connecting...'
                            : canOAuth ? 'Sign up with Google' : 'OAuth unavailable'}
						</motion.span>

						{/* Subtle loading indicator */}
						{isGoogleLoading && (
							<motion.div
								className="absolute right-4"
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
							>
								<div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
							</motion.div>
						)}
					</div>

					{/* Enhanced shimmer effect */}
					<motion.div
						className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent op-0 group-hover:op-100"
						animate={{ x: isHovered ? '100%' : '-100%' }}
						transition={{ duration: 0.8, ease: 'easeInOut' }}
					/>
				</Button>
			</motion.div>

			{/* Trust indicator */}
			<motion.p
				className="text-muted-foreground text-center text-xs"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.2 }}
			>
				Secure authentication powered by Google
			</motion.p>
		</div>
	)
}
