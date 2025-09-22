'use client'

import { Button } from '@/components/ui/button'
import {
	ANIMATION_DURATIONS,
	buttonClasses,
	cn,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'
import { supabaseClient } from '@repo/shared'
import { Loader2, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'


interface LogoutButtonProps extends React.ComponentProps<typeof Button> {
	redirectPath?: string
	showIcon?: boolean
	loadingText?: string
	successMessage?: string
	errorMessage?: string
	requireConfirmation?: boolean
	confirmationMessage?: string
	showSecurityInfo?: boolean
}

export const LogoutButton = React.forwardRef<
	React.ComponentRef<typeof Button>,
	LogoutButtonProps
>(
	(
		{
			className,
			redirectPath = '/auth/login',
			showIcon = true,
			loadingText = 'Signing out...',
			successMessage = 'Successfully signed out',
			errorMessage = 'Failed to sign out. Please try again.',
			requireConfirmation = false,
			confirmationMessage = 'Are you sure you want to sign out?',
			showSecurityInfo = false,
			children,
			onClick,
			disabled,
			variant = 'outline',
			...props
		},
		ref
	) => {
		const router = useRouter()
		const [isLoading, setIsLoading] = React.useState(false)
		const [showConfirmation, setShowConfirmation] = React.useState(false)

		const performLogout = async (
			event: React.MouseEvent<HTMLButtonElement>
		) => {
			setIsLoading(true)

			try {
				// Call custom onClick handler first if provided
				await onClick?.(event)

				// Sign out from Supabase
				const { error } = await supabaseClient.auth.signOut()

				if (error) {
					throw new Error(error.message)
				}

				toast.success(successMessage, {
					description: showSecurityInfo
						? 'Your session has been securely terminated'
						: undefined
				})

				// Small delay to show success message
				setTimeout(() => {
					router.push(redirectPath)
				}, 500)
			} catch (error) {
				console.error('Logout error:', error)
				toast.error(errorMessage, {
					description:
						'Please try again or contact support if the issue persists'
				})
				setIsLoading(false)
			}
		}

		const handleLogout = async (event: React.MouseEvent<HTMLButtonElement>) => {
			if (isLoading) return

			if (requireConfirmation && !showConfirmation) {
				setShowConfirmation(true)
				return
			}

			await performLogout(event)
		}

		const handleCancel = () => {
			setShowConfirmation(false)
		}

		// If confirmation is required and showing
		if (showConfirmation) {
			return (
				<div className="flex flex-col gap-3 p-4 bg-card border border-border rounded-lg shadow-lg">
					<div className="text-center space-y-2">
						<h4
							className="font-semibold text-foreground"
							style={{
								fontSize: TYPOGRAPHY_SCALE['body-md'].fontSize,
								fontWeight: TYPOGRAPHY_SCALE['body-md'].fontWeight
							}}
						>
							Confirm Sign Out
						</h4>
						<p
							className="text-muted-foreground text-sm"
							style={{
								fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
								lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight
							}}
						>
							{confirmationMessage}
						</p>
						{showSecurityInfo && (
							<p className="text-xs text-muted-foreground/75">
								This will end your secure session and require re-authentication
							</p>
						)}
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleCancel}
							className="flex-1"
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							size="sm"
							onClick={performLogout}
							className="flex-1"
						>
							Sign Out
						</Button>
					</div>
				</div>
			)
		}

		return (
			<div className="relative">
				<Button
					ref={ref}
					variant={variant}
					disabled={disabled || isLoading}
					className={cn(
						'relative group overflow-hidden',
						`transition-all duration-[${ANIMATION_DURATIONS.default}]`,
						variant === 'outline' &&
							cn(
								buttonClasses('outline', 'default'),
								'hover:bg-destructive/5 dark:hover:bg-destructive/10',
								'hover:border-destructive/30 dark:hover:border-destructive/60',
								'hover:text-destructive dark:hover:text-destructive',
								'hover:shadow-md hover:shadow-destructive/10'
							),
						variant === 'destructive' &&
							cn(
								buttonClasses('destructive', 'default'),
								'bg-gradient-to-r from-destructive to-destructive/90 hover:from-destructive/90 hover:to-destructive/80',
								'text-white hover:shadow-lg hover:shadow-destructive/25',
								'transform hover:scale-[1.02] active:scale-[0.98]'
							),
						variant === 'ghost' &&
							cn(
								buttonClasses('ghost', 'default'),
								'hover:bg-destructive/5 dark:hover:bg-destructive/10',
								'hover:text-destructive dark:hover:text-destructive'
							),
						'focus:ring-2 focus:ring-destructive/20 focus:ring-offset-2',
						'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100',
						isLoading && 'animate-pulse',
						className
					)}
					onClick={handleLogout}
					{...props}
				>
					<div className="flex items-center gap-2 relative z-10">
						{isLoading ? (
							<div className="relative">
								<Loader2 className="h-4 w-4 animate-spin" />
								<div
									className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
									style={{
										borderTopColor: 'var(--color-label-primary)',
										borderColor: 'color-mix(in oklab, var(--color-fill-secondary) 50%, transparent)'
									}}
								/>
							</div>
						) : (
							showIcon && (
								<LogOut className="h-4 w-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200" />
							)
						)}
						<div className="flex flex-col items-start">
							<span
								className="font-medium"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight,
									fontWeight: TYPOGRAPHY_SCALE['body-sm'].fontWeight
								}}
							>
								{isLoading ? loadingText : children || 'Sign Out'}
							</span>
							{showSecurityInfo && !isLoading && (
								<span className="text-xs opacity-75 leading-none">
									End secure session
								</span>
							)}
						</div>
					</div>

					{/* Hover effect overlay */}
					<div
						className={cn(
							'absolute inset-0 bg-gradient-to-r from-destructive/5 to-destructive/5',
							'opacity-0 group-hover:opacity-100',
							`transition-opacity duration-[${ANIMATION_DURATIONS.fast}]`
						)}
					/>
				</Button>
			</div>
		)
	}
)
LogoutButton.displayName = 'LogoutButton'
