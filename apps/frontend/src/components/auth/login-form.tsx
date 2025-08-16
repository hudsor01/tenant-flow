/**
 * Login Form - Configurable Layout
 *
 * Unified login form with multiple layout options.
 * Consolidates enhanced-login-form.tsx and login-form.tsx
 */

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from '@/lib/framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
	Building2,
	Sparkles,
	Mail,
	Lock,
	ArrowRight,
	Eye,
	EyeOff,
	AlertCircle,
	Shield,
	Check
} from 'lucide-react'
import { AuthFormFactory } from './auth-form-factory'
import { supabase } from '@/lib/clients'
import type { AuthFormState } from '@/lib/actions/auth-actions'
import type { LoginFormProps } from '@/types'

type LoginLayout = 'clean' | 'marketing'

type LoginFormRefactoredProps = LoginFormProps & {
	onSuccess?: (result: AuthFormState) => void
	layout?: LoginLayout
}

export function LoginForm({
	redirectTo = '/dashboard',
	error,
	onSuccess,
	layout = 'clean'
}: LoginFormRefactoredProps) {
	// Enhanced form state for marketing layout
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [rememberMe, setRememberMe] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [enhancedError, setEnhancedError] = useState<string | null>(null)
	const router = useRouter()

	const handleEnhancedSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setEnhancedError(null)

		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password
			})

			if (error) throw error
			if (data.user) {
				router.push(redirectTo)
			}
		} catch (error: unknown) {
			setEnhancedError(
				(error as Error).message || 'An error occurred during login'
			)
		} finally {
			setIsLoading(false)
		}
	}

	const handleGoogleLogin = async () => {
		setIsLoading(true)
		setEnhancedError(null)

		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`
				}
			})
			if (error) throw error
		} catch (error: unknown) {
			setEnhancedError(
				(error as Error).message || 'Failed to sign in with Google'
			)
			setIsLoading(false)
		}
	}

	// Marketing layout
	if (layout === 'marketing') {
		return (
			<div className="flex min-h-screen">
				{/* Left Panel - Marketing Content */}
				<div
					className="relative hidden flex-1 items-center justify-center overflow-hidden p-8 lg:flex"
					style={{
						background: 'var(--gradient-brand)',
						backgroundSize: '200% 200%',
						animation: 'gradient-shift 4s ease infinite',
						color: 'var(--foreground-inverse)'
					}}
				>
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="relative z-10 max-w-md"
					>
						<div className="relative mb-6">
							<Sparkles className="h-12 w-12" />
						</div>
						<h2 className="mb-4 text-3xl font-bold">
							Welcome back to TenantFlow
						</h2>
						<p className="mb-8 text-lg opacity-90">
							Continue managing your properties with ease.
						</p>
						<div className="space-y-4">
							<div className="flex items-center">
								<Check className="mr-3 h-5 w-5 flex-shrink-0" />
								<span>Access your dashboard</span>
							</div>
							<div className="flex items-center">
								<Check className="mr-3 h-5 w-5 flex-shrink-0" />
								<span>Monitor rent collections</span>
							</div>
							<div className="flex items-center">
								<Check className="mr-3 h-5 w-5 flex-shrink-0" />
								<span>Track maintenance requests</span>
							</div>
						</div>
					</motion.div>
				</div>

				{/* Right Panel - Form */}
				<div
					className="flex flex-1 items-center justify-center p-8"
					style={{ backgroundColor: 'var(--background)' }}
				>
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="w-full max-w-md"
					>
						<Link
							href="/"
							className="mb-8 flex items-center space-x-2"
						>
							<Building2
								className="h-8 w-8"
								style={{ color: 'var(--steel-600)' }}
							/>
							<span className="text-gradient-brand text-2xl font-bold">
								TenantFlow
							</span>
						</Link>

						<div className="mb-8">
							<h1
								className="mb-2 text-3xl font-bold"
								style={{ color: 'var(--foreground)' }}
							>
								Welcome back
							</h1>
							<p style={{ color: 'var(--foreground-muted)' }}>
								Sign in to your account to continue
							</p>
						</div>

						<Card className="card-elevated p-6">
							<form
								onSubmit={handleEnhancedSubmit}
								className="space-y-6"
							>
								{enhancedError && (
									<Alert variant="destructive">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											{enhancedError}
										</AlertDescription>
									</Alert>
								)}

								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<div className="relative">
										<Mail
											className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform"
											style={{
												color: 'var(--foreground-muted)'
											}}
										/>
										<Input
											id="email"
											type="email"
											placeholder="name@company.com"
											value={email}
											onChange={e =>
												setEmail(e.target.value)
											}
											className="input-field pl-10"
											required
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="password">Password</Label>
									<div className="relative">
										<Lock
											className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform"
											style={{
												color: 'var(--foreground-muted)'
											}}
										/>
										<Input
											id="password"
											type={
												showPassword
													? 'text'
													: 'password'
											}
											placeholder="••••••••"
											value={password}
											onChange={e =>
												setPassword(e.target.value)
											}
											className="input-field pr-10 pl-10"
											required
										/>
										<button
											type="button"
											onClick={() =>
												setShowPassword(!showPassword)
											}
											className="absolute top-1/2 right-3 -translate-y-1/2 transform"
											style={{
												color: 'var(--foreground-muted)'
											}}
										>
											{showPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
									</div>
								</div>

								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-2">
										<Checkbox
											id="remember"
											checked={rememberMe}
											onCheckedChange={checked =>
												setRememberMe(
													checked as boolean
												)
											}
										/>
										<Label
											htmlFor="remember"
											className="cursor-pointer text-sm"
										>
											Remember me
										</Label>
									</div>
									<Link
										href="/auth/forgot-password"
										className="text-sm"
										style={{ color: 'var(--primary)' }}
									>
										Forgot password?
									</Link>
								</div>

								<Button
									type="submit"
									className="btn-brand w-full shadow-xl"
									disabled={isLoading}
								>
									{isLoading ? 'Signing in...' : 'Sign in'}
									{!isLoading && (
										<ArrowRight className="ml-2 h-4 w-4" />
									)}
								</Button>

								<div className="relative">
									<div className="absolute inset-0 flex items-center">
										<span
											className="w-full border-t"
											style={{
												borderColor: 'var(--border)'
											}}
										/>
									</div>
									<div className="relative flex justify-center text-xs uppercase">
										<span
											className="px-2"
											style={{
												backgroundColor:
													'var(--background)',
												color: 'var(--foreground-muted)'
											}}
										>
											Or continue with
										</span>
									</div>
								</div>

								<Button
									type="button"
									variant="outline"
									className="w-full"
									onClick={handleGoogleLogin}
									disabled={isLoading}
								>
									<svg
										className="mr-2 h-4 w-4"
										viewBox="0 0 24 24"
									>
										<path
											fill="currentColor"
											d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
										/>
										<path
											fill="currentColor"
											d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
										/>
										<path
											fill="currentColor"
											d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
										/>
										<path
											fill="currentColor"
											d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
										/>
									</svg>
									Continue with Google
								</Button>
							</form>

							<div className="mt-6 text-center">
								<p
									className="text-sm"
									style={{ color: 'var(--foreground-muted)' }}
								>
									Don't have an account?{' '}
									<Link
										href="/auth/signup"
										className="font-semibold hover:underline"
										style={{ color: 'var(--primary)' }}
									>
										Sign up
									</Link>
								</p>
							</div>
						</Card>

						<div className="mt-6 flex items-center justify-center">
							<Badge variant="outline" className="badge-primary">
								<Shield className="mr-1 h-3 w-3" />
								Secured with bank-level encryption
							</Badge>
						</div>
					</motion.div>
				</div>
			</div>
		)
	}

	// Clean layout (default) - uses AuthFormFactory
	const config = {
		type: 'login' as const,
		title: 'Welcome back',
		description: 'Sign in to access your property dashboard',
		submitLabel: 'Sign in',
		loadingLabel: 'Signing in...',
		redirectTo,
		error
	}

	return <AuthFormFactory config={config} onSuccess={onSuccess} />
}

export default LoginForm
