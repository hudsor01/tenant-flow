"use client"

import { forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface GoogleButtonProps extends React.ComponentProps<typeof Button> {
  isLoading?: boolean
  loadingText?: string
  children?: React.ReactNode
}

export const GoogleButton = forwardRef<HTMLButtonElement, GoogleButtonProps>(
  ({ className, isLoading = false, loadingText = "Connecting...", children = "Continue with Google", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        type="button"
        variant="outline"
        className={cn(
          "w-full relative overflow-hidden",
          "transition-all duration-200 ease-out",
          "hover:bg-gray-50 hover:shadow-md hover:scale-[1.01]",
          "active:scale-[0.99] active:shadow-sm",
          "border-gray-200 dark:border-gray-700",
          "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none",
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        <span className="flex items-center justify-center gap-3 relative z-10">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <HighResGoogleIcon />
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {isLoading ? loadingText : children}
          </span>
        </span>
        
        {/* Subtle hover effect background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      </Button>
    )
  }
)

GoogleButton.displayName = "GoogleButton"

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
