'use client'

import { cn } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'
import * as React from 'react'

export interface PasswordInputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
	({ className, label, id, ...props }, ref) => {
		const [showPassword, setShowPassword] = React.useState(false)
		const inputId = id || 'password-input'

		return (
			<div className="w-full">
				{label && (
					<label
						htmlFor={inputId}
						className="block text-sm font-medium mb-2 text-foreground"
					>
						{label}
					</label>
				)}
				<div className="relative">
					<input
						id={inputId}
						type={showPassword ? 'text' : 'password'}
						className={cn(
							'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
							className
						)}
						ref={ref}
						{...props}
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none focus:text-primary transition-colors"
						tabIndex={-1}
					>
						{showPassword ? (
							<EyeOff className="h-4 w-4" aria-hidden="true" />
						) : (
							<Eye className="h-4 w-4" aria-hidden="true" />
						)}
						<span className="sr-only">
							{showPassword ? 'Hide password' : 'Show password'}
						</span>
					</button>
				</div>
			</div>
		)
	}
)

PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
