'use client'

import { Button } from '@/components/ui/button'
import {
	ANIMATION_DURATIONS,
	buttonClasses,
	cn,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'


interface GoogleButtonProps extends React.ComponentProps<typeof Button> {
	isLoading?: boolean
	loadingText?: string
	children?: React.ReactNode
	showTrustIndicators?: boolean
	mode?: 'login' | 'signup'
}

export const GoogleButton = forwardRef<HTMLButtonElement, GoogleButtonProps>(
	(
		{
			className,
			isLoading = false,
			loadingText = 'Connecting...',
			children = 'Continue with Google',
			showTrustIndicators = false,
			mode = 'login',
			...props
		},
		ref
	) => {
		const defaultText =
			mode === 'signup' ? 'Continue with Google' : 'Sign in with Google'
		const defaultLoadingText =
			mode === 'signup' ? 'Creating your account...' : 'Signing you in...'

		return (
			<div className="w-full">
				<Button
					ref={ref}
					type="button"
					variant="outline"
					size="lg"
					className={cn(
						buttonClasses('outline', 'lg'),
						'w-full relative overflow-hidden group',
						`transition-all duration-[${ANIMATION_DURATIONS.default}] ease-out`,
						'hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 dark:hover:from-primary/10 dark:hover:to-accent/10',
						'hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02]',
						'active:scale-[0.98] active:shadow-md',
						'border-2 border-border hover:border-primary dark:hover:border-primary',
						'focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 dark:focus:ring-offset-background',
						'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none',
						isLoading && 'animate-pulse',
						className
					)}
					disabled={isLoading || props.disabled}
					{...props}
				>
					<div className="flex items-center justify-center gap-3 relative z-10">
						{isLoading ? (
							<div className="relative">
								<Loader2 className="h-5 w-5 animate-spin text-primary" />
								<div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin opacity-30" />
							</div>
						) : (
							<div className="transform group-hover:scale-110 transition-transform duration-200">
								<HighResGoogleIcon />
							</div>
						)}
						<div className="flex flex-col items-start">
							<span
								className={cn(
									'font-semibold text-foreground group-hover:text-foreground',
									`transition-colors duration-[${ANIMATION_DURATIONS.fast}]`
								)}
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-md'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-md'].lineHeight,
									fontWeight: TYPOGRAPHY_SCALE['body-md'].fontWeight
								}}
							>
								{isLoading
									? loadingText || defaultLoadingText
									: children || defaultText}
							</span>
							{showTrustIndicators && !isLoading && (
								<span
									className="text-xs text-muted-foreground/75 leading-none mt-0.5"
									style={{
										fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize
									}}
								>
									Secure OAuth 2.0 authentication
								</span>
							)}
						</div>
					</div>

					{/* Enhanced gradient hover effect */}
					<div
						className={cn(
							'absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5',
							'opacity-0 group-hover:opacity-100',
							`transition-opacity duration-[${ANIMATION_DURATIONS.default}]`
						)}
					/>
				</Button>

				{showTrustIndicators && (
					<div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground/60">
						<div className="flex items-center gap-1">
							<div className="w-2 h-2 rounded-full bg-primary" />
							<span>Encrypted</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2 h-2 rounded-full bg-primary" />
							<span>No password needed</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2 h-2 rounded-full bg-primary" />
							<span>One-click access</span>
						</div>
					</div>
				)}
			</div>
		)
	}
)

GoogleButton.displayName = 'GoogleButton'

/**
 * High-resolution Google logo icon that matches Google's brand guidelines
 * Uses proper Google brand colors and proportions
 */
function HighResGoogleIcon() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 48 48"
			aria-hidden="true"
			className="flex-shrink-0"
		>
			<path
				fill="#FFC107"
				d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
			/>
			<path
				fill="#FF3D00"
				d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
			/>
			<path
				fill="#4CAF50"
				d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
			/>
			<path
				fill="#1976D2"
				d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
			/>
		</svg>
	)
}
