/**
 * Form Container - Server Component with Client Loading Overlay
 * 
 * Architecture: 
 * - Server component for static structure and SEO
 * - Client island for loading state and animations
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { FormLoadingOverlay } from './form-loading-overlay'

interface FormContainerProps extends React.FormHTMLAttributes<HTMLFormElement> {
  title?: string
  description?: string
  sections?: boolean
  loading?: boolean
  error?: string
  success?: string
}

export function FormContainer({
  title,
  description,
  sections = true,
  loading = false,
  error,
  success,
  children,
  className,
  ...props
}: FormContainerProps) {
  return (
    <div className={cn("space-y-8", className)}>
      <form {...props}>
        {(title || description) && (
          <div className="space-y-2">
            {title && (
              <h2 className="text-2xl font-semibold">{title}</h2>
            )}
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 border border-green-200 p-4">
            <div className="text-sm text-green-800">{success}</div>
          </div>
        )}

        <div className={sections ? "space-y-12" : "space-y-6"}>
          {children}
        </div>
      </form>

      {/* Client island for loading state */}
      {loading && <FormLoadingOverlay />}
    </div>
  )
}