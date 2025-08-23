/**
 * Mock Badge Component for Testing
 */

import React from 'react'

export const Badge = ({ 
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
  <span 
    className={className}
    data-variant={variant}
    data-testid="badge"
    {...props}
  >
    {children}
  </span>
)