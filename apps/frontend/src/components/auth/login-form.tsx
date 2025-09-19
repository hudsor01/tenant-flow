'use client'

import { cn } from '@/lib/utils'
import React, { useState } from 'react'
import { Button } from 'src/components/ui/button'
import { Input } from 'src/components/ui/input'
import { Label } from 'src/components/ui/label'

interface AuthFormProps {
	className?: string
	mode?: 'login' | 'signup'
	onSubmit?: (data: {
		email: string
		password: string
		firstName?: string
		lastName?: string
		company?: string
	}) => void
	onForgotPassword?: () => void
	onSignUp?: () => void
	onGoogleLogin?: () => void
	isLoading?: boolean
	isGoogleLoading?: boolean
}

export function LoginForm({
	className,
	mode = 'login',
	onSubmit,
	onForgotPassword,
	onSignUp,
	onGoogleLogin,
	isLoading,
	isGoogleLoading
}: AuthFormProps) {
	const isLogin = mode === 'login'
	const [form, setForm] = useState({
		firstName: '',
		lastName: '',
		company: '',
		email: '',
		password: ''
	})

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
	}

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		onSubmit?.(form)
	}

	return (
		<div className={cn('w-full', className)}>
			<form className="space-y-5" onSubmit={handleSubmit}>
				{!isLogin && (
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="firstName">First name</Label>
							<Input
								id="firstName"
								name="firstName"
								required
								autoComplete="given-name"
								value={form.firstName}
								onChange={handleChange}
							/>
						</div>
						<div>
							<Label htmlFor="lastName">Last name</Label>
							<Input
								id="lastName"
								name="lastName"
								required
								autoComplete="family-name"
								value={form.lastName}
								onChange={handleChange}
							/>
						</div>
					</div>
				)}

				{!isLogin && (
					<div>
						<Label htmlFor="company">Company</Label>
						<Input
							id="company"
							name="company"
							required
							autoComplete="organization"
							value={form.company}
							onChange={handleChange}
						/>
					</div>
				)}

				<div>
					<Label htmlFor="email">Email address</Label>
					<Input
						id="email"
						name="email"
						type="email"
						required
						autoComplete="email"
						value={form.email}
						onChange={handleChange}
						placeholder="Enter your email"
						className="h-11"
						aria-describedby={isLogin ? undefined : 'email-hint'}
					/>
					{!isLogin && (
						<p id="email-hint" className="text-xs text-muted-foreground mt-1">
							We'll use this to send you important updates
						</p>
					)}
				</div>

				<div>
					<Label htmlFor="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						required
						autoComplete={isLogin ? 'current-password' : 'new-password'}
						value={form.password}
						onChange={handleChange}
						placeholder={
							isLogin ? 'Enter your password' : 'Create a secure password'
						}
						className="h-11"
						aria-describedby={isLogin ? undefined : 'password-hint'}
					/>
					{!isLogin && (
						<p
							id="password-hint"
							className="text-xs text-muted-foreground mt-1"
						>
							Must be at least 8 characters with letters and numbers
						</p>
					)}
				</div>

				{!isLogin && (
					<div>
						<Label htmlFor="confirmPassword">Confirm password</Label>
						<Input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							required
							autoComplete="new-password"
						/>
					</div>
				)}

				<div className="space-y-4 pt-3">
					<Button
						type="submit"
						className="w-full h-11 text-sm font-medium"
						disabled={isLoading}
					>
						{isLoading
							? 'Please wait…'
							: isLogin
								? 'Sign In'
								: 'Create Account'}
					</Button>

					{isLogin && (
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t border-border/60" />
							</div>
							<div className="relative flex justify-center text-xs">
								<span className="bg-background px-3 text-muted-foreground/70">
									or continue with
								</span>
							</div>
						</div>
					)}

					{isLogin && (
						<button
							type="button"
							onClick={onGoogleLogin}
							disabled={isGoogleLoading}
							className="w-full h-11 flex items-center justify-center gap-3 px-4 bg-background border border-border rounded-lg text-foreground font-medium hover:bg-muted/50 hover:border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
							aria-label="Sign in with Google"
						>
							{!isGoogleLoading && (
								<svg className="w-5 h-5" viewBox="0 0 24 24">
									<path
										fill="#4285F4"
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									/>
									<path
										fill="#34A853"
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									/>
									<path
										fill="#FBBC05"
										d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									/>
									<path
										fill="#EA4335"
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									/>
								</svg>
							)}
							{isGoogleLoading ? (
								<>
									<svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
										<circle
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
											fill="none"
											className="opacity-25"
										/>
										<path
											fill="currentColor"
											className="opacity-75"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										/>
									</svg>
									Connecting…
								</>
							) : (
								'Continue with Google'
							)}
						</button>
					)}
					<div className="flex items-center justify-between text-sm text-muted-foreground">
						<button
							type="button"
							onClick={onForgotPassword}
							className="hover:text-foreground"
						>
							Forgot password?
						</button>
						{isLogin ? (
							<button
								type="button"
								onClick={onSignUp}
								className="hover:text-foreground"
							>
								Create account
							</button>
						) : (
							<a href="/auth/login" className="hover:text-foreground">
								Have an account? Sign in
							</a>
						)}
					</div>
				</div>
			</form>
		</div>
	)
}

export default LoginForm
