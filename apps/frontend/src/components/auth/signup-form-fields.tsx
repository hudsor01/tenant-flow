'use client'

/**
 * Signup form fields component
 * Reusable form fields for user registration
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'

import type { FormState } from '@/hooks/use-form-state'

export interface SignupFormFieldsProps {
	formState: FormState
	onFieldUpdate: <K extends keyof FormState>(
		field: K,
		value: FormState[K]
	) => void
	onTogglePasswordVisibility: () => void
	onToggleConfirmPasswordVisibility: () => void
	onEmailSubmit: (e: React.FormEvent) => void
	onGoogleSignup: () => void
	isLoading: boolean
	error: string | null
	// Legacy props for backwards compatibility
	errors?: {
		email?: string[]
		password?: string[]
		confirmPassword?: string[]
		fullName?: string[]
		companyName?: string[]
		companyType?: string[]
		companySize?: string[]
		phone?: string[]
	}
	defaultValues?: {
		email?: string
		fullName?: string
		companyName?: string
		companyType?: string
		companySize?: string
		phone?: string
	}
}

export function SignupFormFields({
	formState,
	onFieldUpdate,
	onTogglePasswordVisibility,
	onToggleConfirmPasswordVisibility,
	onEmailSubmit,
	onGoogleSignup,
	isLoading,
	error,
	errors = {},
	defaultValues = {}
}: SignupFormFieldsProps) {
	// Use formState if available, otherwise fallback to defaultValues
	const name = formState?.name ?? defaultValues.fullName ?? ''
	const email = formState?.email ?? defaultValues.email ?? ''
	const password = formState?.password ?? ''
	const confirmPassword = formState?.confirmPassword ?? ''

	return (
		<form onSubmit={onEmailSubmit} className="space-y-4">
			{/* Error Display */}
			{error && (
				<div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
					{error}
				</div>
			)}

			{/* Full Name */}
			<div className="space-y-2">
				<Label htmlFor="name">Full Name</Label>
				<Input
					id="name"
					name="name"
					type="text"
					required
					value={name}
					onChange={e => onFieldUpdate?.('name', e.target.value)}
					className={errors.fullName ? 'border-red-500' : ''}
					disabled={isLoading}
				/>
				{errors.fullName && (
					<p className="text-sm text-red-600">{errors.fullName[0]}</p>
				)}
			</div>

			{/* Email */}
			<div className="space-y-2">
				<Label htmlFor="email">Email</Label>
				<Input
					id="email"
					name="email"
					type="email"
					required
					value={email}
					onChange={e => onFieldUpdate?.('email', e.target.value)}
					className={errors.email ? 'border-red-500' : ''}
					disabled={isLoading}
				/>
				{errors.email && (
					<p className="text-sm text-red-600">{errors.email[0]}</p>
				)}
			</div>

			{/* Password */}
			<div className="space-y-2">
				<Label htmlFor="password">Password</Label>
				<Input
					id="password"
					name="password"
					type={formState?.showPassword ? 'text' : 'password'}
					required
					value={password}
					onChange={e => onFieldUpdate?.('password', e.target.value)}
					className={errors.password ? 'border-red-500' : ''}
					disabled={isLoading}
					minLength={8}
				/>
				{errors.password && (
					<p className="text-sm text-red-600">{errors.password[0]}</p>
				)}
			</div>

			{/* Confirm Password */}
			<div className="space-y-2">
				<Label htmlFor="confirmPassword">Confirm Password</Label>
				<Input
					id="confirmPassword"
					name="confirmPassword"
					type={formState?.showConfirmPassword ? 'text' : 'password'}
					required
					value={confirmPassword}
					onChange={e =>
						onFieldUpdate?.('confirmPassword', e.target.value)
					}
					className={errors.confirmPassword ? 'border-red-500' : ''}
					disabled={isLoading}
				/>
				{errors.confirmPassword && (
					<p className="text-sm text-red-600">
						{errors.confirmPassword[0]}
					</p>
				)}
			</div>

			{/* Submit Button */}
			<div className="space-y-4">
				<Button type="submit" className="w-full" disabled={isLoading}>
					{isLoading ? 'Creating account...' : 'Create Account'}
				</Button>

				{/* Google Signup */}
				<Button
					type="button"
					variant="outline"
					className="w-full"
					onClick={onGoogleSignup}
					disabled={isLoading}
				>
					Sign up with Google
				</Button>
			</div>
		</form>
	)
}
