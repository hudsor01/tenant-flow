'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import { Button } from '#components/ui/button'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '#components/ui/input-group'
import { getFieldErrorMessage } from '#lib/utils/form'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import Link from 'next/link'
import type { AcceptInviteFormValues, InvitationData } from './accept-invite-form-types'
import { signupSchema } from './accept-invite-form-types'

interface InviteSignupFormProps {
	invitation: InvitationData | null
	errorMessage: string
	onSubmit: (values: AcceptInviteFormValues) => Promise<void>
}

export function InviteSignupForm({
	invitation,
	errorMessage,
	onSubmit
}: InviteSignupFormProps) {
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)

	const form = useForm({
		defaultValues: {
			email: invitation?.email ?? '',
			password: '',
			confirmPassword: ''
		},
		validators: {
			onSubmit: ({ value }) => {
				const result = signupSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value)
		}
	})

	// Pre-fill email when invitation loads asynchronously
	useEffect(() => {
		if (invitation?.email) {
			form.setFieldValue('email', invitation.email)
		}
	}, [invitation?.email, form])

	return (
		<div className="w-full max-w-sm space-y-8">
			{/* Invitation Details */}
			{invitation && (
				<div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm border border-border/50">
					{invitation.property_owner_name && (
						<p className="text-muted-foreground">
							<strong className="text-foreground">Invited by:</strong>{' '}
							{invitation.property_owner_name}
						</p>
					)}
					{invitation.property_name && (
						<p className="text-muted-foreground">
							<strong className="text-foreground">Property:</strong>{' '}
							{invitation.property_name}
							{invitation.unit_number && ` - Unit ${invitation.unit_number}`}
						</p>
					)}
					<p className="text-muted-foreground">
						<strong className="text-foreground">Email:</strong>{' '}
						{invitation.email}
					</p>
				</div>
			)}

			{/* Signup Form */}
			<form
				onSubmit={e => {
					e.preventDefault()
					form.handleSubmit()
				}}
				className="space-y-5"
			>
				{errorMessage && (
					<div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm text-destructive">
						<span className="font-medium">Error:</span> {errorMessage}
					</div>
				)}

				{/* Email Field */}
				<form.Field name="email">
					{field => (
						<Field>
							<FieldLabel htmlFor="email">Email address</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<Mail />
								</InputGroupAddon>
								<InputGroupInput
									id="email"
									type="email"
									placeholder="Enter your email"
									autoComplete="email"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									disabled={form.state.isSubmitting || !!invitation?.email}
									aria-invalid={field.state.meta.errors.length > 0}
								/>
							</InputGroup>
							<FieldError>
								{field.state.meta.errors.length
									? getFieldErrorMessage(field.state.meta.errors)
									: null}
							</FieldError>
						</Field>
					)}
				</form.Field>

				{/* Password Field */}
				<form.Field name="password">
					{field => (
						<Field>
							<FieldLabel htmlFor="password">Create password</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<Lock />
								</InputGroupAddon>
								<InputGroupInput
									id="password"
									type={showPassword ? 'text' : 'password'}
									placeholder="Create a secure password"
									autoComplete="new-password"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									disabled={form.state.isSubmitting}
									aria-invalid={field.state.meta.errors.length > 0}
								/>
								<InputGroupAddon align="inline-end">
									<button
										type="button"
										onClick={() => setShowPassword(prev => !prev)}
										className="text-muted-foreground hover:text-foreground transition-colors"
										tabIndex={-1}
										aria-label={showPassword ? 'Hide password' : 'Show password'}
									>
										{showPassword ? <EyeOff /> : <Eye />}
									</button>
								</InputGroupAddon>
							</InputGroup>
							<FieldError>
								{field.state.meta.errors.length
									? getFieldErrorMessage(field.state.meta.errors)
									: null}
							</FieldError>
						</Field>
					)}
				</form.Field>

				{/* Confirm Password Field */}
				<form.Field name="confirmPassword">
					{field => (
						<Field>
							<FieldLabel htmlFor="confirmPassword">
								Confirm password
							</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<Lock />
								</InputGroupAddon>
								<InputGroupInput
									id="confirmPassword"
									type={showConfirmPassword ? 'text' : 'password'}
									placeholder="Confirm your password"
									autoComplete="new-password"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									disabled={form.state.isSubmitting}
									aria-invalid={field.state.meta.errors.length > 0}
								/>
								<InputGroupAddon align="inline-end">
									<button
										type="button"
										onClick={() => setShowConfirmPassword(prev => !prev)}
										className="text-muted-foreground hover:text-foreground transition-colors"
										tabIndex={-1}
										aria-label={
											showConfirmPassword
												? 'Hide password confirmation'
												: 'Show password confirmation'
										}
									>
										{showConfirmPassword ? <EyeOff /> : <Eye />}
									</button>
								</InputGroupAddon>
							</InputGroup>
							<FieldError>
								{field.state.meta.errors.length
									? getFieldErrorMessage(field.state.meta.errors)
									: null}
							</FieldError>
						</Field>
					)}
				</form.Field>

				{/* Submit Button */}
				<Button
					type="submit"
					className="w-full h-11 typography-small"
					disabled={form.state.isSubmitting}
				>
					{form.state.isSubmitting
						? 'Creating Account...'
						: 'Accept Invitation & Create Account'}
				</Button>

				{/* Already have account */}
				<p className="text-center text-muted">
					Already have an account?{' '}
					<Link
						href="/login"
						className="text-primary hover:underline font-medium"
					>
						Sign in
					</Link>
				</p>
			</form>

			{/* Footer */}
			<div className="text-center text-caption/70">
				By creating an account, you agree to our{' '}
				<Link href="/terms" className="hover:underline">
					Terms of Service
				</Link>{' '}
				and{' '}
				<Link href="/privacy" className="hover:underline">
					Privacy Policy
				</Link>
			</div>
		</div>
	)
}
