'use client'

import * as React from 'react'
import { AnimatePresence } from '@/lib/lazy-motion'
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

<<<<<<< HEAD
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
=======
interface InputProps extends React.ComponentProps<'input'> {
>>>>>>> origin/main
	label?: string
	error?: string
	success?: string
	floatingLabel?: boolean
	showValidation?: boolean
	characterCount?: boolean
<<<<<<< HEAD
=======
	maxLength?: number
>>>>>>> origin/main
	// Accessibility props
	'aria-label'?: string
	'aria-describedby'?: string
	'aria-required'?: boolean
	'aria-invalid'?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	(
		{
			className,
			type,
			label,
			error,
			success,
			floatingLabel = false,
			showValidation = true,
			characterCount = false,
			maxLength,
			id,
			placeholder,
			value,
			onChange,
			onFocus,
			onBlur,
			'aria-label': ariaLabel,
			'aria-describedby': ariaDescribedBy,
			'aria-required': ariaRequired,
			'aria-invalid': ariaInvalid,
			...props
		},
		ref
	) => {
		const [isFocused, setIsFocused] = React.useState(false)
		const [showPassword, setShowPassword] = React.useState(false)
		const [internalValue, setInternalValue] = React.useState(value ?? '')
		const generatedId = React.useId()
		const actualId = id ?? generatedId
		const errorId = `${actualId}-error`
		const successId = `${actualId}-success`
		const helpTextId = `${actualId}-help`

		// Track internal value for character count and floating label
		React.useEffect(() => {
			if (value !== undefined) {
				setInternalValue(value)
			}
		}, [value])

		const hasValue = String(internalValue).length > 0
		const shouldFloat = floatingLabel && (isFocused || hasValue)
		const actualType = type === 'password' && showPassword ? 'text' : type
		const isPasswordField = type === 'password'
		const hasError = !!error
		const hasSuccess = !!success && !hasError

		// Build aria-describedby attribute
		const describedByIds: string[] = []
<<<<<<< HEAD
		if (ariaDescribedBy) {
			describedByIds.push(ariaDescribedBy)
		}
		if (hasError) {
			describedByIds.push(errorId)
		}
		if (hasSuccess && !hasError) {
			describedByIds.push(successId)
		}
		if (characterCount && maxLength) {
			describedByIds.push(helpTextId)
		}
=======
		if (ariaDescribedBy) describedByIds.push(ariaDescribedBy)
		if (hasError) describedByIds.push(errorId)
		if (hasSuccess && !hasError) describedByIds.push(successId)
		if (characterCount && maxLength) describedByIds.push(helpTextId)
>>>>>>> origin/main
		const describedBy =
			describedByIds.length > 0 ? describedByIds.join(' ') : undefined

		const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
			setIsFocused(true)
			onFocus?.(e)
		}

		const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
			setIsFocused(false)
			onBlur?.(e)
		}

		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = e.target.value
			setInternalValue(newValue)
			onChange?.(e)
		}

		const baseInputClasses = cn(
			'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
			// Focus states with smooth transitions
			'focus:border-ring focus:ring-ring/50 focus:ring-[3px] focus:shadow-sm',
			// Validation states
			hasError &&
				'border-destructive ring-destructive/20 dark:ring-destructive/40 animate-shake',
			hasSuccess &&
				'border-green-500 ring-green-500/20 dark:ring-green-500/40',
			// Floating label adjustments
			floatingLabel && 'pt-6 pb-1',
			// Password field padding adjustment
			isPasswordField && 'pr-10',
			className
		)

		if (floatingLabel) {
			return (
				<div className="relative">
					<input
						ref={ref}
						id={actualId}
						type={actualType}
						value={internalValue}
						onChange={handleChange}
						onFocus={handleFocus}
						onBlur={handleBlur}
						className={baseInputClasses}
						placeholder={isFocused ? placeholder : ''}
						maxLength={maxLength}
						aria-label={
							ariaLabel ||
							(label && !floatingLabel ? label : undefined)
						}
						aria-describedby={describedBy}
						aria-required={ariaRequired}
						aria-invalid={ariaInvalid ?? hasError}
						{...props}
					/>

					{label && (
						<label
							htmlFor={actualId}
							className={cn(
<<<<<<< HEAD
								'text-muted-foreground pointer-events-none absolute left-3 top-2 origin-left transition-all duration-200',
								shouldFloat &&
									'text-foreground scale-85 top-1 text-xs',
=======
								'text-muted-foreground pointer-events-none absolute top-2 left-3 origin-left transition-all duration-200',
								shouldFloat &&
									'text-foreground top-1 scale-85 text-xs',
>>>>>>> origin/main
								hasError && 'text-destructive',
								hasSuccess && 'text-green-600'
							)}
							style={{
								transform: shouldFloat
									? 'translateY(-0.5rem) scale(0.85)'
									: undefined
							}}
						>
							{label}
						</label>
					)}

					{/* Password visibility toggle */}
					{isPasswordField && (
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
<<<<<<< HEAD
							className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2"
=======
							className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-3 -translate-y-1/2 rounded-sm transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
>>>>>>> origin/main
							tabIndex={0}
							aria-label={
								showPassword ? 'Hide password' : 'Show password'
							}
							aria-pressed={showPassword}
							aria-controls={actualId}
						>
							{showPassword ? (
								<EyeOff
									className="h-4 w-4"
									aria-hidden="true"
								/>
							) : (
								<Eye className="h-4 w-4" aria-hidden="true" />
							)}
						</button>
					)}

					{/* Validation icons */}
					{showValidation &&
						!isPasswordField &&
						(hasError || hasSuccess) && (
<<<<<<< HEAD
							<div className="absolute right-3 top-1/2 -translate-y-1/2">
=======
							<div className="absolute top-1/2 right-3 -translate-y-1/2">
>>>>>>> origin/main
								{hasError && (
									<AlertCircle className="text-destructive animate-fade-in h-4 w-4" />
								)}
								{hasSuccess && (
									<CheckCircle2 className="animate-success h-4 w-4 text-green-500" />
								)}
							</div>
						)}

					{/* Character count */}
					{characterCount && maxLength && (
						<div
							id={helpTextId}
							className={cn(
<<<<<<< HEAD
								'text-muted-foreground absolute right-2 top-full mt-1 text-xs transition-colors duration-200',
=======
								'text-muted-foreground absolute top-full right-2 mt-1 text-xs transition-colors duration-200',
>>>>>>> origin/main
								String(internalValue).length >
									maxLength * 0.8 && 'text-orange-500',
								String(internalValue).length >= maxLength &&
									'text-destructive'
							)}
							aria-live="polite"
						>
							{String(internalValue).length}/{maxLength}
						</div>
					)}

					{/* Error/Success message */}
					<AnimatePresence mode="wait">
						{(error || success) && (
							<div className="animate-fade-in mt-1 text-sm">
								{error && (
									<p
										id={errorId}
										className="text-destructive flex items-center gap-1"
										role="alert"
										aria-live="assertive"
									>
										<AlertCircle
											className="h-3 w-3"
											aria-hidden="true"
										/>
										{error}
									</p>
								)}
								{success && !error && (
									<p
										id={successId}
										className="flex items-center gap-1 text-green-600"
										role="status"
										aria-live="polite"
									>
										<CheckCircle2
											className="h-3 w-3"
											aria-hidden="true"
										/>
										{success}
									</p>
								)}
							</div>
						)}
					</AnimatePresence>
				</div>
			)
		}

		// Standard input without floating label
		return (
			<div className="relative">
				<input
					ref={ref}
					id={actualId}
					type={actualType}
					value={internalValue}
					onChange={handleChange}
					onFocus={handleFocus}
					onBlur={handleBlur}
					className={baseInputClasses}
					placeholder={placeholder}
					maxLength={maxLength}
					aria-label={ariaLabel || label}
					aria-describedby={describedBy}
					aria-required={ariaRequired}
					aria-invalid={ariaInvalid ?? hasError}
					{...props}
				/>

				{/* Password visibility toggle */}
				{isPasswordField && (
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
<<<<<<< HEAD
						className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2"
=======
						className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-3 -translate-y-1/2 rounded-sm transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
>>>>>>> origin/main
						tabIndex={0}
						aria-label={
							showPassword ? 'Hide password' : 'Show password'
						}
						aria-pressed={showPassword}
						aria-controls={actualId}
					>
						{showPassword ? (
							<EyeOff className="h-4 w-4" aria-hidden="true" />
						) : (
							<Eye className="h-4 w-4" aria-hidden="true" />
						)}
					</button>
				)}

				{/* Validation icons */}
				{showValidation &&
					!isPasswordField &&
					(hasError || hasSuccess) && (
<<<<<<< HEAD
						<div className="absolute right-3 top-1/2 -translate-y-1/2">
=======
						<div className="absolute top-1/2 right-3 -translate-y-1/2">
>>>>>>> origin/main
							{hasError && (
								<AlertCircle className="text-destructive animate-fade-in h-4 w-4" />
							)}
							{hasSuccess && (
								<CheckCircle2 className="animate-success h-4 w-4 text-green-500" />
							)}
						</div>
					)}

				{/* Character count */}
				{characterCount && maxLength && (
					<div
						id={helpTextId}
						className={cn(
<<<<<<< HEAD
							'text-muted-foreground absolute right-2 top-full mt-1 text-xs transition-colors duration-200',
=======
							'text-muted-foreground absolute top-full right-2 mt-1 text-xs transition-colors duration-200',
>>>>>>> origin/main
							String(internalValue).length > maxLength * 0.8 &&
								'text-orange-500',
							String(internalValue).length >= maxLength &&
								'text-destructive'
						)}
						aria-live="polite"
					>
						{String(internalValue).length}/{maxLength}
					</div>
				)}

				{/* Error/Success message */}
				<AnimatePresence mode="wait">
					{(error || success) && (
						<div className="animate-fade-in mt-1 text-sm">
							{error && (
								<p
									id={errorId}
									className="text-destructive flex items-center gap-1"
									role="alert"
									aria-live="assertive"
								>
									<AlertCircle
										className="h-3 w-3"
										aria-hidden="true"
									/>
									{error}
								</p>
							)}
							{success && !error && (
								<p
									id={successId}
									className="flex items-center gap-1 text-green-600"
									role="status"
									aria-live="polite"
								>
									<CheckCircle2
										className="h-3 w-3"
										aria-hidden="true"
									/>
									{success}
								</p>
							)}
						</div>
					)}
				</AnimatePresence>
			</div>
		)
	}
)

Input.displayName = 'Input'

export { Input }
export type { InputProps }
