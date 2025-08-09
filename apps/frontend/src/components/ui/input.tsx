"use client"

import * as React from "react"
import { AnimatePresence } from "framer-motion"
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { useA11yId } from "@/hooks/use-accessibility"

interface InputProps extends React.ComponentProps<"input"> {
  label?: string
  error?: string
  success?: string
  floatingLabel?: boolean
  showValidation?: boolean
  characterCount?: boolean
  maxLength?: number
  // Accessibility props
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-required'?: boolean
  'aria-invalid'?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
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
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [showPassword, setShowPassword] = React.useState(false)
    const [internalValue, setInternalValue] = React.useState(value || "")
    const generatedId = useA11yId('input')
    const actualId = id || generatedId
    const errorId = useA11yId('error')
    const successId = useA11yId('success')
    const helpTextId = useA11yId('help')
    
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
    if (ariaDescribedBy) describedByIds.push(ariaDescribedBy)
    if (hasError) describedByIds.push(errorId)
    if (hasSuccess && !hasError) describedByIds.push(successId)
    if (characterCount && maxLength) describedByIds.push(helpTextId)
    const describedBy = describedByIds.length > 0 ? describedByIds.join(' ') : undefined

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
      "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      // Focus states with smooth transitions
      "focus:border-ring focus:ring-ring/50 focus:ring-[3px] focus:shadow-sm",
      // Validation states
      hasError && "border-destructive ring-destructive/20 dark:ring-destructive/40 animate-shake",
      hasSuccess && "border-green-500 ring-green-500/20 dark:ring-green-500/40",
      // Floating label adjustments
      floatingLabel && "pt-6 pb-1",
      // Password field padding adjustment
      isPasswordField && "pr-10",
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
            placeholder={isFocused ? placeholder : ""}
            maxLength={maxLength}
            aria-label={ariaLabel || (label && !floatingLabel ? label : undefined)}
            aria-describedby={describedBy}
            aria-required={ariaRequired}
            aria-invalid={ariaInvalid ?? hasError}
            {...props}
          />
          
          {label && (
            <label
              htmlFor={actualId}
              className={cn(
                "absolute left-3 top-2 text-muted-foreground transition-all duration-200 pointer-events-none origin-left",
                shouldFloat && "top-1 text-xs scale-85 text-foreground",
                hasError && "text-destructive",
                hasSuccess && "text-green-600"
              )}
              style={{
                transform: shouldFloat ? 'translateY(-0.5rem) scale(0.85)' : undefined
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              tabIndex={0}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              aria-controls={actualId}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}

          {/* Validation icons */}
          {showValidation && !isPasswordField && (hasError || hasSuccess) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {hasError && (
                <AlertCircle className="w-4 h-4 text-destructive animate-fade-in" />
              )}
              {hasSuccess && (
                <CheckCircle2 className="w-4 h-4 text-green-500 animate-success" />
              )}
            </div>
          )}

          {/* Character count */}
          {characterCount && maxLength && (
            <div 
              id={helpTextId}
              className={cn(
                "absolute right-2 top-full mt-1 text-xs text-muted-foreground transition-colors duration-200",
                String(internalValue).length > maxLength * 0.8 && "text-orange-500",
                String(internalValue).length >= maxLength && "text-destructive"
              )}
              aria-live="polite"
            >
              {String(internalValue).length}/{maxLength}
            </div>
          )}

          {/* Error/Success message */}
          <AnimatePresence mode="wait">
            {(error || success) && (
              <div className="mt-1 text-sm animate-fade-in">
                {error && (
                  <p 
                    id={errorId}
                    className="text-destructive flex items-center gap-1"
                    role="alert"
                    aria-live="assertive"
                  >
                    <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    {error}
                  </p>
                )}
                {success && !error && (
                  <p 
                    id={successId}
                    className="text-green-600 flex items-center gap-1"
                    role="status"
                    aria-live="polite"
                  >
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            tabIndex={0}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            aria-controls={actualId}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        )}

        {/* Validation icons */}
        {showValidation && !isPasswordField && (hasError || hasSuccess) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {hasError && (
              <AlertCircle className="w-4 h-4 text-destructive animate-fade-in" />
            )}
            {hasSuccess && (
              <CheckCircle2 className="w-4 h-4 text-green-500 animate-success" />
            )}
          </div>
        )}

        {/* Character count */}
        {characterCount && maxLength && (
          <div 
            id={helpTextId}
            className={cn(
              "absolute right-2 top-full mt-1 text-xs text-muted-foreground transition-colors duration-200",
              String(internalValue).length > maxLength * 0.8 && "text-orange-500",
              String(internalValue).length >= maxLength && "text-destructive"
            )}
            aria-live="polite"
          >
            {String(internalValue).length}/{maxLength}
          </div>
        )}

        {/* Error/Success message */}
        <AnimatePresence mode="wait">
          {(error || success) && (
            <div className="mt-1 text-sm animate-fade-in">
              {error && (
                <p 
                  id={errorId}
                  className="text-destructive flex items-center gap-1"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle className="w-3 h-3" aria-hidden="true" />
                  {error}
                </p>
              )}
              {success && !error && (
                <p 
                  id={successId}
                  className="text-green-600 flex items-center gap-1"
                  role="status"
                  aria-live="polite"
                >
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
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

Input.displayName = "Input"

export { Input }
