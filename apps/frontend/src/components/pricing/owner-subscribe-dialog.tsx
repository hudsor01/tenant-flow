'use client'

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '#components/ui/input-group'
import { Button } from '#components/ui/button'
import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
import { useForm } from '@tanstack/react-form'
import { signupFormSchema } from '@repo/shared/validation/auth'
import { Mail, Building2, User, Lock } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useModalStore } from '#stores/modal-store'

interface OwnerSubscribeDialogProps {
	onComplete: (payload: {
		email: string
		tenantId?: string
		requiresEmailConfirmation?: boolean
	}) => Promise<void> | void
	planName?: string
	planCta?: string
}

export function OwnerSubscribeDialog({
	onComplete,
	planName,
	planCta
}: OwnerSubscribeDialogProps) {
	const { openModal, closeModal, isModalOpen } = useModalStore()
	const [isSubmitting, setIsSubmitting] = useState(false)

	const modalId = 'owner-subscribe'

	const supabase = useMemo(() => getSupabaseClientInstance(), [])

	const form = useForm({
		defaultValues: {
			firstName: '',
			lastName: '',
			company: '',
			email: '',
			password: '',
			confirmPassword: ''
		},
		onSubmit: async ({ value }) => {
			setIsSubmitting(true)
			try {
				const { firstName, lastName, company, email, password } = value

				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							firstName,
							lastName,
							company,
							planIntent: planName
						},
						emailRedirectTo: `${window.location.origin}/auth/confirm`
					}
				})

				if (error) {
					throw error
				}

				let requiresEmailConfirmation = !data.session
				let supabaseUserId = data.user?.id

				// Attempt sign-in immediately if session not returned (some Supabase configs)
				if (!data.session) {
					const { data: signInData, error: signInError } =
						await supabase.auth.signInWithPassword({
							email,
							password
						})

					if (!signInError) {
						requiresEmailConfirmation = false
						supabaseUserId = signInData.user?.id ?? supabaseUserId
					} else {
						// Detect if this is an email confirmation error using multiple indicators
						const isConfirmationError =
							signInError?.code === 'email_not_confirmed' ||
							(signInError?.status &&
								(signInError.status === 400 || signInError.status === 401)) ||
							(signInError?.message &&
								/confirm|email not confirmed/i.test(signInError.message))

						if (!isConfirmationError) {
							// If it's not a confirmation-related error, surface it
							throw signInError
						}
						// Otherwise, treat as expected confirmation requirement
					}
				}

				await onComplete({
					email,
					...(supabaseUserId && { tenantId: supabaseUserId }),
					requiresEmailConfirmation
				})

				toast.success('Account created', {
					description: requiresEmailConfirmation
						? 'Check your email to confirm your account before first sign in.'
						: 'You are signed in and ready to continue.'
				})

				form.reset()
				closeModal(modalId)
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Unable to complete sign up'
				toast.error('Sign up failed', {
					description: message
				})
			} finally {
				setIsSubmitting(false)
			}
		},
		validators: {
			onSubmit: signupFormSchema
		}
	})

	const isOpen = isModalOpen(modalId)

	useEffect(() => {
		if (!isOpen) {
			form.reset()
		}
	}, [isOpen, form])

	const handleClose = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen && !isSubmitting) {
				closeModal(modalId)
			} else if (nextOpen) {
				openModal(
					modalId,
					{},
					{
						type: 'dialog',
						size: 'lg',
						animationVariant: 'fade',
						closeOnOutsideClick: true,
						closeOnEscape: true
					}
				)
			}
		},
		[isSubmitting, openModal, closeModal]
	)

	return (
		<>
			{isModalOpen(modalId) && (
				<Dialog open={true} onOpenChange={handleClose}>
					<DialogContent className="max-w-lg">
						<DialogHeader>
							<DialogTitle>
								Join TenantFlow {planName ? `· ${planName}` : ''}
							</DialogTitle>
							<DialogDescription>
								Create your account to kick off checkout. You&apos;ll be
								redirected to Stripe to securely complete your subscription.
							</DialogDescription>
						</DialogHeader>
						<form
							onSubmit={event => {
								event.preventDefault()
								form.handleSubmit()
							}}
							className="space-y-4"
						>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<form.Field name="firstName">
									{field => (
										<Field>
											<FieldLabel htmlFor="firstName">First name</FieldLabel>
											<InputGroup>
												<InputGroupAddon align="inline-start">
													<User />
												</InputGroupAddon>
												<InputGroupInput
													id="firstName"
													placeholder="Jamie"
													value={field.state.value}
													onChange={event =>
														field.handleChange(event.target.value)
													}
													onBlur={field.handleBlur}
													disabled={isSubmitting}
												/>
											</InputGroup>
											<FieldError>
												{String(field.state.meta.errors?.[0] ?? '')}
											</FieldError>
										</Field>
									)}
								</form.Field>
								<form.Field name="lastName">
									{field => (
										<Field>
											<FieldLabel htmlFor="lastName">Last name</FieldLabel>
											<InputGroup>
												<InputGroupAddon align="inline-start">
													<User />
												</InputGroupAddon>
												<InputGroupInput
													id="lastName"
													placeholder="Rivera"
													value={field.state.value}
													onChange={event =>
														field.handleChange(event.target.value)
													}
													onBlur={field.handleBlur}
													disabled={isSubmitting}
												/>
											</InputGroup>
											<FieldError>
												{String(field.state.meta.errors?.[0] ?? '')}
											</FieldError>
										</Field>
									)}
								</form.Field>
							</div>

							<form.Field name="company">
								{field => (
									<Field>
										<FieldLabel htmlFor="company">Company</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<Building2 />
											</InputGroupAddon>
											<InputGroupInput
												id="company"
												placeholder="Rivera Property Group"
												value={field.state.value}
												onChange={event =>
													field.handleChange(event.target.value)
												}
												onBlur={field.handleBlur}
												disabled={isSubmitting}
											/>
										</InputGroup>
										<FieldError>
											{String(field.state.meta.errors?.[0] ?? '')}
										</FieldError>
									</Field>
								)}
							</form.Field>

							<form.Field name="email">
								{field => (
									<Field>
										<FieldLabel htmlFor="email">Work email</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<Mail />
											</InputGroupAddon>
											<InputGroupInput
												id="email"
												type="email"
												placeholder="jamie@riverapm.com"
												value={field.state.value}
												onChange={event =>
													field.handleChange(event.target.value)
												}
												onBlur={field.handleBlur}
												disabled={isSubmitting}
											/>
										</InputGroup>
										<FieldError>
											{String(field.state.meta.errors?.[0] ?? '')}
										</FieldError>
									</Field>
								)}
							</form.Field>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<form.Field name="password">
									{field => (
										<Field>
											<FieldLabel htmlFor="password">Password</FieldLabel>
											<InputGroup>
												<InputGroupAddon align="inline-start">
													<Lock />
												</InputGroupAddon>
												<InputGroupInput
													id="password"
													type="password"
													placeholder="Create a password"
													autoComplete="new-password"
													value={field.state.value}
													onChange={event =>
														field.handleChange(event.target.value)
													}
													onBlur={field.handleBlur}
													disabled={isSubmitting}
												/>
											</InputGroup>
											<FieldError>
												{String(field.state.meta.errors?.[0] ?? '')}
											</FieldError>
										</Field>
									)}
								</form.Field>
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
													type="password"
													placeholder="Repeat password"
													autoComplete="new-password"
													value={field.state.value}
													onChange={event =>
														field.handleChange(event.target.value)
													}
													onBlur={field.handleBlur}
													disabled={isSubmitting}
												/>
											</InputGroup>
											<FieldError>
												{String(field.state.meta.errors?.[0] ?? '')}
											</FieldError>
										</Field>
									)}
								</form.Field>
							</div>

							<DialogFooter>
								<Button
									type="button"
									variant="ghost"
									onClick={() => handleClose(false)}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={isSubmitting || form.state.isSubmitting}
								>
									{isSubmitting ? 'Creating account…' : planCta || 'Continue'}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			)}
		</>
	)
}

export default OwnerSubscribeDialog
