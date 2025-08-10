/**
 * Consolidated Spinner Component
 * 
 * Replaces scattered custom spinner implementations throughout the codebase
 * with a unified, configurable component.
 */

import { cn } from "@/lib/utils"

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  color?: "primary" | "secondary" | "white" | "current" | "red" | "blue"
  className?: string
}

const sizeClasses = {
  xs: "h-3 w-3",
  sm: "h-4 w-4", 
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-16 w-16"
}

const colorClasses = {
  primary: "border-primary border-t-transparent",
  secondary: "border-muted-foreground border-t-transparent", 
  white: "border-white border-t-transparent",
  current: "border-current border-t-transparent",
  red: "border-red-400 border-t-transparent",
  blue: "border-[#60a5fa] border-t-transparent"
}

const borderWidthClasses = {
  xs: "border-2",
  sm: "border-2",
  md: "border-2", 
  lg: "border-2",
  xl: "border-4"
}

export function Spinner({ 
  size = "md", 
  color = "primary", 
  className 
}: SpinnerProps) {
  return (
    <div
      className={cn(
        "rounded-full animate-spin",
        sizeClasses[size],
        colorClasses[color],
        borderWidthClasses[size],
        className
      )}
    />
  )
}

// Helper components for common spinner use cases
export function LoadingSpinner({ 
  text = "Loading...", 
  size = "md" 
}: { 
  text?: string
  size?: SpinnerProps["size"]
}) {
  return (
    <div className="flex items-center gap-2">
      <Spinner size={size} />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  )
}

export function CenteredSpinner({
  size = "lg",
  text,
  className
}: {
  size?: SpinnerProps["size"]
  text?: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="text-center">
        <Spinner size={size} className="mx-auto" />
        {text && (
          <p className="mt-2 text-sm text-muted-foreground">{text}</p>
        )}
      </div>
    </div>
  )
}

// Button loading state helper
export function ButtonSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center">
      <Spinner size="sm" color="current" className="mr-2" />
      {text}
    </div>
  )
}