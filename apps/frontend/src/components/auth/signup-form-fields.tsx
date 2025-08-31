'use client'

/**
 * Signup form fields component
 * Reusable form fields for user registration
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// import {
// 	Select,
// 	SelectContent,
// 	SelectItem,
// 	SelectTrigger,
// 	SelectValue
// } from '@/components/ui/select'

import type { SignupFormState, SignupData } from '@repo/shared/types/frontend' // Added SignupData
// Removed unused SignupFormData import

export interface SignupFormFieldsProps {
	formState: SignupFormState
	onFieldUpdate: <K extends keyof SignupData>( // Changed to keyof SignupData
		field: K,
		value: SignupData[K]
	) => void
    onConfirmPasswordUpdate: (value: string) => void; // Added for confirmPassword
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
    showPassword?: boolean;
    showConfirmPassword?: boolean;
    confirmPasswordValue: string; // Added to pass confirmPassword value
}

export function SignupFormFields({
	formState,
	onFieldUpdate,
    onConfirmPasswordUpdate, // Added
	// onTogglePasswordVisibility,
	// onToggleConfirmPasswordVisibility,
	onEmailSubmit,
	onGoogleSignup,
	isLoading,
	error,
	errors = {},
	defaultValues = {},
    showPassword,
    showConfirmPassword,
    confirmPasswordValue // Added
}: SignupFormFieldsProps) {
	// Use formState if available, otherwise fallback to defaultValues
	const name = formState.data.fullName ?? defaultValues.fullName ?? ''
	const email = formState.data.email ?? defaultValues.email ?? ''
	const password = formState.data.password ?? ''
	const confirmPassword = confirmPasswordValue ?? '' // Use confirmPasswordValue prop

	return (
		<form onSubmit={onEmailSubmit} className="space-y-4">
			{/* Error Display */}
			{error && (
				<div className="rounded-md bg-red-1 p-3 text-sm text-red-600">
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
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						onFieldUpdate?.('fullName', e.target.value)
					}
					className={errors.fullName ? 'input-error-red' : ''}
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
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						onFieldUpdate?.('email', e.target.value)
					}
					className={errors.email ? 'input-error-red' : ''}
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
					type={showPassword ? 'text' : 'password'}
					required
					value={password}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						onFieldUpdate?.('password', e.target.value)
					}
					className={errors.password ? 'input-error-red' : ''}
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
					type={showConfirmPassword ? 'text' : 'password'}
					required
					value={confirmPassword}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						onConfirmPasswordUpdate?.(e.target.value)
					}
					className={errors.confirmPassword ? 'input-error-red' : ''}
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
				<Button 
					type="submit" 
					className="loading-button w-full" 
					disabled={isLoading}
					data-loading={isLoading}
				>
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