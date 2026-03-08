/**
 * Role Selection Page
 *
 * Shown to first-time Google OAuth users who don't have a user_type set.
 * Users choose between "Property Owner" and "Tenant" roles.
 * After selection, updates public.users.user_type and redirects to the
 * appropriate dashboard.
 */

'use client'

import { GridPattern } from '#components/ui/grid-pattern'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { useAuth } from '#providers/auth-provider'
import { createLogger } from '#lib/frontend-logger.js'
import { Building2, Home, Key, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const logger = createLogger({ component: 'SelectRolePage' })

type RoleOption = 'OWNER' | 'TENANT'

function RoleCard({
	role,
	title,
	description,
	icon: Icon,
	features,
	isSelected,
	isLoading,
	onSelect
}: {
	role: RoleOption
	title: string
	description: string
	icon: typeof Building2
	features: string[]
	isSelected: boolean
	isLoading: boolean
	onSelect: (role: RoleOption) => void
}) {
	return (
		<button
			type="button"
			onClick={() => onSelect(role)}
			disabled={isLoading}
			className={[
				'w-full text-left rounded-2xl border-2 p-6 transition-all duration-200',
				'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
				'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100',
				isSelected
					? 'border-primary bg-primary/5 shadow-md'
					: 'border-border bg-card hover:border-primary/50'
			].join(' ')}
		>
			<div className="flex items-start gap-4">
				<div
					className={[
						'shrink-0 size-12 rounded-xl flex-center transition-colors',
						isSelected
							? 'bg-primary text-primary-foreground'
							: 'bg-muted text-muted-foreground'
					].join(' ')}
				>
					<Icon className="size-6" />
				</div>
				<div className="flex-1 min-w-0">
					<h3 className="font-semibold text-lg text-foreground">{title}</h3>
					<p className="text-sm text-muted-foreground mt-1">{description}</p>
					<ul className="mt-3 space-y-1.5">
						{features.map(feature => (
							<li
								key={feature}
								className="text-sm text-muted-foreground flex items-center gap-2"
							>
								<div className="size-1.5 rounded-full bg-primary/60 shrink-0" />
								{feature}
							</li>
						))}
					</ul>
				</div>
			</div>
			{isSelected && isLoading && (
				<div className="flex-center mt-4 pt-4 border-t border-primary/20">
					<Loader2 className="size-5 animate-spin text-primary mr-2" />
					<span className="text-sm text-primary font-medium">
						Setting up your account...
					</span>
				</div>
			)}
		</button>
	)
}

export default function SelectRolePage() {
	const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const router = useRouter()
	const { user, isLoading: isAuthLoading } = useAuth()

	// Redirect if user already has a valid role
	useEffect(() => {
		if (isAuthLoading) return
		if (!user) {
			router.push('/login')
			return
		}

		const userType = user.app_metadata?.user_type as string | undefined
		if (userType && userType !== 'PENDING') {
			const destination = userType === 'TENANT' ? '/tenant' : '/dashboard'
			router.push(destination)
		}
	}, [user, isAuthLoading, router])

	const handleSelectRole = async (role: RoleOption) => {
		if (isLoading) return
		setSelectedRole(role)
		setIsLoading(true)
		setError(null)

		try {
			const supabase = createClient()

			// Get the current user
			const currentUser = await getCachedUser()

			if (!currentUser) {
				throw new Error('Not authenticated. Please sign in again.')
			}

			// Update user_type in public.users (trigger syncs to auth.users.raw_app_meta_data)
			const { error: updateError } = await supabase
				.from('users')
				.update({ user_type: role })
				.eq('id', currentUser.id)

			if (updateError) {
				throw new Error(
					`Failed to update role: ${updateError.message}`
				)
			}

			// Refresh session to pick up the updated user_type in JWT claims
			const { error: refreshError } = await supabase.auth.refreshSession()
			if (refreshError) {
				logger.warn('Session refresh failed after role update', {
					error: refreshError.message
				})
			}

			logger.info('[ROLE_SELECTED]', { role, userId: currentUser.id })

			// Route to the correct dashboard
			const destination = role === 'TENANT' ? '/tenant' : '/dashboard'
			router.push(destination)
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Something went wrong'
			setError(message)
			setIsLoading(false)
			setSelectedRole(null)
			logger.error('[ROLE_SELECT_FAILED]', { error: message })
		}
	}

	if (isAuthLoading) {
		return (
			<div className="min-h-screen flex-center bg-background">
				<div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
			</div>
		)
	}

	return (
		<div className="relative min-h-screen flex flex-col lg:flex-row">
			<GridPattern
				patternId="select-role-grid"
				className="fixed inset-0 -z-10"
			/>

			{/* Left Side - Image Section (Hidden on mobile) */}
			<div className="relative hidden lg:flex lg:w-1/2 min-h-screen bg-background overflow-hidden">
				<div className="absolute inset-0 transform scale-105 transition-transform duration-700">
					<Image
						src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=2340&q=80"
						alt="Modern apartment building"
						fill
						sizes="50vw"
						className="object-cover transition-all duration-500"
						priority
					/>
				</div>
				<div className="absolute inset-0 bg-black/25" />

				<div className="absolute inset-0 flex-center">
					<div className="relative max-w-lg mx-auto px-8">
						<div className="absolute inset-0 rounded-3xl bg-card/85 backdrop-blur-sm border border-border/20 shadow-2xl" />

						<div className="relative text-center space-y-6 py-12 px-8 z-20">
							<div className="size-16 mx-auto mb-8">
								<div className="relative w-full h-full bg-primary rounded-2xl flex-center border border-white/20 shadow-lg">
									<Home className="size-8 text-primary-foreground" />
								</div>
							</div>

							<h2 className="text-foreground font-bold text-3xl">
								Welcome to TenantFlow
							</h2>

							<p className="text-muted-foreground text-lg leading-relaxed">
								Tell us how you will use TenantFlow so we can personalize your
								experience.
							</p>

							<div className="grid grid-cols-2 gap-6 pt-6">
								<div className="text-center">
									<div className="text-foreground font-bold text-2xl mb-1">
										10K+
									</div>
									<div className="text-muted-foreground text-sm font-medium">
										Property
										<br />
										Managers
									</div>
								</div>
								<div className="text-center">
									<div className="text-foreground font-bold text-2xl mb-1">
										98.7%
									</div>
									<div className="text-muted-foreground text-sm font-medium">
										Customer
										<br />
										Success
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Right Side - Role Selection */}
			<div className="flex-1 lg:w-1/2 flex-center p-6 sm:p-8 lg:p-12 bg-background min-h-screen">
				<div className="w-full max-w-md space-y-8">
					{/* Logo (Mobile only) */}
					<div className="lg:hidden flex justify-center mb-8">
						<Link href="/" className="flex items-center space-x-3">
							<div className="size-10 rounded-xl overflow-hidden bg-primary border border-border flex-center shadow-lg">
								<Home className="size-6 text-primary-foreground" />
							</div>
							<span className="typography-h3 text-foreground tracking-tight">
								TenantFlow
							</span>
						</Link>
					</div>

					{/* Header */}
					<div className="text-center space-y-2">
						<h1 className="typography-h2 text-foreground">
							How will you use TenantFlow?
						</h1>
						<p className="text-muted-foreground">
							Select your role to get started with the right dashboard
						</p>
					</div>

					{/* Error */}
					{error && (
						<div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm text-destructive">
							{error}
						</div>
					)}

					{/* Role Cards */}
					<div className="space-y-4">
						<RoleCard
							role="OWNER"
							title="Property Owner / Manager"
							description="I own or manage rental properties"
							icon={Building2}
							features={[
								'Manage properties and units',
								'Track rent payments and finances',
								'Handle maintenance requests',
								'Invite and manage tenants'
							]}
							isSelected={selectedRole === 'OWNER'}
							isLoading={isLoading && selectedRole === 'OWNER'}
							onSelect={handleSelectRole}
						/>

						<RoleCard
							role="TENANT"
							title="Tenant / Renter"
							description="I rent a property"
							icon={Key}
							features={[
								'View lease details',
								'Pay rent online',
								'Submit maintenance requests',
								'Access documents'
							]}
							isSelected={selectedRole === 'TENANT'}
							isLoading={isLoading && selectedRole === 'TENANT'}
							onSelect={handleSelectRole}
						/>
					</div>

					{/* Footer */}
					<div className="text-center pt-4">
						<p className="text-muted-foreground text-sm">
							You can change your role later in your profile settings.
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
