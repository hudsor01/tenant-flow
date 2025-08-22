/**
 * Enhanced Auth Form - Visual Improvements Demo
 *
 * Showcases modern visual treatments for authentication forms:
 * - Enhanced color palette with better contrast
 * - Improved micro-interactions and animations
 * - Modern glassmorphism and gradient effects
 * - Better visual hierarchy and spacing
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
	Eye,
	EyeOff,
	Mail,
	Lock,
	Sparkles,
	Shield,
	CheckCircle
} from 'lucide-react'
import { motion } from '@/lib/framer-motion'
import { cn } from '@/lib/utils'

interface AuthFormData {
	email: string
	password: string
}

interface EnhancedAuthFormProps {
	type: 'login' | 'signup'
	onSubmit?: (data: AuthFormData) => void
}

export function EnhancedAuthForm({ type, onSubmit }: EnhancedAuthFormProps) {
	const [showPassword, setShowPassword] = useState(false)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [focusedField, setFocusedField] = useState<string | null>(null)

	const isLogin = type === 'login'

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 2000))
		setIsLoading(false)
		onSubmit?.({ email, password })
	}

	const passwordStrength =
		password.length > 0 ? Math.min((password.length / 8) * 100, 100) : 0

	return (
		<div className="mx-auto w-full max-w-md">
			{/* Enhanced floating badge */}
			<motion.div
				className="mb-6 flex justify-center"
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				<Badge className="from-accent via-primary to-success border-0 bg-gradient-to-r px-4 py-2 text-sm font-semibold text-white shadow-lg">
					<Sparkles className="mr-2 h-4 w-4" />
					{isLogin ? 'Welcome Back' : 'Join TenantFlow'}
				</Badge>
			</motion.div>

			{/* Enhanced card with better visual treatment */}
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.5, delay: 0.1 }}
			>
				<Card className="border-0 bg-white/95 shadow-2xl backdrop-blur-md">
					<CardHeader className="pb-6">
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.3 }}
						>
							<CardTitle className="text-display text-center text-2xl font-bold">
								{isLogin ? 'Sign In' : 'Create Account'}
							</CardTitle>
							<p className="text-body-large text-muted-foreground mt-2 text-center">
								{isLogin
									? 'Access your property dashboard'
									: 'Start managing properties like a pro'}
							</p>
						</motion.div>
					</CardHeader>

					<CardContent className="space-y-6">
						<form onSubmit={handleSubmit} className="space-y-5">
							{/* Enhanced email input */}
							<motion.div
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.4 }}
								className="space-y-2"
							>
								<Label
									htmlFor="email"
									className="text-foreground text-sm font-semibold"
								>
									Email Address
								</Label>
								<div className="group relative">
									<Mail className="text-muted-foreground group-focus-within:text-primary absolute top-3 left-3 h-5 w-5 transition-colors" />
									<Input
										id="email"
										type="email"
										placeholder="you@company.com"
										value={email}
										onChange={e => setEmail(e.target.value)}
										onFocus={() => setFocusedField('email')}
										onBlur={() => setFocusedField(null)}
										className={cn(
											'h-12 border-2 pl-11 text-base transition-all duration-200',
											focusedField === 'email'
												? 'border-primary shadow-primary/10 scale-[1.02] shadow-lg'
												: 'border-input hover:border-accent/50'
										)}
										required
									/>
								</div>
							</motion.div>

							{/* Enhanced password input */}
							<motion.div
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.5 }}
								className="space-y-2"
							>
								<Label
									htmlFor="password"
									className="text-foreground text-sm font-semibold"
								>
									Password
								</Label>
								<div className="group relative">
									<Lock className="text-muted-foreground group-focus-within:text-primary absolute top-3 left-3 h-5 w-5 transition-colors" />
									<Input
										id="password"
										type={
											showPassword ? 'text' : 'password'
										}
										placeholder={
											isLogin
												? 'Enter your password'
												: 'Create a strong password'
										}
										value={password}
										onChange={e =>
											setPassword(e.target.value)
										}
										onFocus={() =>
											setFocusedField('password')
										}
										onBlur={() => setFocusedField(null)}
										className={cn(
											'h-12 border-2 pr-11 pl-11 text-base transition-all duration-200',
											focusedField === 'password'
												? 'border-primary shadow-primary/10 scale-[1.02] shadow-lg'
												: 'border-input hover:border-accent/50'
										)}
										required
									/>
									<button
										type="button"
										onClick={() =>
											setShowPassword(!showPassword)
										}
										className="text-muted-foreground hover:text-primary absolute top-3 right-3 transition-colors"
									>
										{showPassword ? (
											<EyeOff className="h-5 w-5" />
										) : (
											<Eye className="h-5 w-5" />
										)}
									</button>
								</div>

								{/* Password strength indicator for signup */}
								{!isLogin && password.length > 0 && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: 'auto' }}
										className="space-y-2"
									>
										<div className="flex items-center justify-between text-xs">
											<span className="text-muted-foreground">
												Password strength
											</span>
											<span
												className={cn(
													'font-medium',
													passwordStrength < 50
														? 'text-warning'
														: passwordStrength < 100
															? 'text-accent'
															: 'text-success'
												)}
											>
												{passwordStrength < 50
													? 'Weak'
													: passwordStrength < 100
														? 'Good'
														: 'Strong'}
											</span>
										</div>
										<div className="bg-muted h-2 w-full overflow-hidden rounded-full">
											<motion.div
												className={cn(
													'h-full rounded-full transition-all duration-300',
													passwordStrength < 50
														? 'bg-warning'
														: passwordStrength < 100
															? 'bg-accent'
															: 'bg-success'
												)}
												initial={{ width: 0 }}
												animate={{
													width: `${passwordStrength}%`
												}}
											/>
										</div>
									</motion.div>
								)}
							</motion.div>

							{/* Enhanced submit button */}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.6 }}
								className="pt-2"
							>
								<Button
									type="submit"
									variant="premium"
									size="lg"
									className="h-12 w-full text-base font-semibold"
									disabled={isLoading}
									loading={isLoading}
									loadingText={
										isLogin
											? 'Signing in...'
											: 'Creating account...'
									}
								>
									{isLoading ? null : (
										<>
											{isLogin
												? 'Sign In'
												: 'Create Account'}
											<motion.div
												animate={{ x: [0, 5, 0] }}
												transition={{
													duration: 1.5,
													repeat: Infinity
												}}
											>
												→
											</motion.div>
										</>
									)}
								</Button>
							</motion.div>
						</form>

						{/* Enhanced trust indicators */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.8 }}
							className="border-border/50 border-t pt-4"
						>
							<div className="text-muted-foreground flex items-center justify-center space-x-6 text-xs">
								<div className="flex items-center space-x-2">
									<Shield className="text-success h-4 w-4" />
									<span>Bank-level security</span>
								</div>
								<div className="flex items-center space-x-2">
									<CheckCircle className="text-success h-4 w-4" />
									<span>GDPR compliant</span>
								</div>
							</div>
						</motion.div>
					</CardContent>
				</Card>
			</motion.div>

			{/* Enhanced footer links */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.9 }}
				className="mt-6 text-center"
			>
				<p className="text-muted-foreground text-sm">
					{isLogin
						? "Don't have an account? "
						: 'Already have an account? '}
					<button
						type="button"
						className="text-primary hover:text-primary-hover font-semibold underline-offset-4 transition-colors hover:underline"
					>
						{isLogin ? 'Sign up' : 'Sign in'}
					</button>
				</p>
			</motion.div>
		</div>
	)
}

export default EnhancedAuthForm
