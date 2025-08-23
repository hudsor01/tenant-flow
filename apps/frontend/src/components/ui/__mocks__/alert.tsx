/**
 * Mock Alert Components for Testing
 */

import React from 'react'

export const Alert = ({ 
  children, 
  className,
  variant,
  ...props 
}: {
  children: React.ReactNode
  className?: string
  variant?: string
  [key: string]: unknown
}) => (
  <div 
    className={className}
    data-variant={variant}
    role="alert"
    data-testid="alert"
    {...props}
  >
    {children}
  </div>
)

export const AlertDescription = ({ 
  children, 
  className,
  ...props 
}: {
  children: React.ReactNode
  className?: string
  [key: string]: unknown
}) => (
  <div 
    className={className}
    data-testid="alert-description"
    {...props}
  >
    {children}
  </div>
)