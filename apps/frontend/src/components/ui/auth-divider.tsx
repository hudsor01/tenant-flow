'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'


interface AuthDividerProps {
	className?: string
	text?: string
	onGoogleSignIn?: () => void
	onAppleSignIn?: () => void
	isGoogleLoading?: boolean
	isAppleLoading?: boolean
}

export function AuthDivider({
	className,
	text = 'Or',
	onGoogleSignIn,
	onAppleSignIn,
	isGoogleLoading,
	isAppleLoading
}: AuthDividerProps) {
	return (
		<div className={cn('w-full space-y-3', className)}>
			{/* Google Sign In */}
			{onGoogleSignIn && (
				<Button
					type="button"
					variant="outline"
					className="w-full h-11"
					onClick={onGoogleSignIn}
					disabled={isGoogleLoading}
				>
					{!isGoogleLoading ? (
						<>
							<svg className="shrink-0 h-5 w-5 mr-2" viewBox="0 0 24 24">
								<path
									fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="#FBBC05"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
							Sign in with Google
						</>
					) : (
						<>
							<svg className="h-5 w-5 mr-2 animate-spin" viewBox="0 0 24 24">
								<circle
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
									fill="none"
									className="opacity-25"
								/>
								<path
									fill="currentColor"
									className="opacity-75"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
							Connecting...
						</>
					)}
				</Button>
			)}

			{/* Divider */}
			{onGoogleSignIn && onAppleSignIn && (
				<div className="relative flex items-center">
					<div className="flex-1 border-t border-border" />
					<span className="px-3 text-xs text-muted-foreground uppercase bg-background">
						{text}
					</span>
					<div className="flex-1 border-t border-border" />
				</div>
			)}

			{/* Apple Sign In */}
			{onAppleSignIn && (
				<Button
					type="button"
					variant="outline"
					className="w-full h-11"
					onClick={onAppleSignIn}
					disabled={isAppleLoading}
				>
					{!isAppleLoading ? (
						<>
							<svg
								className="shrink-0 h-5 w-5 mr-2"
								viewBox="0 0 32 32"
								fill="currentColor"
							>
								<path d="M27.2192 10.9088C27.0336 11.0528 23.7568 12.8992 23.7568 17.0048C23.7568 21.7536 27.9264 23.4336 28.0512 23.4752C28.032 23.5776 27.3888 25.776 25.8528 28.016C24.4832 29.9872 23.0528 31.9552 20.8768 31.9552C18.7008 31.9552 18.1408 30.6912 15.6288 30.6912C13.1808 30.6912 12.3104 31.9968 10.32 31.9968C8.3296 31.9968 6.9408 30.1728 5.344 27.9328C3.4944 25.3024 2 21.216 2 17.3376C2 11.1168 6.0448 7.8176 10.0256 7.8176C12.1408 7.8176 13.904 9.2064 15.232 9.2064C16.496 9.2064 18.4672 7.7344 20.8736 7.7344C21.7856 7.7344 25.0624 7.8176 27.2192 10.9088ZM19.7312 5.1008C20.7264 3.92 21.4304 2.2816 21.4304 0.6432C21.4304 0.416 21.4112 0.1856 21.3696 0C19.7504 0.0608 17.824 1.0784 16.6624 2.4256C15.7504 3.4624 14.8992 5.1008 14.8992 6.7616C14.8992 7.0112 14.9408 7.2608 14.96 7.3408C15.0624 7.36 15.2288 7.3824 15.3952 7.3824C16.848 7.3824 18.6752 6.4096 19.7312 5.1008Z" />
							</svg>
							Sign in with Apple
						</>
					) : (
						<>
							<svg className="h-5 w-5 mr-2 animate-spin" viewBox="0 0 24 24">
								<circle
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
									fill="none"
									className="opacity-25"
								/>
								<path
									fill="currentColor"
									className="opacity-75"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
							Connecting...
						</>
					)}
				</Button>
			)}
		</div>
	)
}

export default AuthDivider
