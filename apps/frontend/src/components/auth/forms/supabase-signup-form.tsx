"use client"

import { cn } from '@/lib/utils/css.utils'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { SignupFormFields } from '../signup-form-fields'
import { SignupSuccess } from '../signup-success'
import { useFormState } from '@/hooks/use-form-state'
import { useSignup } from '@/hooks/use-signup'
import { usePasswordValidation } from '@/hooks/use-password-validation'

interface SupabaseSignupFormProps {
	redirectTo?: string
	className?: string
}

export function SupabaseSignupForm({
	redirectTo = '/dashboard',
	className
}: SupabaseSignupFormProps) {
	const {
		formState,
		updateField,
		togglePasswordVisibility,
		toggleConfirmPasswordVisibility,
		getFormData
	} = useFormState()
	
	const {
		isLoading,
		error,
		success,
		signupWithEmail,
		signupWithGoogle,
		resetToSignIn
	} = useSignup({ redirectTo })
	
	const { validatePassword } = usePasswordValidation(formState.password)

	const handleEmailSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		
		const passwordError = validatePassword(formState.confirmPassword)
		if (passwordError) {
			return // Error will be displayed by validation hook
		}
		
		const formData = getFormData()
		void signupWithEmail(formData)
	}

	if (success) {
		return (
			<SignupSuccess 
				email={formState.email}
				onBackToSignIn={resetToSignIn}
			/>
		)
	}

	return (
		<Card className={cn("border-0 shadow-xl w-full max-w-md", className)}>
			<CardHeader className="space-y-1 pb-6">
				<CardTitle className="text-2xl font-bold">Create an account</CardTitle>
				<CardDescription className="text-muted-foreground">
					Enter your details to get started with TenantFlow
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<SignupFormFields
					formState={formState}
					onFieldUpdate={updateField}
					onTogglePasswordVisibility={togglePasswordVisibility}
					onToggleConfirmPasswordVisibility={toggleConfirmPasswordVisibility}
					onEmailSubmit={handleEmailSubmit}
					onGoogleSignup={() => void signupWithGoogle()}
					isLoading={isLoading}
					error={error}
				/>
			</CardContent>
		</Card>
	)
}

// Export alias for compatibility
export { SupabaseSignupForm as SignUpForm }