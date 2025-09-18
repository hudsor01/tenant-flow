'use client'

import {
	ANIMATION_DURATIONS,
	buttonClasses,
	cardClasses,
	cn,
	inputClasses,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'
import { supabaseClient } from '@repo/shared'
import { useMutation } from '@tanstack/react-query'
import {
	AlertTriangle,
	CheckCircle2,
	Eye,
	EyeOff,
	Lock,
	Shield
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from 'src/components/ui/alert'
import { Button } from 'src/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from 'src/components/ui/card'
import { Input } from 'src/components/ui/input'
import { Label } from 'src/components/ui/label'

export function UpdatePasswordForm({
	className,
	...props
}: React.ComponentPropsWithoutRef<'div'>) {
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [passwordStrength, setPasswordStrength] = useState(0)
	const router = useRouter()

	// Password strength calculation
	const calculatePasswordStrength = (pwd: string) => {
		let strength = 0
		if (pwd.length >= 8) strength++
		if (/[A-Z]/.test(pwd)) strength++
		if (/[a-z]/.test(pwd)) strength++
		if (/\d/.test(pwd)) strength++
		if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength++
		return strength
	}

	const handlePasswordChange = (value: string) => {
		setPassword(value)
		setPasswordStrength(calculatePasswordStrength(value))
	}

	const getStrengthColor = (strength: number) => {
		switch (strength) {
			case 0:
			case 1:
				return 'bg-destructive'
			case 2:
				return 'bg-muted'
			case 3:
				return 'bg-accent'
			case 4:
				return 'bg-primary'
			case 5:
				return 'bg-primary'
			default:
				return 'bg-muted'
		}
	}

	const getStrengthText = (strength: number) => {
		switch (strength) {
			case 0:
			case 1:
				return 'Weak'
			case 2:
				return 'Fair'
			case 3:
				return 'Good'
			case 4:
				return 'Strong'
			case 5:
				return 'Very Strong'
			default:
				return 'Enter password'
		}
	}

	// TanStack Query mutation with enhanced feedback
	const updatePasswordMutation = useMutation({
		mutationFn: async (password: string) => {
			if (password !== confirmPassword) {
				throw new Error('Passwords do not match')
			}
			if (passwordStrength < 3) {
				throw new Error('Password is too weak. Please use a stronger password.')
			}
			const { error } = await supabaseClient.auth.updateUser({ password })
			if (error) throw error
			return { success: true }
		},
		onSuccess: () => {
			toast.success('Password updated successfully!')
			setTimeout(() => router.push('/dashboard'), 1500)
		},
		onError: error => {
			toast.error(
				error instanceof Error ? error.message : 'Failed to update password'
			)
		}
	})

	const handleUpdatePassword = async (e: React.FormEvent) => {
		e.preventDefault()
		updatePasswordMutation.mutate(password)
	}

	return (
		<div
			className={cn('form-container max-w-md mx-auto', className)}
			style={{
				animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`
			}}
			{...props}
		>
			<Card
				className={cn(
					cardClasses(),
					'shadow-xl border-2 hover:shadow-2xl',
					'transition-fast'
				)}
				style={{
					transition: `all ${ANIMATION_DURATIONS.default} ease-out`
				}}
			>
				<CardHeader
					className="text-center space-y-4"
					style={{
						animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`
					}}
				>
					<div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
						<Lock className="w-6 h-6 text-primary" />
					</div>
					<div className="space-y-2">
						<CardTitle
							className="font-bold tracking-tight"
							style={{
								fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize,
								lineHeight: TYPOGRAPHY_SCALE['heading-lg'].lineHeight
							}}
						>
							Reset Your Password
						</CardTitle>
						<CardDescription className="leading-relaxed">
							Please enter a strong new password to secure your account.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent
					className="space-y-6"
					style={{
						animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`
					}}
				>
					<form onSubmit={handleUpdatePassword} className="space-y-6">
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="password" className="text-sm font-semibold">
									New password
								</Label>
								<div className="relative">
									<Input
										id="password"
										type={showPassword ? 'text' : 'password'}
										placeholder="Enter your new password"
										required
										value={password}
										onChange={e => handlePasswordChange(e.target.value)}
										disabled={updatePasswordMutation.isPending}
										className={cn(
											inputClasses(),
											'pr-10 transition-colors',
											'transition-colors'
										)}
										style={{}}
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
										onClick={() => setShowPassword(!showPassword)}
										disabled={updatePasswordMutation.isPending}
									>
										{showPassword ? (
											<EyeOff className="w-4 h-4 text-muted-foreground" />
										) : (
											<Eye className="w-4 h-4 text-muted-foreground" />
										)}
									</Button>
								</div>
								{password && (
									<div className="space-y-2">
										<div className="flex items-center justify-between text-xs">
											<span className="text-muted-foreground">
												Password strength:
											</span>
											<span
												className={cn(
													'font-semibold',
													passwordStrength < 3
														? 'text-destructive'
														: passwordStrength < 4
															? 'text-muted-foreground'
															: 'text-primary',
													'transition-colors'
												)}
											>
												{getStrengthText(passwordStrength)}
											</span>
										</div>
										<div className="h-1 bg-muted rounded-full overflow-hidden">
											<div
												className={cn(
													'h-full transition-fast',
													getStrengthColor(passwordStrength),
													'transition-fast'
												)}
												style={{
													width: `${(passwordStrength / 5) * 100}%`,
													transition: `all ${ANIMATION_DURATIONS.default} ease-out`
												}}
											/>
										</div>
									</div>
								)}
							</div>

							<div className="space-y-2">
								<Label
									htmlFor="confirmPassword"
									className="text-sm font-semibold"
								>
									Confirm password
								</Label>
								<div className="relative">
									<Input
										id="confirmPassword"
										type={showConfirmPassword ? 'text' : 'password'}
										placeholder="Confirm your new password"
										required
										value={confirmPassword}
										onChange={e => setConfirmPassword(e.target.value)}
										disabled={updatePasswordMutation.isPending}
										className={cn(
											inputClasses(),
											'pr-10 transition-colors',
											confirmPassword &&
												password !== confirmPassword &&
												'border-destructive focus:border-destructive',
											'transition-colors'
										)}
										style={{}}
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
										onClick={() => setShowConfirmPassword(!showConfirmPassword)}
										disabled={updatePasswordMutation.isPending}
									>
										{showConfirmPassword ? (
											<EyeOff className="w-4 h-4 text-muted-foreground" />
										) : (
											<Eye className="w-4 h-4 text-muted-foreground" />
										)}
									</Button>
								</div>
								{confirmPassword && password !== confirmPassword && (
									<p className="text-xs text-destructive flex items-center gap-1">
										<AlertTriangle className="w-3 h-3" />
										Passwords do not match
									</p>
								)}
								{confirmPassword && password === confirmPassword && (
									<p className="text-xs text-primary flex items-center gap-1">
										<CheckCircle2 className="w-3 h-3" />
										Passwords match
									</p>
								)}
							</div>
						</div>

						{updatePasswordMutation.isError && (
							<Alert variant="destructive">
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									{updatePasswordMutation.error instanceof Error
										? updatePasswordMutation.error.message
										: 'An error occurred while updating your password'}
								</AlertDescription>
							</Alert>
						)}

						<Button
							type="submit"
							className={cn(
								buttonClasses('primary', 'lg'),
								'w-full font-semibold hover:scale-105',
								'transition-fast-transform'
							)}
							disabled={
								updatePasswordMutation.isPending ||
								!password ||
								!confirmPassword ||
								password !== confirmPassword ||
								passwordStrength < 3
							}
							style={{}}
						>
							{updatePasswordMutation.isPending ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
									Saving...
								</>
							) : (
								<>
									<Shield className="w-4 h-4 mr-2" />
									Save new password
								</>
							)}
						</Button>
					</form>

					<div className="text-center pt-4 border-t">
						<p className="text-xs text-muted-foreground">
							Your password will be encrypted and stored securely
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
