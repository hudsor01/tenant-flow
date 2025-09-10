'use client'

import { Button } from '@/components/ui/button'
import { 
	cn, 
	buttonClasses,
	ANIMATION_DURATIONS,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'
import { supabaseClient } from '@repo/shared'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import * as React from 'react'

interface LogoutButtonProps extends React.ComponentProps<typeof Button> {
	redirectPath?: string
	showIcon?: boolean
	loadingText?: string
	successMessage?: string
	errorMessage?: string
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

		const handleLogout = async (event: React.MouseEvent<HTMLButtonElement>) => {
			if (isLoading) return
			
			setIsLoading(true)
			
			try {
				// Call custom onClick handler first if provided
				await onClick?.(event)
				
				// Sign out from Supabase
				const { error } = await supabaseClient.auth.signOut()
				
				if (error) {
					throw new Error(error.message)
				}
				
				toast.success(successMessage)
				
				// Small delay to show success message
				setTimeout(() => {
					router.push(redirectPath)
				}, 500)
				
			} catch (error) {
				console.error('Logout error:', error)
				toast.error(errorMessage)
				setIsLoading(false)
			}
		}

		return (
			<Button
				ref={ref}
				variant={variant}
				disabled={disabled || isLoading}
				className={cn(
					"relative group overflow-hidden rounded-8px",
					`transition-all duration-[${ANIMATION_DURATIONS.default}]`,
					variant === 'outline' && cn(
						buttonClasses('outline', 'default'),
						"hover:bg-red-50 dark:hover:bg-red-900/20",
						"hover:border-red-300 dark:hover:border-red-600",
						"hover:text-red-600 dark:hover:text-red-400"
					),
					variant === 'destructive' && cn(
						"bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700",
						"text-white hover:shadow-lg hover:shadow-red-500/25"
					),
					variant === 'ghost' && cn(
						"hover:bg-red-50 dark:hover:bg-red-900/20",
						"hover:text-red-600 dark:hover:text-red-400"
					),
					"disabled:opacity-50 disabled:cursor-not-allowed",
					isLoading && "animate-pulse",
					className
				)}
				onClick={handleLogout}
				{...props}
			>
				<span className="flex items-center gap-2 relative z-10">
					{isLoading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						showIcon && <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
					)}
					<span 
						className="font-medium"
						style={{
							fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
							lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight,
							fontWeight: TYPOGRAPHY_SCALE['body-sm'].fontWeight
						}}
					>
						{isLoading ? loadingText : (children || 'Sign Out')}
					</span>
				</span>
				
				{/* Hover effect overlay */}
				<div className={cn(
					"absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5",
					"opacity-0 group-hover:opacity-100",
					`transition-opacity duration-[${ANIMATION_DURATIONS.fast}]`
				)} />
			</Button>
		)
	}
)
LogoutButton.displayName = 'LogoutButton'
