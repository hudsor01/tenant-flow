'use client'

import { useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { loginFormAction } from '@/app/actions/auth'
import { OAuthProviders } from '@/components/auth/oauth-providers'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LoginFormProps {
	redirectTo?: string
}

export function LoginForm({
    redirectTo = '/dashboard'
}: LoginFormProps) {
    const [state, formAction, isPending] = useActionState(loginFormAction, {
        success: false
    })
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    useEffect(() => {
        if (state.success) {
            if (typeof window !== 'undefined') {
                const current = window.location.pathname
                if (redirectTo && redirectTo !== current) {
                    router.push(redirectTo)
                } else {
                    router.refresh()
                }
            } else {
                router.refresh()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.success])

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="space-y-1">
				<CardTitle className="text-center text-2xl font-bold">
					Welcome back
				</CardTitle>
				<CardDescription className="text-center">
					Sign in to your TenantFlow account
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* OAuth Providers */}
				<OAuthProviders disabled={isPending} />

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<Separator />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="text-muted-foreground bg-white px-2">
							Or continue with email
						</span>
					</div>
				</div>

				{/* Email/Password Form */}
				<form action={formAction} className="space-y-4">
					<input type="hidden" name="redirectTo" value={redirectTo} />

					<div className="space-y-2">
						<label htmlFor="email" className="text-sm font-medium">
							Email address
						</label>
						<Input
							id="email"
							name="email"
							type="email"
							placeholder="Enter your email"
							required
							disabled={isPending}
							className="h-11"
						/>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label
								htmlFor="password"
								className="text-sm font-medium"
							>
								Password
							</label>
							<Link
								href="/auth/forgot-password"
								className="text-primary text-sm hover:underline"
							>
								Forgot password?
							</Link>
						</div>
						<div className="relative">
							<Input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								placeholder="Enter your password"
								required
								disabled={isPending}
								className="h-11 pr-10"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
								disabled={isPending}
							>
								{showPassword ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
							</button>
						</div>
					</div>

					{state.error && (
						<div className="rounded-md border border-red-2 bg-red-1 p-3 text-sm text-red-6">
							{state.error}
						</div>
					)}

					<Button
						type="submit"
						className="h-11 w-full text-base font-semibold"
						disabled={isPending}
					>
						{isPending ? 'Signing in...' : 'Sign In'}
					</Button>
				</form>

				{/* Sign up link */}
				<div className="text-center text-sm">
					<span className="text-muted-foreground">
						Don't have an account?{' '}
					</span>
					<Link
						href="/auth/signup"
						className="text-primary font-medium hover:underline"
					>
						Sign up
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
