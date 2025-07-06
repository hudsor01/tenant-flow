import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import {
	Building,
	CheckCircle,
	AlertCircle,
	User,
	Mail,
	Lock,
	Eye,
	EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'

const acceptInvitationSchema = z
	.object({
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string()
	})
	.refine(data => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	})

type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>

interface InvitationData {
	id?: string
	tenant: {
		id: string
		name: string
		email: string
		phone?: string
	}
	property: {
		id: string
		name: string
		address: string
		city: string
		state: string
		zipCode?: string
	}
	unit?: {
		id: string
		unitNumber: string
	}
	propertyOwner: {
		name: string
		email: string
		phone?: string
	}
	expiresAt: string
}

export default function AcceptInvitation() {
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()
	const token = searchParams.get('token')
	const { user } = useAuth()

	const [invitationData, setInvitationData] = useState<InvitationData | null>(
		null
	)
	const [isLoading, setIsLoading] = useState(true)
	const [isExpired, setIsExpired] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const {
		register,
		handleSubmit,
		formState: { errors }
	} = useForm<AcceptInvitationFormData>({
		resolver: zodResolver(acceptInvitationSchema)
	})

	// Prevent automatic auth redirect to dashboard if user is already logged in
	// but allow them to complete the invitation process
	useEffect(() => {
		if (user && !isLoading && invitationData) {
			logger.debug(
				'User already authenticated, allowing invitation completion',
				undefined,
				{
					userId: user.id,
					invitationId: invitationData?.id
				}
			)
			// Don't redirect to dashboard - let them complete the invitation process
			return
		}
	}, [user, isLoading, invitationData])

	useEffect(() => {
		if (!token) {
			toast.error('Invalid invitation link')
			navigate('/auth/login')
			return
		}

		// Proceed with verification
		verifyInvitation()
	}, [token, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

	const verifyInvitation = async () => {
		try {
			setIsLoading(true)

			logger.debug('Verifying invitation with token', undefined, {
				token
			})

			// Use backend API to verify invitation
			const invitationData = await apiClient.tenants.verifyInvitation(
				token!
			)

			// Check if invitation has expired
			if (
				invitationData.expiresAt &&
				new Date(invitationData.expiresAt) < new Date()
			) {
				setIsExpired(true)
				setIsLoading(false)
				return
			}

			setInvitationData({
				tenant: {
					id: invitationData.tenant.id,
					name: invitationData.tenant.name,
					email: invitationData.tenant.email,
					phone: invitationData.tenant.phone || undefined
				},
				property: invitationData.property
					? {
							id: invitationData.property.id,
							name: invitationData.property.name,
							address: invitationData.property.address,
							city: invitationData.property.city,
							state: invitationData.property.state,
							zipCode:
								invitationData.property.zipCode || undefined
						}
					: {
							id: '',
							name: 'Property Information Unavailable',
							address: '',
							city: '',
							state: '',
							zipCode: undefined
						},
				unit: undefined, // Unit information not available in current implementation
				propertyOwner: {
					name: invitationData.propertyOwner.name,
					email: invitationData.propertyOwner.email,
					phone: undefined
				},
				expiresAt: invitationData.expiresAt
			})
		} catch (error) {
			logger.error('Error verifying invitation', error as Error, { token })
			if (error instanceof Error && error.message.includes('Invalid')) {
				toast.error('Invitation not found or already used')
			} else {
				toast.error('Failed to verify invitation')
			}
			navigate('/auth/login')
		} finally {
			setIsLoading(false)
		}
	}

	const onSubmit = async (data: AcceptInvitationFormData) => {
		if (!invitationData || !token) return

		try {
			setIsSubmitting(true)

			// 1. First try to sign in to see if user already exists
			logger.debug(
				'Attempting sign in with existing credentials',
				undefined,
				{ email: invitationData.tenant.email }
			)

			let authUser: { id: string; email: string } | null = null
			try {
				const existingAuth = await apiClient.auth.login({
					email: invitationData.tenant.email,
					password: data.password
				})

				if (existingAuth?.user) {
					authUser = existingAuth.user
					logger.info('Using existing user account', undefined, {
						userId: authUser.id
					})
					toast.info('Welcome back! Linking your existing account...')
				}
			} catch {
				// User doesn't exist, will create new one
				logger.debug('User does not exist, will create new account')
			}

			// 2. If no existing user, create new account
			if (!authUser) {
				logger.debug('Creating new user account', undefined, {
					email: invitationData.tenant.email
				})

				const authData = await apiClient.auth.register({
					email: invitationData.tenant.email,
					password: data.password,
					name: invitationData.tenant.name,
					confirmPassword: data.password
				})

				if (!authData.user) {
					throw new Error('Failed to create user account')
				}

				authUser = authData.user
			}

			// 3. Verify we have a valid user before proceeding
			if (!authUser) {
				throw new Error('Failed to authenticate user')
			}

			// 4. Use backend API to accept invitation
			logger.debug('Accepting invitation via backend API', undefined, {
				tenantId: invitationData.tenant.id,
				userId: authUser.id
			})

			const result = await apiClient.tenants.acceptInvitation(token, {
				password: data.password,
				userInfo: {
					id: authUser.id,
					email: authUser.email!,
					name: invitationData.tenant.name
				}
			})

			if (result.success) {
				toast.success('Account setup complete!', {
					description:
						'Welcome to TenantFlow. Redirecting to your dashboard...'
				})

				// Wait a moment for auth session to establish
				setTimeout(() => {
					navigate('/tenant/dashboard')
				}, 1500)
			} else {
				throw new Error('Failed to accept invitation')
			}
		} catch (err: unknown) {
			const error = err as Error
			logger.error('Error accepting invitation', error, {
				tenantId: invitationData?.tenant.id,
				email: invitationData?.tenant.email,
				token,
				errorDetails: JSON.stringify(error, null, 2)
			})
			toast.error('Failed to complete setup', {
				description:
					error.message ||
					'Please try again or contact your property manager'
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	const requestNewInvitation = async () => {
		if (invitationData?.propertyOwner.email) {
			window.location.href = `mailto:${invitationData.propertyOwner.email}?subject=Request for New Invitation&body=Hello,%0D%0A%0D%0AMy invitation to TenantFlow has expired. Could you please send me a new invitation?%0D%0A%0D%0AThank you!`
		} else {
			toast.info(
				'Please contact your property manager for a new invitation'
			)
		}
	}

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
				<Card className="w-full max-w-md">
					<CardContent className="flex items-center justify-center py-8">
						<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600"></div>
						<span className="ml-3 text-gray-600">
							Verifying invitation...
						</span>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (isExpired) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-rose-100 p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="mb-4 flex justify-center">
							<AlertCircle className="h-12 w-12 text-red-500" />
						</div>
						<CardTitle className="text-red-700">
							Invitation Expired
						</CardTitle>
						<CardDescription>
							This invitation link has expired. Please contact
							your property manager for a new invitation.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							onClick={requestNewInvitation}
							className="w-full"
							variant="outline"
						>
							Contact Property Manager
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!invitationData) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-rose-100 p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="mb-4 flex justify-center">
							<AlertCircle className="h-12 w-12 text-red-500" />
						</div>
						<CardTitle className="text-red-700">
							Invalid Invitation
						</CardTitle>
						<CardDescription>
							This invitation link is invalid or has already been
							used.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="w-full max-w-lg"
			>
				<Card>
					<CardHeader className="text-center">
						<div className="mb-4 flex justify-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
								<Building className="h-8 w-8 text-green-600" />
							</div>
						</div>
						<CardTitle className="text-2xl font-bold text-gray-900">
							Welcome to {invitationData.property.name}!
						</CardTitle>
						<CardDescription className="text-base">
							Complete your account setup to access your tenant
							portal
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-6">
						{/* Invitation Details */}
						<div className="rounded-lg border border-green-200 bg-green-50 p-4">
							<h3 className="mb-3 font-semibold text-green-900">
								Your Invitation Details
							</h3>
							<div className="space-y-3">
								<div>
									<div className="mb-1 flex items-center space-x-2">
										<User className="h-4 w-4 text-green-600" />
										<span className="text-sm font-medium text-green-900">
											Name
										</span>
									</div>
									<span className="ml-6 text-sm text-green-700">
										{invitationData.tenant.name}
									</span>
								</div>

								<div>
									<div className="mb-1 flex items-center space-x-2">
										<Mail className="h-4 w-4 text-green-600" />
										<span className="text-sm font-medium text-green-900">
											Email
										</span>
									</div>
									<span className="ml-6 text-sm text-green-700">
										{invitationData.tenant.email}
									</span>
								</div>

								<div>
									<div className="mb-1 flex items-center space-x-2">
										<Building className="h-4 w-4 text-green-600" />
										<span className="text-sm font-medium text-green-900">
											Property
										</span>
									</div>
									<div className="ml-6 text-sm text-green-700">
										<div className="font-medium">
											{invitationData.property.name}
										</div>
										<div>
											{invitationData.property.address},{' '}
											{invitationData.property.city},{' '}
											{invitationData.property.state}
											{invitationData.property.zipCode &&
												` ${invitationData.property.zipCode}`}
										</div>
										{invitationData.unit && (
											<div className="mt-1 font-medium">
												Unit{' '}
												{invitationData.unit.unitNumber}
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Expiration Notice */}
							<div className="mt-3 border-t border-green-200 pt-3">
								<p className="text-xs text-green-700">
									This invitation expires on{' '}
									{new Date(
										invitationData.expiresAt
									).toLocaleDateString('en-US', {
										year: 'numeric',
										month: 'long',
										day: 'numeric',
										hour: 'numeric',
										minute: '2-digit'
									})}
								</p>
							</div>
						</div>

						{/* Account Creation Form */}
						<form
							onSubmit={handleSubmit(onSubmit)}
							className="space-y-4"
						>
							<div className="space-y-2">
								<Label
									htmlFor="password"
									className="text-sm font-medium"
								>
									Create Password *
								</Label>
								<div className="relative">
									<Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
									<Input
										id="password"
										type={
											showPassword ? 'text' : 'password'
										}
										placeholder="Enter a secure password"
										className="pr-10 pl-10"
										autoComplete="new-password"
										{...register('password')}
									/>
									<button
										type="button"
										onClick={() =>
											setShowPassword(!showPassword)
										}
										className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
									>
										{showPassword ? <EyeOff /> : <Eye />}
									</button>
								</div>
								{errors.password && (
									<p className="text-sm text-red-600">
										{errors.password.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label
									htmlFor="confirmPassword"
									className="text-sm font-medium"
								>
									Confirm Password *
								</Label>
								<div className="relative">
									<Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
									<Input
										id="confirmPassword"
										type="password"
										placeholder="Confirm your password"
										className="pl-10"
										autoComplete="new-password"
										{...register('confirmPassword')}
									/>
								</div>
								{errors.confirmPassword && (
									<p className="text-sm text-red-600">
										{errors.confirmPassword.message}
									</p>
								)}
							</div>

							<Button
								type="submit"
								disabled={isSubmitting}
								className="w-full bg-green-600 hover:bg-green-700"
							>
								{isSubmitting ? (
									<div className="flex items-center">
										<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
										Creating Account...
									</div>
								) : (
									<>
										<CheckCircle className="mr-2 h-4 w-4" />
										Complete Account Setup
									</>
								)}
							</Button>
						</form>

						<div className="text-center text-sm text-gray-500">
							<p>
								Invited by {invitationData.propertyOwner.name}
							</p>
							<p>
								Questions? Contact{' '}
								<a
									href={`mailto:${invitationData.propertyOwner.email}`}
									className="text-green-600 hover:underline"
								>
									{invitationData.propertyOwner.email}
								</a>
							</p>
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	)
}
